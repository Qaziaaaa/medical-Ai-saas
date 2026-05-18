/**
 * Wraps an async Express controller so that any rejected promise is forwarded
 * to the next error-handling middleware instead of causing an unhandled
 * rejection.
 *
 * Usage:
 *   router.get('/path', asyncHandler(async (req, res) => { ... }));
 *
 * @param {Function} fn  Async controller function (req, res, next) => Promise
 * @returns {Function}   Express middleware
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
