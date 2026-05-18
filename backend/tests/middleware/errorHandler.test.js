'use strict';

/**
 * Tests for middleware/errorHandler.js and utils/AppError.js
 *
 * Covers:
 *  - Unit tests for each error-type mapping
 *  - Property-based test for P2: Error Handler Envelope Invariant
 *
 * // Feature: ai-clinic-management-saas, Property 2: Error Handler Envelope Invariant
 */

const fc = require('fast-check');
const AppError = require('../../src/utils/AppError');
const errorHandler = require('../../src/middleware/errorHandler');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a minimal mock Express response that captures the last json() call.
 */
function mockRes() {
  const res = {
    _status: null,
    _body: null,
    status(code) {
      this._status = code;
      return this;
    },
    json(body) {
      this._body = body;
      return this;
    },
  };
  return res;
}

/** No-op next (error handler never calls it). */
const noop = () => {};

// ─── AppError unit tests ──────────────────────────────────────────────────────

describe('AppError', () => {
  test('sets message, statusCode, and isOperational', () => {
    const err = new AppError('Not found', 404);
    expect(err.message).toBe('Not found');
    expect(err.statusCode).toBe(404);
    expect(err.isOperational).toBe(true);
    expect(err instanceof Error).toBe(true);
  });

  test('has a stack trace', () => {
    const err = new AppError('oops', 500);
    expect(typeof err.stack).toBe('string');
    expect(err.stack.length).toBeGreaterThan(0);
  });
});

// ─── errorHandler unit tests ──────────────────────────────────────────────────

describe('errorHandler — error type mapping', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  // Helper: run the handler and return { status, body }
  function run(err) {
    const res = mockRes();
    errorHandler(err, {}, res, noop);
    return { status: res._status, body: res._body };
  }

  test('Mongoose ValidationError → 422 with errors array', () => {
    const err = Object.assign(new Error('Validation failed'), {
      name: 'ValidationError',
      errors: {
        email: { path: 'email', message: 'Email is required' },
        name:  { path: 'name',  message: 'Name is required'  },
      },
    });

    const { status, body } = run(err);

    expect(status).toBe(422);
    expect(body.success).toBe(false);
    expect(body.message).toBe('Validation failed');
    expect(body.data).toBeNull();
    expect(Array.isArray(body.errors)).toBe(true);
    expect(body.errors).toHaveLength(2);
    expect(body.errors).toEqual(
      expect.arrayContaining([
        { field: 'email', message: 'Email is required' },
        { field: 'name',  message: 'Name is required'  },
      ])
    );
  });

  test('Mongoose CastError → 400 "Invalid ID format"', () => {
    const err = Object.assign(new Error('Cast to ObjectId failed'), {
      name: 'CastError',
    });

    const { status, body } = run(err);

    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.message).toBe('Invalid ID format');
    expect(body.data).toBeNull();
  });

  test('MongoDB duplicate key (code 11000) → 409 "Duplicate entry"', () => {
    const err = Object.assign(new Error('E11000 duplicate key'), {
      code: 11000,
    });

    const { status, body } = run(err);

    expect(status).toBe(409);
    expect(body.success).toBe(false);
    expect(body.message).toBe('Duplicate entry');
    expect(body.data).toBeNull();
  });

  test('JsonWebTokenError → 401 "Invalid token"', () => {
    const err = Object.assign(new Error('jwt malformed'), {
      name: 'JsonWebTokenError',
    });

    const { status, body } = run(err);

    expect(status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.message).toBe('Invalid token');
    expect(body.data).toBeNull();
  });

  test('TokenExpiredError → 401 "Token expired"', () => {
    const err = Object.assign(new Error('jwt expired'), {
      name: 'TokenExpiredError',
    });

    const { status, body } = run(err);

    expect(status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.message).toBe('Token expired');
    expect(body.data).toBeNull();
  });

  test('AppError (isOperational) → uses err.statusCode', () => {
    const err = new AppError('Resource not found', 404);

    const { status, body } = run(err);

    expect(status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.message).toBe('Resource not found');
    expect(body.data).toBeNull();
  });

  test('Unknown error → 500 "Internal server error"', () => {
    const err = new Error('Something exploded');

    const { status, body } = run(err);

    expect(status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.message).toBe('Internal server error');
    expect(body.data).toBeNull();
  });

  test('stack is included in development', () => {
    process.env.NODE_ENV = 'development';
    // Re-require to pick up the new env value
    jest.resetModules();
    const handler = require('../../src/middleware/errorHandler');
    const err = new Error('dev error');
    const res = mockRes();
    handler(err, {}, res, noop);
    expect(res._body.stack).toBeDefined();
  });

  test('stack is NOT included in production', () => {
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    const handler = require('../../src/middleware/errorHandler');
    const err = new Error('prod error');
    const res = mockRes();
    handler(err, {}, res, noop);
    expect(res._body.stack).toBeUndefined();
  });
});

// ─── Property-based test: P2 Error Handler Envelope Invariant ─────────────────

/**
 * **Validates: Requirements 1.4, 14.5**
 *
 * // Feature: ai-clinic-management-saas, Property 2: Error Handler Envelope Invariant
 *
 * For any unhandled error passed to the global error handler middleware, the
 * response body SHALL always contain `success: false` and a non-empty `message`
 * string, and SHALL never contain a `stack` field in production mode.
 */
describe('P2: Error Handler Envelope Invariant (property-based)', () => {
  // Arbitrary that generates a variety of Error-like objects covering all
  // branches in the handler (ValidationError, CastError, 11000, JWT errors,
  // AppError, and plain errors).
  const errorArb = fc.oneof(
    // Plain Error
    fc.string({ minLength: 1 }).map((msg) => new Error(msg)),

    // AppError with arbitrary operational status codes
    fc.tuple(fc.string({ minLength: 1 }), fc.integer({ min: 400, max: 599 })).map(
      ([msg, code]) => new AppError(msg, code)
    ),

    // Mongoose ValidationError
    fc.string({ minLength: 1 }).map((msg) => {
      const err = Object.assign(new Error(msg), {
        name: 'ValidationError',
        errors: {
          field1: { path: 'field1', message: 'required' },
        },
      });
      return err;
    }),

    // Mongoose CastError
    fc.string({ minLength: 1 }).map((msg) =>
      Object.assign(new Error(msg), { name: 'CastError' })
    ),

    // MongoDB duplicate key
    fc.string({ minLength: 1 }).map((msg) =>
      Object.assign(new Error(msg), { code: 11000 })
    ),

    // JWT errors
    fc.constantFrom('JsonWebTokenError', 'TokenExpiredError').map((name) =>
      Object.assign(new Error('jwt error'), { name })
    )
  );

  test('envelope always has success:false and non-empty message', () => {
    fc.assert(
      fc.property(errorArb, (err) => {
        const res = mockRes();
        errorHandler(err, {}, res, noop);

        const body = res._body;

        // success must be false
        if (body.success !== false) return false;

        // message must be a non-empty string
        if (typeof body.message !== 'string' || body.message.length === 0) return false;

        // data must be null
        if (body.data !== null) return false;

        return true;
      }),
      { numRuns: 100 }
    );
  });

  test('stack is never present in production mode', () => {
    // Force production mode for this property run
    const savedEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    const handler = require('../../src/middleware/errorHandler');
    const AppErrorFresh = require('../../src/utils/AppError');

    // Rebuild the arbitrary with the fresh AppError class
    const prodErrorArb = fc.oneof(
      fc.string({ minLength: 1 }).map((msg) => new Error(msg)),
      fc.tuple(fc.string({ minLength: 1 }), fc.integer({ min: 400, max: 599 })).map(
        ([msg, code]) => new AppErrorFresh(msg, code)
      ),
      fc.string({ minLength: 1 }).map((msg) =>
        Object.assign(new Error(msg), { name: 'CastError' })
      ),
      fc.string({ minLength: 1 }).map((msg) =>
        Object.assign(new Error(msg), { code: 11000 })
      )
    );

    try {
      fc.assert(
        fc.property(prodErrorArb, (err) => {
          const res = mockRes();
          handler(err, {}, res, noop);
          // stack must NOT appear in production
          return !('stack' in res._body);
        }),
        { numRuns: 100 }
      );
    } finally {
      process.env.NODE_ENV = savedEnv;
      jest.resetModules();
    }
  });
});
