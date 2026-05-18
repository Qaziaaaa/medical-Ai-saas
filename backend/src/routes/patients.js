'use strict';

const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

/**
 * @route   GET /api/patients
 * @desc    List patients (paginated, searchable)
 * @access  Protected — doctor, receptionist
 * @query   page, limit, search
 */
router.get(
  '/',
  [authenticate, authorize(['doctor', 'receptionist'])],
  patientController.list
);

/**
 * @route   GET /api/patients/:id
 * @desc    Get a single patient by ID
 * @access  Protected — doctor, receptionist
 */
router.get(
  '/:id',
  [authenticate, authorize(['doctor', 'receptionist'])],
  patientController.getOne
);

/**
 * @route   POST /api/patients
 * @desc    Create a new patient record
 * @access  Protected — receptionist only
 */
router.post(
  '/',
  [authenticate, authorize(['receptionist'])],
  patientController.create
);

/**
 * @route   PUT /api/patients/:id
 * @desc    Update an existing patient record
 * @access  Protected — receptionist only
 */
router.put(
  '/:id',
  [authenticate, authorize(['receptionist'])],
  patientController.update
);

/**
 * @route   DELETE /api/patients/:id
 * @desc    Soft-delete a patient
 * @access  Protected — receptionist only
 */
router.delete(
  '/:id',
  [authenticate, authorize(['receptionist'])],
  patientController.remove
);

module.exports = router;
