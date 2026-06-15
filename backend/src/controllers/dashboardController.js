'use strict';

const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const { sendSuccess } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/dashboard/stats
 * Role-aware dashboard statistics.
 *
 * Returns counts relevant to the authenticated user's role:
 *   - doctor:   appointmentsToday, totalPatients, totalPrescriptions
 *   - receptionist: appointmentsToday, totalPatients, pendingAppointments
 *   - shared:   appointmentsToday, totalPatients
 */
const stats = asyncHandler(async (req, res) => {
  const { role } = req.user;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todayFilter = { scheduledAt: { $gte: todayStart, $lte: todayEnd } };

  const statsData = {};

  // Shared: today's appointments total
  const [appointmentsToday, totalPatients] = await Promise.all([
    Appointment.countDocuments(todayFilter),
    Patient.countDocuments({ deletedAt: null }),
  ]);
  statsData.appointmentsToday = appointmentsToday;
  statsData.totalPatients = totalPatients;

  // Doctor-specific
  if (role === 'doctor') {
    const totalPrescriptions = await Prescription.countDocuments();
    statsData.totalPrescriptions = totalPrescriptions;
  }

  // Receptionist-specific
  if (role === 'receptionist') {
    const pendingAppointments = await Appointment.countDocuments({ status: 'pending' });
    statsData.pendingAppointments = pendingAppointments;
  }

  sendSuccess(res, statsData, 'Dashboard stats retrieved successfully');
});

module.exports = { stats };
