'use strict';

const AppError = require('../utils/AppError');

/**
 * Role-based authorization middleware factory.
 * Returns middleware that allows only users whose role is in the allowedRoles array.
 *
 * Usage: router.get('/path', authenticate, authorize(['doctor', 'receptionist']), controller)
 *
 * @param {string[]} allowedRoles
 * @returns {Function} Express middleware
 */
function authorize(allowedRoles) {
  return function (req, res, next) {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }

    next();
  };
}

module.exports = authorize;
