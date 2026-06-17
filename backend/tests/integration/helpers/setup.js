'use strict';

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../../src/models/User');
const Patient = require('../../../src/models/Patient');
const Appointment = require('../../../src/models/Appointment');
const Prescription = require('../../../src/models/Prescription');

let mongoServer;

/**
 * Start an in-memory MongoDB server and set env vars for testing.
 * Must be called before requiring the app so that dotenv.config() doesn't
 * override them.
 */
async function startDatabase() {
  mongoServer = await MongoMemoryServer.create({ instance: { dbName: 'test' } });
  const uri = mongoServer.getUri();
  process.env.MONGO_URI = uri;
  process.env.JWT_SECRET = JWT_SECRET;
  return uri;
}

/**
 * Stop the in-memory MongoDB server and disconnect.
 */
async function stopDatabase() {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
}

/**
 * Wait until mongoose is connected (readyState === 1).
 */
async function waitForConnection(timeoutMs = 15000) {
  const start = Date.now();
  while (mongoose.connection.readyState !== 1) {
    if (Date.now() - start > timeoutMs) throw new Error('MongoDB connection timeout');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// ── Seed helpers ────────────────────────────────────────────────────────────

const JWT_SECRET = 'test-secret-key-for-integration-tests';

async function seedUsers() {
  const hash = await bcrypt.hash('Password@123', 4);

  const doctor = await User.create({
    name: 'Dr. Test',
    email: 'doctor@test.com',
    password: hash,
    role: 'doctor',
    credentials: 'MD',
  });

  const receptionist = await User.create({
    name: 'Receptionist Test',
    email: 'receptionist@test.com',
    password: hash,
    role: 'receptionist',
  });

  return { doctor, receptionist };
}

function generateToken(user, expiresIn = '1h') {
  return jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn });
}

async function seedPatient(overrides = {}) {
  return Patient.create({
    fullName: 'John Doe',
    dateOfBirth: new Date('1990-01-15'),
    gender: 'male',
    contactNumber: '+1 555 000 0000',
    ...overrides,
  });
}

async function seedAppointment(patientId, doctorId, overrides = {}) {
  return Appointment.create({
    patient: patientId,
    doctor: doctorId,
    scheduledAt: new Date(Date.now() + 86400000),
    status: 'pending',
    reason: 'Checkup',
    ...overrides,
  });
}

async function seedPrescription(patientId, doctorId, overrides = {}) {
  return Prescription.create({
    patient: patientId,
    doctor: doctorId,
    medicines: [{ name: 'Amoxicillin', dosage: '500mg', frequency: '3 times daily', duration: '7 days' }],
    notes: 'Take with food',
    ...overrides,
  });
}

async function cleanDatabase() {
  await Promise.all([
    User.deleteMany({}),
    Patient.deleteMany({}),
    Appointment.deleteMany({}),
    Prescription.deleteMany({}),
  ]);
}

module.exports = {
  startDatabase,
  stopDatabase,
  waitForConnection,
  seedUsers,
  seedPatient,
  seedAppointment,
  seedPrescription,
  cleanDatabase,
  generateToken,
  JWT_SECRET,
};
