'use strict';

const express = require('express');
const router = express.Router();
const prescriptionController = require('../controllers/prescriptionController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

// List prescriptions for a patient  — GET /api/prescriptions?patientId=<id>
router.get(
  '/',
  [authenticate, authorize(['doctor', 'receptionist'])],
  prescriptionController.list
);

// Get a single prescription  — GET /api/prescriptions/:id
router.get(
  '/:id',
  [authenticate, authorize(['doctor', 'receptionist'])],
  prescriptionController.getOne
);

// Create a prescription  — POST /api/prescriptions
router.post(
  '/',
  [authenticate, authorize(['doctor'])],
  prescriptionController.create
);

// Download prescription as PDF  — GET /api/prescriptions/:id/pdf
router.get(
  '/:id/pdf',
  [authenticate, authorize(['doctor', 'receptionist'])],
  prescriptionController.downloadPDF
);

module.exports = router;
