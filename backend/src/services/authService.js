'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');

const SALT_ROUNDS = 12;

/**
 * Hash a plaintext password.
 * @param {string} plainPassword
 * @returns {Promise<string>} bcrypt hash
 */
async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Authenticate a user by email and password.
 * Returns a signed JWT and the user object on success.
 * Throws AppError(401) on invalid credentials.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ token: string, user: object }>}
 */
async function login(email, password) {
  // Find user — password is included by default (no select:false on schema)
  // Use .lean() to get a plain object so toJSON transform doesn't strip password
  const user = await User.findOne({ email: email.toLowerCase().trim() }).lean();

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  // Strip password before returning
  const { password: _pw, ...safeUser } = user;
  return { token, user: safeUser };
}

/**
 * Get the current authenticated user by ID.
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function getCurrentUser(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return user;
}

module.exports = { login, hashPassword, getCurrentUser };
