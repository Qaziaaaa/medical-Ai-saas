'use strict';

jest.mock('../../src/models/User');
jest.mock('../../src/models/Patient');
jest.mock('../../src/models/Appointment');

const fc = require('fast-check');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../src/models/User');
const Patient = require('../../src/models/Patient');
const Appointment = require('../../src/models/Appointment');
const authService = require('../../src/services/authService');
const patientService = require('../../src/services/patientService');
const appointmentService = require('../../src/services/appointmentService');
const AppError = require('../../src/utils/AppError');

const TEST_SECRET = 'test-jwt-property-secret';

beforeAll(() => {
  process.env.JWT_SECRET = TEST_SECRET;
  process.env.JWT_EXPIRES_IN = '7d';
});

afterAll(() => {
  delete process.env.JWT_SECRET;
  delete process.env.JWT_EXPIRES_IN;
});

afterEach(() => {
  jest.clearAllMocks();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeUser(overrides = {}) {
  return {
    _id: 'user_prop_' + Math.random().toString(36).slice(2, 8),
    email: 'doctor@clinic.demo',
    password: '$2a$12$hashedpassword',
    role: 'doctor',
    name: 'Dr. Smith',
    ...overrides,
  };
}

function mockQueryChain(resolvedValue) {
  const populateMock = jest.fn().mockReturnThis();
  const chain = {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    populate: populateMock,
    lean: jest.fn().mockResolvedValue(resolvedValue),
  };
  populateMock.mockReturnValue(chain);
  return chain;
}

function mockFindOne(resolvedValue) {
  return { select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(resolvedValue) }) };
}

function mockFindByIdAndUpdate(updatedValue) {
  return {
    populate: jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue(updatedValue),
    }),
  };
}

/**
 * P4 — authService Invariants
 *
 * For any valid login attempt:
 *   - A matching password always yields a JWT with id + role claims
 *   - A non-matching password always throws AppError(401)
 *   - Token decoding always recovers original id and role
 */
describe('P4: authService invariants (property-based)', () => {
  describe('password comparison', () => {
    test('matching password returns token with id and role claims', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom('doctor', 'receptionist'),
          async (password, role) => {
            jest.clearAllMocks();
            const user = makeUser({ role, email: `${role}@test.com` });
            User.findOne.mockReturnValue(mockFindOne(user));
            jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

            const result = await authService.login(user.email, password);

            if (!result.token || !result.user) return false;
            if (result.user.password !== undefined) return false;

            const decoded = jwt.verify(result.token, TEST_SECRET);
            if (decoded.id !== user._id) return false;
            if (decoded.role !== user.role) return false;

            return true;
          }
        ),
        { numRuns: 30 }
      );
    });

    test('non-matching password always throws AppError(401)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.length > 0),
          fc.constantFrom('doctor', 'receptionist'),
          async (goodPw, badPw, role) => {
            if (goodPw === badPw) return true;
            jest.clearAllMocks();
            const user = makeUser({ role });
            User.findOne.mockReturnValue(mockFindOne(user));
            jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

            try {
              await authService.login(user.email, badPw);
              return false;
            } catch (err) {
              return err instanceof AppError && err.statusCode === 401;
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('token invariants', () => {
    test('JWT always contains id and role for valid user data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom('doctor', 'receptionist'),
          async (password, role) => {
            jest.clearAllMocks();
            const user = makeUser({ role, email: `tokentest${role}@c.com` });
            User.findOne.mockReturnValue(mockFindOne(user));
            jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

            const result = await authService.login(user.email, password);
            const decoded = jwt.verify(result.token, TEST_SECRET);

            return decoded.id != null && decoded.role != null;
          }
        ),
        { numRuns: 30 }
      );
    });

    test('invalid token always throws jsonwebtoken error', async () => {
      await fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.constantFrom('', 'invalid', 'tampered.signature.here', 'a.b'),
          (_, badToken) => {
            try {
              jwt.verify(badToken, TEST_SECRET);
              return false;
            } catch (err) {
              return err.name === 'JsonWebTokenError' || err.name === 'SyntaxError';
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});

/**
 * P5 — patientService Invariants
 *
 * For any valid pagination inputs:
 *   - Response always has { patients, total, page, limit }
 *   - page is always >= 1
 *   - limit is always between 1 and 100
 *   - Empty results always yield an empty array and total 0
 */
describe('P5: patientService invariants (property-based)', () => {
  function mockPatientFind(returnValue) {
    Patient.find.mockReturnValue(returnValue);
  }

  describe('pagination clamping', () => {
    test('response always has expected envelope fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.option(fc.integer({ min: -10, max: 200 }), { nil: undefined }),
          fc.option(fc.integer({ min: -5, max: 500 }), { nil: undefined }),
          async (page, limit) => {
            jest.clearAllMocks();
            mockPatientFind(mockQueryChain([]));
            Patient.countDocuments.mockResolvedValue(0);

            const result = await patientService.listPatients({ page, limit });

            if (!('patients' in result)) return false;
            if (!('total' in result)) return false;
            if (!('page' in result)) return false;
            if (!('limit' in result)) return false;
            if (result.page < 1) return false;
            if (result.limit < 1 || result.limit > 100) return false;

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    test('negative or zero page is always treated as 1', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: -100, max: 0 }),
          async (page) => {
            jest.clearAllMocks();
            mockPatientFind(mockQueryChain([]));
            Patient.countDocuments.mockResolvedValue(0);

            const result = await patientService.listPatients({ page });

            return result.page === 1;
          }
        ),
        { numRuns: 30 }
      );
    });

    test('limit larger than 100 is always clamped to 100', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 101, max: 10000 }),
          async (limit) => {
            jest.clearAllMocks();
            mockPatientFind(mockQueryChain([]));
            Patient.countDocuments.mockResolvedValue(0);

            const result = await patientService.listPatients({ limit });

            return result.limit === 100;
          }
        ),
        { numRuns: 30 }
      );
    });

    test('empty database returns empty array and total 0', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 50 }),
          fc.integer({ min: 1, max: 100 }),
          async (page, limit) => {
            jest.clearAllMocks();
            mockPatientFind(mockQueryChain([]));
            Patient.countDocuments.mockResolvedValue(0);

            const result = await patientService.listPatients({ page, limit });

            return Array.isArray(result.patients) && result.patients.length === 0 && result.total === 0;
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});

/**
 * P6 — appointmentService Invariants
 *
 * For status transitions:
 *   - Receptionist may set 'confirmed' or 'cancelled' — never 'completed'
 *   - Doctor may set 'completed' or 'cancelled' — never 'confirmed'
 *   - Any invalid status string is rejected with AppError(400)
 *
 * For pagination:
 *   - Response always has { appointments, total, page, limit }
 *   - page >= 1, limit between 1-100
 */
describe('P6: appointmentService invariants (property-based)', () => {
  function mockAppointmentFind(returnValue) {
    Appointment.find.mockReturnValue(returnValue);
  }

  describe('status transition rules', () => {
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    const invalidStatusArb = fc
      .string({ minLength: 1, maxLength: 20 })
      .filter((s) => !validStatuses.includes(s));

    test('receptionist can set confirmed or cancelled, not completed', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('confirmed', 'cancelled'),
          async (status) => {
            jest.clearAllMocks();
            const appt = {
              _id: 'appt123',
              patient: { _id: 'p1', fullName: 'Jane' },
              doctor: { _id: 'd1', name: 'Dr. X', role: 'doctor' },
              status: 'pending',
            };
            Appointment.findByIdAndUpdate.mockReturnValue(mockFindByIdAndUpdate({ ...appt, status }));

            const result = await appointmentService.updateStatus('appt123', status, 'receptionist');

            return result != null && result.status === status;
          }
        ),
        { numRuns: 20 }
      );
    });

    test('receptionist setting completed throws AppError(403)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant('completed'),
          async (status) => {
            jest.clearAllMocks();
            try {
              await appointmentService.updateStatus('appt123', status, 'receptionist');
              return false;
            } catch (err) {
              return err instanceof AppError && err.statusCode === 403;
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    test('doctor can set completed or cancelled, not confirmed', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('completed', 'cancelled'),
          async (status) => {
            jest.clearAllMocks();
            const appt = {
              _id: 'appt456',
              patient: { _id: 'p2', fullName: 'John' },
              doctor: { _id: 'd1', name: 'Dr. X', role: 'doctor' },
              status: 'confirmed',
            };
            Appointment.findByIdAndUpdate.mockReturnValue(mockFindByIdAndUpdate({ ...appt, status }));

            const result = await appointmentService.updateStatus('appt456', status, 'doctor');

            return result != null && result.status === status;
          }
        ),
        { numRuns: 20 }
      );
    });

    test('doctor setting confirmed throws AppError(403)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant('confirmed'),
          async (status) => {
            jest.clearAllMocks();
            try {
              await appointmentService.updateStatus('appt456', status, 'doctor');
              return false;
            } catch (err) {
              return err instanceof AppError && err.statusCode === 403;
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    test('any invalid status string throws AppError(400)', async () => {
      await fc.assert(
        fc.asyncProperty(
          invalidStatusArb,
          fc.constantFrom('doctor', 'receptionist'),
          async (status, role) => {
            jest.clearAllMocks();
            try {
              await appointmentService.updateStatus('appt789', status, role);
              return false;
            } catch (err) {
              return err instanceof AppError && err.statusCode === 400;
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('pagination invariants', () => {
    test('response always has correct envelope structure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.option(fc.integer({ min: -5, max: 100 }), { nil: undefined }),
          fc.option(fc.integer({ min: -5, max: 500 }), { nil: undefined }),
          async (page, limit) => {
            jest.clearAllMocks();
            mockAppointmentFind(mockQueryChain([]));
            Appointment.countDocuments.mockResolvedValue(0);

            const result = await appointmentService.listAppointments({ page, limit });

            if (!('appointments' in result)) return false;
            if (!('total' in result)) return false;
            if (!('page' in result)) return false;
            if (!('limit' in result)) return false;
            if (result.page < 1) return false;
            if (result.limit < 1 || result.limit > 100) return false;

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
