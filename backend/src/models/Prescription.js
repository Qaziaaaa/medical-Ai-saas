'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Sub-schema for a single medicine entry.
 * _id is disabled — medicines are embedded value objects.
 */
const MedicineSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Medicine name is required'],
      trim: true,
    },
    dosage: {
      type: String,
      required: [true, 'Dosage is required'],
      trim: true,
    },
    frequency: {
      type: String,
      required: [true, 'Frequency is required'],
      trim: true,
    },
    duration: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const PrescriptionSchema = new Schema(
  {
    patient: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient is required'],
    },
    doctor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Doctor is required'],
    },
    appointment: {
      type: Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
    medicines: {
      type: [MedicineSchema],
      required: [true, 'At least one medicine is required'],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length >= 1,
        message: 'At least one medicine is required',
      },
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Efficient lookup: all prescriptions for a patient, newest first
PrescriptionSchema.index({ patient: 1, createdAt: -1 });

const Prescription = mongoose.model('Prescription', PrescriptionSchema);
module.exports = Prescription;
