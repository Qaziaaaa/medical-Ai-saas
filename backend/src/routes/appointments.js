'use strict';

const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

/**
 * @route   GET /api/appointments
 * @desc    List appointments (paginated, filterable)
 * @access  Protected — doctor, receptionist
 * @query   status, doctor, patient, dateFrom, dateTo, page, limit
 */
router.get(
  '/',
  [authenticate, authorize(['doctor', 'receptionist'])],
  appointmentController.list
);

/**
 * @route   GET /api/appointments/:id
 * @desc    Get a single appointment by ID
 * @access  Protected — doctor, receptionist
 */
router.get(
  '/:id',
  [authenticate, authorize(['doctor', 'receptionist'])],
  appointmentController.getOne
);

/**
 * @route   POST /api/appointments
 * @desc    Create a new appointment
 * @access  Protected — receptionist only
 */
router.post(
  '/',
  [authenticate, authorize(['receptionist'])],
  appointmentController.create
);

/**
 * @route   PUT /api/appointments/:id
 * @desc    Update (reschedule) an existing appointment
 * @access  Protected — receptionist only
 */
router.put(
  '/:id',
  [authenticate, authorize(['receptionist'])],
  appointmentController.update
);

/**
 * @route   PATCH /api/appointments/:id/status
 * @desc    Update the status of an appointment
 * @access  Protected — doctor, receptionist
 */
router.patch(
  '/:id/status',
  [authenticate, authorize(['doctor', 'receptionist'])],
  appointmentController.updateStatus
);

module.exports = router;
