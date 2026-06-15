'use strict';

const Prescription = require('../models/Prescription');
const AppError = require('../utils/AppError');

/**
 * Validate that every medicine entry has the three required fields.
 * Returns an array of field-level error objects (empty if valid).
 *
 * @param {Array} medicines
 * @returns {{ field: string, message: string }[]}
 */
function validateMedicines(medicines) {
  const errors = [];

  if (!Array.isArray(medicines) || medicines.length === 0) {
    errors.push({ field: 'medicines', message: 'At least one medicine is required' });
    return errors;
  }

  medicines.forEach((med, idx) => {
    if (!med.name || !String(med.name).trim()) {
      errors.push({ field: `medicines[${idx}].name`, message: 'Medicine name is required' });
    }
    if (!med.dosage || !String(med.dosage).trim()) {
      errors.push({ field: `medicines[${idx}].dosage`, message: 'Dosage is required' });
    }
    if (!med.frequency || !String(med.frequency).trim()) {
      errors.push({ field: `medicines[${idx}].frequency`, message: 'Frequency is required' });
    }
  });

  return errors;
}

/**
 * Create a new prescription.
 * Validates each medicine has name, dosage, and frequency before saving.
 *
 * @param {object} data - Prescription fields (patient, doctor, appointment, medicines, notes)
 * @returns {Promise<object>} Saved prescription document
 * @throws {AppError} 422 with field errors if medicine validation fails
 */
async function createPrescription(data) {
  const errors = validateMedicines(data.medicines);
  if (errors.length > 0) {
    const err = new AppError('Validation failed', 422);
    err.errors = errors;
    throw err;
  }

  const prescription = await Prescription.create(data);
  return prescription;
}

/**
 * List prescriptions with optional patient filter and pagination.
 * Populates patient name and doctor name/credentials.
 *
 * @param {object} options
 * @param {string} [options.patientId] - MongoDB ObjectId string (omit for all)
 * @param {number} [options.page]      - 1-based page number
 * @param {number} [options.limit]     - Records per page (max 100)
 * @returns {{ prescriptions: object[], total: number, page: number, limit: number }}
 */
async function listPrescriptions({ patientId, page = 1, limit = 25 } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
  const skip = (pageNum - 1) * limitNum;

  const filter = {};
  if (patientId) filter.patient = patientId;

  const [prescriptions, total] = await Promise.all([
    Prescription.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('patient', 'fullName')
      .populate('doctor', 'name credentials')
      .lean(),
    Prescription.countDocuments(filter),
  ]);

  return { prescriptions, total, page: pageNum, limit: limitNum };
}

/**
 * Get a single prescription by ID.
 * Populates patient and doctor fields.
 *
 * @param {string} id - MongoDB ObjectId string
 * @returns {Promise<object>} Prescription document
 * @throws {AppError} 404 if not found
 */
async function getPrescription(id) {
  const prescription = await Prescription.findById(id)
    .populate('patient')
    .populate('doctor', 'name credentials');

  if (!prescription) throw new AppError('Prescription not found', 404);
  return prescription;
}

module.exports = { createPrescription, listPrescriptions, getPrescription };
