'use strict';

/**
 * Tests for middleware/authenticate.js
 *
 * Covers:
 *  - Unit tests: valid JWT, missing header, malformed token, expired token
 *  - Property-based test for P7: Invalid Token Always Rejected
 *
 * // Feature: ai-clinic-management-saas, Property 7: Invalid Token Always Rejected
 */

const jwt = require('jsonwebtoken');
const fc = require('fast-check');
const authenticate = require('../../src/middleware/authenticate');
const AppError = require('../../src/utils/AppError');

const TEST_SECRET = 'test-secret-key';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a minimal mock Express request with an optional Authorization header.
 */
function mockReq(authHeader) {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
  };
}

/**
 * Capture the error or call passed to next().
 */
function captureNext() {
  let captured;
  const next = (arg) => { captured = arg; };
  next.captured = () => captured;
  return next;
}

// ─── Setup: set JWT_SECRET env var ────────────────────────────────────────────

beforeAll(() => {
  process.env.JWT_SECRET = TEST_SECRET;
});

afterAll(() => {
  delete process.env.JWT_SECRET;
});

// ─── Unit tests ───────────────────────────────────────────────────────────────

describe('authenticate — unit tests', () => {
  test('valid JWT → attaches req.user = { id, role } and calls next() with no args', () => {
    const payload = { id: 'user123', role: 'doctor' };
    const token = jwt.sign(payload, TEST_SECRET, { expiresIn: '1h' });

    const req = mockReq(`Bearer ${token}`);
    const next = captureNext();

    authenticate(req, {}, next);

    expect(next.captured()).toBeUndefined(); // next() called with no error
    expect(req.user).toEqual({ id: 'user123', role: 'doctor' });
  });

  test('missing Authorization header → calls next(AppError 401)', () => {
    const req = mockReq(undefined);
    const next = captureNext();

    authenticate(req, {}, next);

    const err = next.captured();
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Authentication required');
  });

  test('Authorization header without Bearer prefix → calls next(AppError 401)', () => {
    const req = mockReq('Token somevalue');
    const next = captureNext();

    authenticate(req, {}, next);

    const err = next.captured();
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(401);
  });

  test('malformed token → calls next() with a JWT error (forwarded to errorHandler)', () => {
    const req = mockReq('Bearer this.is.not.a.valid.jwt');
    const next = captureNext();

    authenticate(req, {}, next);

    const err = next.captured();
    // The error should be a JsonWebTokenError (not an AppError)
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('JsonWebTokenError');
  });

  test('expired token → calls next() with a TokenExpiredError', () => {
    const payload = { id: 'user456', role: 'receptionist' };
    // Sign with a negative expiry so it is immediately expired
    const token = jwt.sign(payload, TEST_SECRET, { expiresIn: -1 });

    const req = mockReq(`Bearer ${token}`);
    const next = captureNext();

    authenticate(req, {}, next);

    const err = next.captured();
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('TokenExpiredError');
  });

  test('token signed with wrong secret → calls next() with JsonWebTokenError', () => {
    const token = jwt.sign({ id: 'x', role: 'doctor' }, 'wrong-secret');

    const req = mockReq(`Bearer ${token}`);
    const next = captureNext();

    authenticate(req, {}, next);

    const err = next.captured();
    expect(err.name).toBe('JsonWebTokenError');
  });

  test('valid token with receptionist role → req.user.role is receptionist', () => {
    const token = jwt.sign({ id: 'rec1', role: 'receptionist' }, TEST_SECRET, { expiresIn: '1h' });

    const req = mockReq(`Bearer ${token}`);
    const next = captureNext();

    authenticate(req, {}, next);

    expect(next.captured()).toBeUndefined();
    expect(req.user).toEqual({ id: 'rec1', role: 'receptionist' });
  });
});

// ─── Property-based test: P7 Invalid Token Always Rejected ────────────────────

/**
 * **Validates: Requirements 2.4**
 *
 * // Feature: ai-clinic-management-saas, Property 7: Invalid Token Always Rejected
 *
 * For any protected route request carrying a token that is missing, expired,
 * or structurally malformed, the API SHALL return HTTP 401 regardless of which
 * endpoint is targeted.
 */
describe('P7: Invalid Token Always Rejected (property-based)', () => {
  /**
   * Arbitrary that generates structurally malformed token strings.
   * These are strings that are NOT valid JWTs signed with TEST_SECRET.
   */
  const malformedTokenArb = fc.oneof(
    // Random strings (very unlikely to be valid JWTs)
    fc.string({ minLength: 1, maxLength: 200 }),
    // Dot-separated strings that look like JWTs but aren't
    fc.tuple(fc.string({ minLength: 1 }), fc.string({ minLength: 1 }), fc.string({ minLength: 1 }))
      .map(([a, b, c]) => `${Buffer.from(a).toString('base64')}.${Buffer.from(b).toString('base64')}.${c}`),
    // Empty-ish strings
    fc.constantFrom('', ' ', 'null', 'undefined', 'Bearer', '..', 'a.b.c')
  );

  test('any malformed Bearer token → next() is called with an error (not undefined)', () => {
    fc.assert(
      fc.property(malformedTokenArb, (tokenStr) => {
        const req = mockReq(`Bearer ${tokenStr}`);
        const next = captureNext();

        authenticate(req, {}, next);

        // next() must have been called with an error (not undefined)
        const err = next.captured();
        return err instanceof Error;
      }),
      { numRuns: 100 }
    );
  });

  test('missing or non-Bearer Authorization header → always AppError 401', () => {
    // Arbitrary for headers that are missing or don't start with "Bearer "
    const badHeaderArb = fc.oneof(
      fc.constant(undefined),
      fc.constant(null),
      fc.constant(''),
      fc.string({ minLength: 1 }).filter((s) => !s.startsWith('Bearer ')),
      fc.constantFrom('Token abc', 'Basic dXNlcjpwYXNz', 'bearer token', 'BEARER token')
    );

    fc.assert(
      fc.property(badHeaderArb, (header) => {
        const req = {
          headers: header != null ? { authorization: header } : {},
        };
        const next = captureNext();

        authenticate(req, {}, next);

        const err = next.captured();
        return err instanceof AppError && err.statusCode === 401;
      }),
      { numRuns: 100 }
    );
  });
});
