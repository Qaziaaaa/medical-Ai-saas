'use strict';

const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

router.post('/symptom-check', [authenticate, authorize(['doctor'])], aiController.checkSymptoms);

module.exports = router;
