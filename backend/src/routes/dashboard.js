'use strict';

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

// Get dashboard stats  — GET /api/dashboard/stats
router.get(
  '/stats',
  [authenticate, authorize(['doctor', 'receptionist'])],
  dashboardController.stats
);

module.exports = router;
