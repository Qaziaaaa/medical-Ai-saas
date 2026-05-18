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
 * List all prescriptions for a patient, sorted newest first.
 * Populates the doctor's name and credentials.
 *
 * @param {string} patientId - MongoDB ObjectId string
 * @returns {Promise<object[]>} Array of prescription documents
 */
async function listPrescriptions(patientId) {
  const prescriptions = await Prescription.find({ patient: patientId })
    .sort({ createdAt: -1 })
    .populate('doctor', 'name credentials')
    .lean();

  return prescriptions;
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
