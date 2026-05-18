'use strict';

const Patient = require('../models/Patient');
const AppError = require('../utils/AppError');

const DEFAULT_LIMIT = 25;

/**
 * List patients with pagination and optional search.
 * Excludes soft-deleted records.
 *
 * @param {object} options
 * @param {number} options.page    - 1-based page number
 * @param {number} options.limit   - records per page (max 100)
 * @param {string} options.search  - optional text/contact search query
 * @returns {{ patients: object[], total: number, page: number, limit: number }}
 */
async function listPatients({ page = 1, limit = DEFAULT_LIMIT, search = '' } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || DEFAULT_LIMIT));
  const skip = (pageNum - 1) * limitNum;

  // Base filter: exclude soft-deleted
  const filter = { deletedAt: null };

  // Search by fullName (case-insensitive) or contactNumber
  if (search && search.trim()) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    filter.$or = [
      { fullName: regex },
      { contactNumber: regex },
    ];
  }

  const [patients, total] = await Promise.all([
    Patient.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
    Patient.countDocuments(filter),
  ]);

  return { patients, total, page: pageNum, limit: limitNum };
}

/**
 * Get a single patient by ID (excludes soft-deleted).
 *
 * @param {string} id - MongoDB ObjectId string
 * @returns {object} Patient document
 * @throws {AppError} 404 if not found or soft-deleted
 */
async function getPatient(id) {
  const patient = await Patient.findOne({ _id: id, deletedAt: null });
  if (!patient) throw new AppError('Patient not found', 404);
  return patient;
}

/**
 * Create a new patient record.
 * Mongoose schema validation enforces required fields.
 *
 * @param {object} data - Patient fields
 * @returns {object} Created patient document
 */
async function createPatient(data) {
  const patient = await Patient.create(data);
  return patient;
}

/**
 * Update an existing patient record.
 * Runs Mongoose validators on the updated fields.
 *
 * @param {string} id   - MongoDB ObjectId string
 * @param {object} data - Fields to update
 * @returns {object} Updated patient document
 * @throws {AppError} 404 if not found or soft-deleted
 */
async function updatePatient(id, data) {
  // Prevent overwriting deletedAt via update
  delete data.deletedAt;

  const patient = await Patient.findOneAndUpdate(
    { _id: id, deletedAt: null },
    data,
    { new: true, runValidators: true }
  );
  if (!patient) throw new AppError('Patient not found', 404);
  return patient;
}

/**
 * Soft-delete a patient by setting deletedAt timestamp.
 *
 * @param {string} id - MongoDB ObjectId string
 * @returns {object} Updated patient document with deletedAt set
 * @throws {AppError} 404 if not found or already deleted
 */
async function deletePatient(id) {
  const patient = await Patient.findOneAndUpdate(
    { _id: id, deletedAt: null },
    { deletedAt: new Date() },
    { new: true }
  );
  if (!patient) throw new AppError('Patient not found', 404);
  return patient;
}

module.exports = { listPatients, getPatient, createPatient, updatePatient, deletePatient };
