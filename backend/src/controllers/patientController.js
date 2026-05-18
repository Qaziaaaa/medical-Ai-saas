'use strict';

const patientService = require('../services/patientService');
const { sendSuccess } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/patients
 * List patients with pagination and optional search.
 * Query params: page, limit, search
 */
const list = asyncHandler(async (req, res) => {
  const { page, limit, search } = req.query;
  const result = await patientService.listPatients({ page, limit, search });
  sendSuccess(res, result, 'Patients retrieved successfully');
});

/**
 * GET /api/patients/:id
 * Get a single patient by ID.
 */
const getOne = asyncHandler(async (req, res) => {
  const patient = await patientService.getPatient(req.params.id);
  sendSuccess(res, { patient }, 'Patient retrieved successfully');
});

/**
 * POST /api/patients
 * Create a new patient record.
 */
const create = asyncHandler(async (req, res) => {
  const patient = await patientService.createPatient(req.body);
  sendSuccess(res, { patient }, 'Patient created successfully', 201);
});

/**
 * PUT /api/patients/:id
 * Update an existing patient record.
 */
const update = asyncHandler(async (req, res) => {
  const patient = await patientService.updatePatient(req.params.id, req.body);
  sendSuccess(res, { patient }, 'Patient updated successfully');
});

/**
 * DELETE /api/patients/:id
 * Soft-delete a patient.
 */
const remove = asyncHandler(async (req, res) => {
  await patientService.deletePatient(req.params.id);
  sendSuccess(res, null, 'Patient deleted');
});

module.exports = { list, getOne, create, update, remove };
