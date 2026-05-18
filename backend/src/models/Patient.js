'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const PatientSchema = new Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [200, 'Full name must be 200 characters or fewer'],
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    gender: {
      type: String,
      enum: {
        values: ['male', 'female', 'other'],
        message: 'Gender must be male, female, or other',
      },
      required: [true, 'Gender is required'],
    },
    contactNumber: {
      type: String,
      required: [true, 'Contact number is required'],
      trim: true,
      maxlength: [20, 'Contact number must be 20 characters or fewer'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [254, 'Email must be 254 characters or fewer'],
    },
    address: {
      type: String,
      trim: true,
      maxlength: [500, 'Address must be 500 characters or fewer'],
    },
    medicalHistory: {
      type: String,
      trim: true,
      maxlength: [5000, 'Medical history must be 5000 characters or fewer'],
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes for search and soft-delete filtering (Requirement 15.1)
PatientSchema.index({ fullName: 'text', contactNumber: 1 });
PatientSchema.index({ deletedAt: 1 });

const Patient = mongoose.model('Patient', PatientSchema);
module.exports = Patient;
