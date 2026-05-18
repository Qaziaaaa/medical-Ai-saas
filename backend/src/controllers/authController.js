'use strict';

const authService = require('../services/authService');
const { sendSuccess } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * POST /api/auth/login
 * Public — authenticate user and return JWT
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    const AppError = require('../utils/AppError');
    throw new AppError('Email and password are required', 400);
  }

  const { token, user } = await authService.login(email, password);
  sendSuccess(res, { token, user }, 'Login successful');
});

/**
 * GET /api/auth/me
 * Protected — return current authenticated user
 */
const me = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user.id);
  sendSuccess(res, { user }, 'User retrieved successfully');
});

module.exports = { login, me };
