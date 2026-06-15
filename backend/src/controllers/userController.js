'use strict';

const User = require('../models/User');
const { sendSuccess } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const listDoctors = asyncHandler(async (req, res) => {
  const doctors = await User.find({ role: 'doctor' })
    .select('name email role')
    .lean();
  sendSuccess(res, { doctors }, 'Doctors retrieved successfully');
});

module.exports = { listDoctors };
