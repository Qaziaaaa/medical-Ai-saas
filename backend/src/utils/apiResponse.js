/**
 * Send a standardised success response.
 *
 * @param {import('express').Response} res
 * @param {*} data
 * @param {string} message
 * @param {number} statusCode
 */
const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Send a standardised error response.
 *
 * @param {import('express').Response} res
 * @param {string} message
 * @param {number} statusCode
 * @param {Array} errors  Field-level validation errors, if any. Omitted from
 *                        the response body when the array is empty.
 */
const sendError = (res, message = 'Error', statusCode = 400, errors = []) => {
  const body = { success: false, message, data: null };
  if (errors.length > 0) {
    body.errors = errors;
  }
  return res.status(statusCode).json(body);
};

module.exports = { sendSuccess, sendError };
