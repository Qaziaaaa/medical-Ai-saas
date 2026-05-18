'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const AppointmentSchema = new Schema(
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
    scheduledAt: {
      type: Date,
      required: [true, 'Scheduled date/time is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'confirmed', 'completed', 'cancelled'],
        message: 'Status must be pending, confirmed, completed, or cancelled',
      },
      default: 'pending',
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [500, 'Reason must be 500 characters or fewer'],
    },
  },
  { timestamps: true }
);

// Indexes for efficient querying
AppointmentSchema.index({ doctor: 1, scheduledAt: 1 });
AppointmentSchema.index({ status: 1 });
AppointmentSchema.index({ patient: 1 });

const Appointment = mongoose.model('Appointment', AppointmentSchema);
module.exports = Appointment;
