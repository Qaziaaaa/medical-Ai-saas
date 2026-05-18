'use strict';

/**
 * Tests for middleware/authorize.js
 *
 * Covers:
 *  - Unit tests: correct role passes, wrong role → 403, no req.user → 401
 *  - Property-based test for P8: Role-Based Access Enforcement
 *
 * // Feature: ai-clinic-management-saas, Property 8: Role-Based Access Enforcement
 */

const fc = require('fast-check');
const authorize = require('../../src/middleware/authorize');
const AppError = require('../../src/utils/AppError');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a minimal mock Express request with an optional req.user.
 */
function mockReq(user) {
  return user ? { user } : {};
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

// ─── Unit tests ───────────────────────────────────────────────────────────────

describe('authorize — unit tests', () => {
  test('user with correct role → calls next() with no args', () => {
    const middleware = authorize(['doctor', 'receptionist']);
    const req = mockReq({ id: 'user1', role: 'doctor' });
    const next = captureNext();

    middleware(req, {}, next);

    expect(next.captured()).toBeUndefined(); // next() called with no error
  });

  test('user with wrong role → calls next(AppError 403)', () => {
    const middleware = authorize(['doctor']);
    const req = mockReq({ id: 'user2', role: 'receptionist' });
    const next = captureNext();

    middleware(req, {}, next);

    const err = next.captured();
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe('You do not have permission to perform this action');
  });

  test('no req.user (unauthenticated) → calls next(AppError 401)', () => {
    const middleware = authorize(['doctor']);
    const req = mockReq(undefined);
    const next = captureNext();

    middleware(req, {}, next);

    const err = next.captured();
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Authentication required');
  });

  test('single allowed role → only that role passes', () => {
    const middleware = authorize(['receptionist']);

    // receptionist passes
    const req1 = mockReq({ id: 'u1', role: 'receptionist' });
    const next1 = captureNext();
    middleware(req1, {}, next1);
    expect(next1.captured()).toBeUndefined();

    // doctor fails
    const req2 = mockReq({ id: 'u2', role: 'doctor' });
    const next2 = captureNext();
    middleware(req2, {}, next2);
    expect(next2.captured()).toBeInstanceOf(AppError);
    expect(next2.captured().statusCode).toBe(403);
  });

  test('multiple allowed roles → any of them passes', () => {
    const middleware = authorize(['doctor', 'receptionist']);

    // doctor passes
    const req1 = mockReq({ id: 'u1', role: 'doctor' });
    const next1 = captureNext();
    middleware(req1, {}, next1);
    expect(next1.captured()).toBeUndefined();

    // receptionist passes
    const req2 = mockReq({ id: 'u2', role: 'receptionist' });
    const next2 = captureNext();
    middleware(req2, {}, next2);
    expect(next2.captured()).toBeUndefined();
  });

  test('empty allowed roles array → all users are rejected', () => {
    const middleware = authorize([]);
    const req = mockReq({ id: 'u1', role: 'doctor' });
    const next = captureNext();

    middleware(req, {}, next);

    const err = next.captured();
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(403);
  });

  test('req.user exists but role is undefined → rejected', () => {
    const middleware = authorize(['doctor']);
    const req = mockReq({ id: 'u1' }); // no role field
    const next = captureNext();

    middleware(req, {}, next);

    const err = next.captured();
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(403);
  });
});

// ─── Property-based test: P8 Role-Based Access Enforcement ────────────────────

/**
 * **Validates: Requirements 2.5, 5.7, 7.7, 7.8, 9.6, 11.7**
 *
 * // Feature: ai-clinic-management-saas, Property 8: Role-Based Access Enforcement
 *
 * For any protected route that restricts access to a specific set of roles,
 * a request from a user whose role is not in that set SHALL always receive
 * HTTP 403, regardless of the route, the user's identity, or the request payload.
 */
describe('P8: Role-Based Access Enforcement (property-based)', () => {
  // Arbitrary for a user role (doctor or receptionist)
  const roleArb = fc.constantFrom('doctor', 'receptionist');

  // Arbitrary for a set of allowed roles (non-empty array of roles)
  const allowedRolesArb = fc.array(roleArb, { minLength: 1, maxLength: 2 }).map((arr) => [...new Set(arr)]);

  test('user with role NOT in allowedRoles → always 403', () => {
    fc.assert(
      fc.property(allowedRolesArb, roleArb, (allowedRoles, userRole) => {
        // Only test cases where userRole is NOT in allowedRoles
        fc.pre(!allowedRoles.includes(userRole));

        const middleware = authorize(allowedRoles);
        const req = mockReq({ id: 'user-x', role: userRole });
        const next = captureNext();

        middleware(req, {}, next);

        const err = next.captured();
        return err instanceof AppError && err.statusCode === 403;
      }),
      { numRuns: 100 }
    );
  });

  test('user with role IN allowedRoles → always passes (next() with no error)', () => {
    fc.assert(
      fc.property(allowedRolesArb, (allowedRoles) => {
        // Pick a role from the allowed set
        const userRole = allowedRoles[0];

        const middleware = authorize(allowedRoles);
        const req = mockReq({ id: 'user-y', role: userRole });
        const next = captureNext();

        middleware(req, {}, next);

        // next() should be called with no arguments (undefined)
        return next.captured() === undefined;
      }),
      { numRuns: 100 }
    );
  });

  test('no req.user → always 401 regardless of allowedRoles', () => {
    fc.assert(
      fc.property(allowedRolesArb, (allowedRoles) => {
        const middleware = authorize(allowedRoles);
        const req = mockReq(undefined);
        const next = captureNext();

        middleware(req, {}, next);

        const err = next.captured();
        return err instanceof AppError && err.statusCode === 401;
      }),
      { numRuns: 100 }
    );
  });
});
