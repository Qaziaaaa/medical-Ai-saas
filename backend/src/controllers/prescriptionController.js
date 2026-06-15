'use strict';

const prescriptionService = require('../services/prescriptionService');
const { generatePrescriptionPDF } = require('../utils/pdfGenerator');
const { sendSuccess } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/prescriptions?patientId=<id>
 * List all prescriptions for a patient.
 * Accessible by: doctor, receptionist
 */
const list = asyncHandler(async (req, res) => {
  const prescriptions = await prescriptionService.listPrescriptions(req.query.patientId);
  sendSuccess(res, { prescriptions }, 'Prescriptions retrieved successfully');
});

/**
 * GET /api/prescriptions/:id
 * Get a single prescription by ID.
 * Accessible by: doctor, receptionist
 */
const getOne = asyncHandler(async (req, res) => {
  const prescription = await prescriptionService.getPrescription(req.params.id);
  sendSuccess(res, { prescription }, 'Prescription retrieved successfully');
});

/**
 * POST /api/prescriptions
 * Create a new prescription. Doctor ID is taken from the authenticated user.
 * Accessible by: doctor
 */
const create = asyncHandler(async (req, res) => {
  const prescription = await prescriptionService.createPrescription({
    ...req.body,
    patient: req.body.patient,
    doctor: req.user.id,
  });
  sendSuccess(res, { prescription }, 'Prescription created successfully', 201);
});

/**
 * GET /api/prescriptions/:id/pdf
 * Stream the prescription as a PDF attachment.
 * Accessible by: doctor, receptionist
 */
const downloadPDF = asyncHandler(async (req, res) => {
  const prescription = await prescriptionService.getPrescription(req.params.id);
  generatePrescriptionPDF(prescription, res);
});

module.exports = { list, getOne, create, downloadPDF };
