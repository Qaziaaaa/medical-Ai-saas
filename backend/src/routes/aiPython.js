'use strict';

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { callPython } = require('../services/aiPythonService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * All routes in this file proxy to the Python AI service.
 * The user must be authenticated (any role can use AI features).
 */

// GET /api/ai/python/health — check if Python service is alive
router.get(
  '/health',
  [authenticate, authorize(['doctor', 'receptionist'])],
  asyncHandler(async (req, res) => {
    const result = await callPython('/hello', {}, req.token, 'GET');
    res.json({ success: true, data: result });
  })
);

// POST /api/ai/python/hello — test endpoint (proxies to Python)
router.post(
  '/hello',
  [authenticate, authorize(['doctor', 'receptionist'])],
  asyncHandler(async (req, res) => {
    const result = await callPython('/hello', req.body, req.token);
    res.json({ success: true, data: result });
  })
);

// ── Future AI endpoints will go here ─────────────────────────
// POST /api/ai/python/analyze/triage
// POST /api/ai/python/analyze/interactions
// POST /api/ai/python/analyze/xray
// POST /api/ai/python/analyze/risk
// POST /api/ai/python/reports/generate

module.exports = router;
