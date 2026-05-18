'use strict';

/**
 * Simple logger utility.
 * - Development: colorized console output with timestamp
 * - Production:  plain JSON-style output
 */

const isDev = (process.env.NODE_ENV || 'development') !== 'production';

// ANSI color codes (only applied in development)
const COLORS = {
  reset:  '\x1b[0m',
  cyan:   '\x1b[36m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  gray:   '\x1b[90m',
};

/**
 * Returns an ISO timestamp string.
 * @returns {string}
 */
function timestamp() {
  return new Date().toISOString();
}

/**
 * Formats a log entry for development (colorized) or production (JSON-style).
 * @param {'INFO'|'WARN'|'ERROR'} level
 * @param {string} message
 * @returns {string}
 */
function format(level, message) {
  if (isDev) {
    const levelColors = {
      INFO:  COLORS.green,
      WARN:  COLORS.yellow,
      ERROR: COLORS.red,
    };
    const color = levelColors[level] || COLORS.reset;
    return (
      `${COLORS.gray}${timestamp()}${COLORS.reset} ` +
      `${color}[${level}]${COLORS.reset} ` +
      `${message}`
    );
  }

  // Production: plain JSON-style single line
  return JSON.stringify({ timestamp: timestamp(), level, message });
}

const logger = {
  /**
   * Log an informational message.
   * @param {string} message
   */
  info(message) {
    console.log(format('INFO', message));
  },

  /**
   * Log a warning message.
   * @param {string} message
   */
  warn(message) {
    console.warn(format('WARN', message));
  },

  /**
   * Log an error message.
   * @param {string} message
   */
  error(message) {
    console.error(format('ERROR', message));
  },
};

module.exports = logger;
