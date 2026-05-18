'use strict';

/**
 * Global Express error-handling middleware.
 *
 * Maps known error types to appropriate HTTP status codes and always returns
 * the standard response envelope:
 *   { success: false, message, data: null, errors? }
 *
 * Stack traces are included only in development (NODE_ENV !== 'production').
 */

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Extract field-level validation errors from a Mongoose ValidationError.
 *
 * @param {import('mongoose').Error.ValidationError} err
 * @returns {{ field: string, message: string }[]}
 */
function extractMongooseValidationErrors(err) {
  return Object.values(err.errors).map((e) => ({
    field: e.path,
    message: e.message,
  }));
}

/**
 * Build the standard error response body.
 *
 * @param {string}  message
 * @param {Array}   [errors=[]]
 * @param {string}  [stack]
 * @returns {object}
 */
function buildBody(message, errors = [], stack) {
  const body = {
    success: false,
    message,
    data: null,
  };

  if (errors.length > 0) {
    body.errors = errors;
  }

  if (!isProduction && stack) {
    body.stack = stack;
  }

  return body;
}

/**
 * Express 4-argument error handler — must be registered AFTER all routes.
 *
 * @param {Error}                       err
 * @param {import('express').Request}   req
 * @param {import('express').Response}  res
 * @param {import('express').NextFunction} next  // required by Express signature
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // ── Mongoose ValidationError (schema-level field validation) ──────────────
  if (err.name === 'ValidationError') {
    const errors = extractMongooseValidationErrors(err);
    return res
      .status(422)
      .json(buildBody('Validation failed', errors, err.stack));
  }

  // ── Mongoose CastError (invalid ObjectId / type cast) ─────────────────────
  if (err.name === 'CastError') {
    return res
      .status(400)
      .json(buildBody('Invalid ID format', [], err.stack));
  }

  // ── MongoDB duplicate key (unique index violation) ─────────────────────────
  if (err.code === 11000) {
    return res
      .status(409)
      .json(buildBody('Duplicate entry', [], err.stack));
  }

  // ── JWT errors ─────────────────────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    return res
      .status(401)
      .json(buildBody('Invalid token', [], err.stack));
  }

  if (err.name === 'TokenExpiredError') {
    return res
      .status(401)
      .json(buildBody('Token expired', [], err.stack));
  }

  // ── Operational AppError (thrown intentionally by services/controllers) ────
  if (err.isOperational === true) {
    return res
      .status(err.statusCode)
      .json(buildBody(err.message, err.errors || [], err.stack));
  }

  // ── Unknown / programming errors ───────────────────────────────────────────
  // Log the full error so it can be investigated without leaking details.
  console.error('[errorHandler] Unexpected error:', err);

  return res
    .status(500)
    .json(buildBody('Internal server error', [], err.stack));
}

module.exports = errorHandler;
