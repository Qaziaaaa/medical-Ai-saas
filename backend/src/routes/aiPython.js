'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { callPython, callPythonWithFile } = require('../services/aiPythonService');
const asyncHandler = require('../utils/asyncHandler');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

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

// POST /api/ai/python/analyze/triage — NLP symptom triage
router.post(
  '/analyze/triage',
  [authenticate, authorize(['doctor', 'receptionist'])],
  asyncHandler(async (req, res) => {
    const result = await callPython('/analyze/triage', req.body, req.token);
    res.json({ success: true, data: result });
  })
);

// POST /api/ai/python/analyze/interactions — drug interaction checker
router.post(
  '/analyze/interactions',
  [authenticate, authorize(['doctor'])],
  asyncHandler(async (req, res) => {
    const result = await callPython('/analyze/interactions', req.body, req.token);
    res.json({ success: true, data: result });
  })
);

// POST /api/ai/python/analyze/xray — X-ray image analysis (file upload)
router.post(
  '/analyze/xray',
  [authenticate, authorize(['doctor']), upload.single('file')],
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded', data: null });
    }
    const result = await callPythonWithFile('/analyze/xray', req.file, req.token);
    res.json({ success: true, data: result });
  })
);

// ── Future AI endpoints will go here ─────────────────────────
// POST /api/ai/python/analyze/risk
// POST /api/ai/python/reports/generate

module.exports = router;
