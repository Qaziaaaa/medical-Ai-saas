'use strict';

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticate = require('../middleware/authenticate');

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user, return JWT
 * @access  Public
 * @body    { email: string, password: string }
 * @returns { success, message, data: { token, user } }
 */
router.post('/login', authController.login);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user
 * @access  Protected (any authenticated role)
 * @returns { success, message, data: { user } }
 */
router.get('/me', authenticate, authController.me);

module.exports = router;
