'use strict';

const logger = require('../utils/logger');

/**
 * Express middleware that logs every request once the response finishes.
 *
 * Log format: [METHOD] /path <statusCode> <responseTime>ms
 * Example:    [GET] /api/patients 200 45ms
 *
 * Uses `res.on('finish', ...)` so the status code and response time are
 * captured after the response has been sent to the client.
 */
function requestLogger(req, res, next) {
  const startTime = Date.now();

  res.on('finish', () => {
    const method       = req.method;
    const path         = req.originalUrl || req.url;
    const statusCode   = res.statusCode;
    const responseTime = Date.now() - startTime;

    const message = `[${method}] ${path} ${statusCode} ${responseTime}ms`;

    // Use warn for 4xx, error for 5xx, info for everything else
    if (statusCode >= 500) {
      logger.error(message);
    } else if (statusCode >= 400) {
      logger.warn(message);
    } else {
      logger.info(message);
    }
  });

  next();
}

module.exports = requestLogger;
