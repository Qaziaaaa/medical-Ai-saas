'use strict';

const Appointment = require('../models/Appointment');
const AppError = require('../utils/AppError');

const DEFAULT_LIMIT = 25;
const CONFLICT_WINDOW_MS = 30 * 60 * 1000; // 30 minutes in milliseconds

const VALID_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];

/**
 * List appointments with optional filters and pagination.
 *
 * @param {object} options
 * @param {string} [options.status]    - Filter by status
 * @param {string} [options.doctor]    - Filter by doctor ObjectId
 * @param {string} [options.patient]   - Filter by patient ObjectId
 * @param {string} [options.dateFrom]  - Filter scheduledAt >= dateFrom
 * @param {string} [options.dateTo]    - Filter scheduledAt <= dateTo
 * @param {number} [options.page]      - 1-based page number
 * @param {number} [options.limit]     - Records per page (max 100)
 * @returns {{ appointments: object[], total: number, page: number, limit: number }}
 */
async function listAppointments({
  status,
  doctor,
  patient,
  dateFrom,
  dateTo,
  page = 1,
  limit = DEFAULT_LIMIT,
} = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || DEFAULT_LIMIT));
  const skip = (pageNum - 1) * limitNum;

  const filter = {};

  if (status) filter.status = status;
  if (doctor) filter.doctor = doctor;
  if (patient) filter.patient = patient;

  if (dateFrom || dateTo) {
    filter.scheduledAt = {};
    if (dateFrom) filter.scheduledAt.$gte = new Date(dateFrom);
    if (dateTo) filter.scheduledAt.$lte = new Date(dateTo);
  }

  const [appointments, total] = await Promise.all([
    Appointment.find(filter)
      .sort({ scheduledAt: 1 })
      .skip(skip)
      .limit(limitNum)
      .populate('patient', 'fullName')
      .populate('doctor', 'name role')
      .lean(),
    Appointment.countDocuments(filter),
  ]);

  return { appointments, total, page: pageNum, limit: limitNum };
}

/**
 * Get a single appointment by ID.
 *
 * @param {string} id - MongoDB ObjectId string
 * @returns {object} Appointment document
 * @throws {AppError} 404 if not found
 */
async function getAppointment(id) {
  const appointment = await Appointment.findById(id)
    .populate('patient', 'fullName')
    .populate('doctor', 'name role');

  if (!appointment) throw new AppError('Appointment not found', 404);
  return appointment;
}

/**
 * Check for a scheduling conflict: any non-cancelled appointment for the same
 * doctor within 30 minutes of the given scheduledAt, excluding a specific
 * appointment ID (used when updating).
 *
 * @param {string} doctorId
 * @param {Date} scheduledAt
 * @param {string|null} [excludeId] - Appointment ID to exclude from check
 * @throws {AppError} 409 if a conflict is found
 */
async function checkConflict(doctorId, scheduledAt, excludeId = null) {
  const windowStart = new Date(scheduledAt.getTime() - CONFLICT_WINDOW_MS);
  const windowEnd = new Date(scheduledAt.getTime() + CONFLICT_WINDOW_MS);

  const conflictFilter = {
    doctor: doctorId,
    status: { $ne: 'cancelled' },
    scheduledAt: { $gte: windowStart, $lte: windowEnd },
  };

  if (excludeId) {
    conflictFilter._id = { $ne: excludeId };
  }

  const conflict = await Appointment.findOne(conflictFilter).lean();

  if (conflict) {
    const conflictTime = conflict.scheduledAt.toISOString();
    throw new AppError(
      `Doctor has a conflicting appointment at ${conflictTime}`,
      409
    );
  }
}

/**
 * Create a new appointment.
 *
 * @param {object} data - Appointment fields
 * @returns {object} Created appointment document
 * @throws {AppError} 422 if scheduledAt is in the past
 * @throws {AppError} 409 if a doctor conflict exists
 */
async function createAppointment(data) {
  const scheduledAt = new Date(data.scheduledAt);

  if (scheduledAt <= new Date()) {
    throw new AppError('Appointment cannot be scheduled in the past', 422);
  }

  await checkConflict(data.doctor, scheduledAt);

  const appointment = await Appointment.create({
    ...data,
    status: data.status || 'pending',
  });

  return appointment;
}

/**
 * Update (reschedule) an existing appointment.
 * Applies the same past-date and conflict validations as createAppointment,
 * but excludes the appointment itself from the conflict check.
 *
 * @param {string} id   - MongoDB ObjectId string
 * @param {object} data - Fields to update
 * @returns {object} Updated appointment document
 * @throws {AppError} 404 if not found
 * @throws {AppError} 422 if new scheduledAt is in the past
 * @throws {AppError} 409 if a doctor conflict exists
 */
async function updateAppointment(id, data) {
  const existing = await Appointment.findById(id);
  if (!existing) throw new AppError('Appointment not found', 404);

  if (data.scheduledAt) {
    const scheduledAt = new Date(data.scheduledAt);

    if (scheduledAt <= new Date()) {
      throw new AppError('Appointment cannot be scheduled in the past', 422);
    }

    const doctorId = data.doctor || existing.doctor;
    await checkConflict(doctorId, scheduledAt, id);
  }

  Object.assign(existing, data);
  await existing.save();

  return existing;
}

/**
 * Update the status of an appointment with role-based restrictions.
 *
 * - receptionist: may set 'confirmed' or 'cancelled' only
 * - doctor: may set 'completed' or 'cancelled' only
 *
 * @param {string} id       - MongoDB ObjectId string
 * @param {string} status   - New status value
 * @param {string} userRole - Role of the requesting user
 * @returns {object} Updated appointment document
 * @throws {AppError} 404 if not found
 * @throws {AppError} 400 if status is not a valid enum value
 * @throws {AppError} 403 if the role is not permitted to set that status
 */
async function updateStatus(id, status, userRole) {
  if (!VALID_STATUSES.includes(status)) {
    throw new AppError(
      `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
      400
    );
  }

  if (userRole === 'receptionist' && status === 'completed') {
    throw new AppError('Receptionists cannot mark appointments as completed', 403);
  }

  if (userRole === 'doctor' && status === 'confirmed') {
    throw new AppError('Doctors cannot mark appointments as confirmed', 403);
  }

  const appointment = await Appointment.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  )
    .populate('patient', 'fullName')
    .populate('doctor', 'name role');

  if (!appointment) throw new AppError('Appointment not found', 404);

  return appointment;
}

module.exports = {
  listAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  updateStatus,
};
