'use strict';

/**
 * Operational error class for known, expected errors (e.g. 404, 403, 409).
 * The global error handler checks `isOperational` to distinguish these from
 * unexpected programming errors and uses `statusCode` directly.
 */
class AppError extends Error {
  /**
   * @param {string} message  Human-readable error description
   * @param {number} statusCode  HTTP status code to send to the client
   */
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    // Maintain a clean stack trace (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

module.exports = AppError;
