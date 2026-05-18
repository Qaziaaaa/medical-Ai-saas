'use strict';

const appointmentService = require('../services/appointmentService');
const { sendSuccess } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/appointments
 * List appointments with optional filters and pagination.
 * Query params: status, doctor, patient, dateFrom, dateTo, page, limit
 */
const list = asyncHandler(async (req, res) => {
  const { status, doctor, patient, dateFrom, dateTo, page, limit } = req.query;
  const result = await appointmentService.listAppointments({
    status,
    doctor,
    patient,
    dateFrom,
    dateTo,
    page,
    limit,
  });
  sendSuccess(res, result, 'Appointments retrieved successfully');
});

/**
 * GET /api/appointments/:id
 * Get a single appointment by ID.
 */
const getOne = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.getAppointment(req.params.id);
  sendSuccess(res, { appointment }, 'Appointment retrieved successfully');
});

/**
 * POST /api/appointments
 * Create a new appointment.
 */
const create = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.createAppointment(req.body);
  sendSuccess(res, { appointment }, 'Appointment created successfully', 201);
});

/**
 * PUT /api/appointments/:id
 * Update (reschedule) an existing appointment.
 */
const update = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.updateAppointment(req.params.id, req.body);
  sendSuccess(res, { appointment }, 'Appointment updated successfully');
});

/**
 * PATCH /api/appointments/:id/status
 * Update the status of an appointment.
 * Body: { status }
 */
const updateStatus = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.updateStatus(
    req.params.id,
    req.body.status,
    req.user.role
  );
  sendSuccess(res, { appointment }, 'Appointment status updated successfully');
});

module.exports = { list, getOne, create, update, updateStatus };
