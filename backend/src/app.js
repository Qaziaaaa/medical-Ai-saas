'use strict';

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');

const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();

// ── Security middleware ────────────────────────────────────────────────────────
app.use(helmet());

// Allow both the configured origin and any Vercel preview deployments
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  // Strip trailing slash variant
  (process.env.FRONTEND_ORIGIN || 'http://localhost:5173').replace(/\/$/, ''),
  'http://localhost:5173',
  'http://localhost:3000',
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    // Allow if origin matches any allowed origin (with or without trailing slash)
    const normalizedOrigin = origin.replace(/\/$/, '');
    const isAllowed = allowedOrigins.some(o => o.replace(/\/$/, '') === normalizedOrigin);
    if (isAllowed) return callback(null, true);
    // Also allow any vercel.app subdomain for preview deployments
    if (normalizedOrigin.endsWith('.vercel.app')) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// ── Body parsing ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── Input sanitization ─────────────────────────────────────────────────────────
app.use(mongoSanitize());

// ── Request logging ────────────────────────────────────────────────────────────
app.use(requestLogger);

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/prescriptions', require('./routes/prescriptions'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/users', require('./routes/users'));

// ── 404 handler ────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found', data: null });
});

// ── Global error handler (must be last) ───────────────────────────────────────
app.use(errorHandler);

// ── MongoDB connection ─────────────────────────────────────────────────────────
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('MongoDB connected successfully');
  } catch (err) {
    logger.error(`MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }
}

connectDB();

module.exports = app;
