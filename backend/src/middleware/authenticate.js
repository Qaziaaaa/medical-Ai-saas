'use strict';

const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');

/**
 * Verifies the JWT from the Authorization header.
 * Attaches req.user = { id, role } on success.
 * Returns 401 for missing, expired, or malformed tokens.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.token = token;
      req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (err) {
    // JsonWebTokenError and TokenExpiredError are handled by errorHandler
    next(err);
  }
}

module.exports = authenticate;
