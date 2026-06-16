'use strict';

const axios = require('axios');

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

/**
 * Forward a request to the Python AI service.
 *
 * The Python service shares the same JWT secret, so we forward the
 * authenticated user's token for authorization.
 *
 * @param {string} endpoint  - Path on the Python service (e.g. "/hello")
 * @param {object} [data]    - Request body for POST/PUT
 * @param {string} token     - JWT from the authenticated user
 * @param {'GET'|'POST'} [method='POST'] - HTTP method
 * @returns {Promise<object>} Parsed JSON response from Python
 */
async function callPython(endpoint, data = {}, token, method = 'POST') {
  const url = `${PYTHON_SERVICE_URL}/api/v1${endpoint}`;

  const config = {
    method,
    url,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000, // 30s — models can be slow
  };

  if (method === 'POST' && data) {
    config.data = data;
  }

  try {
    const response = await axios(config);
    return response.data;
  } catch (err) {
    const status = err.response?.status || 503;
    const message =
      err.response?.data?.detail ||
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      'Python AI service unavailable';

    const error = new Error(message);
    error.statusCode = status;
    error.isOperational = true;
    error.original = err;
    error.pythonDetail = err.response?.data;
    throw error;
  }
}

/**
 * Quick health check — returns true if the Python service responds.
 */
async function checkHealth(token) {
  try {
    const res = await axios.get(`${PYTHON_SERVICE_URL}/health`, { timeout: 5000 });
    return res.data?.status === 'ok';
  } catch {
    return false;
  }
}

module.exports = { callPython, checkHealth };
