'use strict';

const aiService = require('../services/aiService');
const { sendSuccess } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const checkSymptoms = asyncHandler(async (req, res) => {
  const { symptoms, patientAge, patientGender, medicalHistory } = req.body;
  const result = await aiService.checkSymptoms({ symptoms, patientAge, patientGender, medicalHistory });
  sendSuccess(res, result, 'Symptom analysis complete');
});

module.exports = { checkSymptoms };
