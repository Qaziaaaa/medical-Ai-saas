'use strict';

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

router.get(
  '/doctors',
  [authenticate, authorize(['doctor', 'receptionist'])],
  userController.listDoctors
);

module.exports = router;
