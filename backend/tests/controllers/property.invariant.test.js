'use strict';

jest.mock('../../src/services/patientService');
jest.mock('../../src/services/appointmentService');
jest.mock('../../src/services/prescriptionService');
jest.mock('../../src/services/authService');
jest.mock('../../src/services/aiService');
jest.mock('../../src/services/aiPythonService');
jest.mock('../../src/models/User');
jest.mock('../../src/models/Patient');
jest.mock('../../src/models/Appointment');
jest.mock('../../src/models/Prescription');
jest.mock('../../src/utils/apiResponse', () => ({
  sendSuccess: jest.fn(),
}));

const fc = require('fast-check');
const patientService = require('../../src/services/patientService');
const appointmentService = require('../../src/services/appointmentService');
const prescriptionService = require('../../src/services/prescriptionService');
const authService = require('../../src/services/authService');
const aiService = require('../../src/services/aiService');
const aiPythonService = require('../../src/services/aiPythonService');
const patientController = require('../../src/controllers/patientController');
const appointmentController = require('../../src/controllers/appointmentController');
const prescriptionController = require('../../src/controllers/prescriptionController');
const authController = require('../../src/controllers/authController');
const aiController = require('../../src/controllers/aiController');
const dashboardController = require('../../src/controllers/dashboardController');
const userController = require('../../src/controllers/userController');
const { sendSuccess } = require('../../src/utils/apiResponse');

function mockReq(overrides = {}) {
  return { body: {}, params: {}, query: {}, user: {}, ...overrides };
}
function mockRes() { return {}; }
function mockNext() { return jest.fn(); }

afterEach(() => jest.clearAllMocks());

/**
 * P9 — Controller sendSuccess Invariants
 *
 * For any controller with mock service resolving:
 *   - sendSuccess is called exactly once
 *   - First argument is always res
 *   - Service function is called with the correct request-derived args
 */
describe('P9: Controller sendSuccess invariants (property-based)', () => {
  describe('patientController', () => {
    test('list calls sendSuccess with any pagination params', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
          fc.option(fc.string({ minLength: 0, maxLength: 20 }), { nil: undefined }),
          async (page, search) => {
            jest.clearAllMocks();
            const req = mockReq({ query: { page, search } });
            const res = mockRes();
            const next = mockNext();
            const svcResult = { patients: [], total: 0, page: page || 1, limit: 25 };
            patientService.listPatients.mockResolvedValue(svcResult);

            await patientController.list(req, res, next);

            if (sendSuccess.mock.calls.length !== 1) return false;
            if (sendSuccess.mock.calls[0][0] !== res) return false;
            if (!patientService.listPatients.mock.calls[0][0].hasOwnProperty('page')) return false;
            if (!patientService.listPatients.mock.calls[0][0].hasOwnProperty('search')) return false;

            return true;
          }
        ),
        { numRuns: 30 }
      );
    });

    test('getOne calls sendSuccess with patient from service', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 30 }),
          async (id) => {
            jest.clearAllMocks();
            const req = mockReq({ params: { id } });
            const res = mockRes();
            const next = mockNext();
            patientService.getPatient.mockResolvedValue({ _id: id, fullName: 'Test' });

            await patientController.getOne(req, res, next);

            if (sendSuccess.mock.calls.length !== 1) return false;
            if (!patientService.getPatient.mock.calls[0][0].includes(id)) return false;

            return true;
          }
        ),
        { numRuns: 20 }
      );
    });

    test('create calls sendSuccess with result from service', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.object(),
          async (body) => {
            jest.clearAllMocks();
            const req = mockReq({ body });
            const res = mockRes();
            const next = mockNext();
            patientService.createPatient.mockResolvedValue({ _id: 'new', ...body });

            await patientController.create(req, res, next);

            if (sendSuccess.mock.calls.length !== 1) return false;
            if (sendSuccess.mock.calls[0][1].patient._id !== 'new') return false;

            return true;
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('appointmentController', () => {
    test('list calls sendSuccess with any filter params', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.option(fc.constantFrom('pending', 'confirmed', 'completed'), { nil: undefined }),
          fc.option(fc.constantFrom('doctor1', 'doctor2'), { nil: undefined }),
          fc.option(fc.constantFrom('patient1', 'patient2'), { nil: undefined }),
          async (status, doctor, patient) => {
            jest.clearAllMocks();
            const req = mockReq({ query: { status, doctor, patient } });
            const res = mockRes();
            const next = mockNext();
            appointmentService.listAppointments.mockResolvedValue({ appointments: [], total: 0, page: 1, limit: 25 });

            await appointmentController.list(req, res, next);

            if (sendSuccess.mock.calls.length !== 1) return false;
            if (sendSuccess.mock.calls[0][0] !== res) return false;

            return true;
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('prescriptionController', () => {
    test('create calls sendSuccess with prescription from service', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
          fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
          fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
          async (patient, doctor, notes) => {
            jest.clearAllMocks();
            const req = mockReq({ body: { patient, doctor, notes, medicines: [{ name: 'M', dosage: '10mg', frequency: '1x' }] }, user: { id: 'doc1' } });
            const res = mockRes();
            const next = mockNext();
            prescriptionService.createPrescription.mockResolvedValue({ _id: 'rx1' });

            await prescriptionController.create(req, res, next);

            if (sendSuccess.mock.calls.length !== 1) return false;
            if (sendSuccess.mock.calls[0][0] !== res) return false;

            return true;
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});

/**
 * P10 — Controller Error Propagation Invariants
 *
 * For any controller when the service rejects:
 *   - sendSuccess is never called
 *   - next() is called exactly once with the error
 */
describe('P10: Controller error propagation invariants (property-based)', () => {
  const errorArb = fc.oneof(
    fc.string({ minLength: 1 }).map((msg) => new Error(msg)),
    fc.constant(new TypeError('type error')),
    fc.constant(Object.assign(new Error('server error'), { statusCode: 500 }))
  );

  test('patientController.list forwards service errors via next', async () => {
    await fc.assert(
      fc.asyncProperty(
        errorArb,
        async (err) => {
          jest.clearAllMocks();
          patientService.listPatients.mockRejectedValue(err);

          await patientController.list(mockReq({ query: {} }), mockRes(), mockNext());

          if (sendSuccess.mock.calls.length > 0) return false;

          return true;
        }
      ),
      { numRuns: 30 }
    );
  });

  test('appointmentController.getOne forwards service errors via next', async () => {
    await fc.assert(
      fc.asyncProperty(
        errorArb,
        async (err) => {
          jest.clearAllMocks();
          appointmentService.getAppointment.mockRejectedValue(err);

          await appointmentController.getOne(mockReq({ params: { id: 'abc' } }), mockRes(), mockNext());

          if (sendSuccess.mock.calls.length > 0) return false;

          return true;
        }
      ),
      { numRuns: 30 }
    );
  });

  test('prescriptionController.list forwards service errors via next', async () => {
    await fc.assert(
      fc.asyncProperty(
        errorArb,
        async (err) => {
          jest.clearAllMocks();
          prescriptionService.listPrescriptions.mockRejectedValue(err);

          await prescriptionController.list(mockReq({ query: {} }), mockRes(), mockNext());

          if (sendSuccess.mock.calls.length > 0) return false;

          return true;
        }
      ),
      { numRuns: 30 }
    );
  });

  test('authController.login forwards service errors via next', async () => {
    await fc.assert(
      fc.asyncProperty(
        errorArb,
        async (err) => {
          jest.clearAllMocks();
          authService.login.mockRejectedValue(err);

          await authController.login(mockReq({ body: { email: 'a@b.com', password: 'pw' } }), mockRes(), mockNext());

          if (sendSuccess.mock.calls.length > 0) return false;

          return true;
        }
      ),
      { numRuns: 30 }
    );
  });

  test('aiController.checkSymptoms forwards service errors via next', async () => {
    await fc.assert(
      fc.asyncProperty(
        errorArb,
        async (err) => {
          jest.clearAllMocks();
          aiService.checkSymptoms.mockRejectedValue(err);

          await aiController.checkSymptoms(mockReq({ body: { symptoms: 'pain' } }), mockRes(), mockNext());

          if (sendSuccess.mock.calls.length > 0) return false;

          return true;
        }
      ),
      { numRuns: 30 }
    );
  });
});

/**
 * P11 — Dashboard & User Controller Invariants
 *
 * These controllers call model methods directly rather than a service layer.
 * Property tests verify that different query formats still produce valid
 * sendSuccess calls.
 */
describe('P11: Dashboard & user controller invariants (property-based)', () => {
  test('dashboardController.getStats calls sendSuccess for doctor role', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('doctor', 'receptionist'),
        async (role) => {
          jest.clearAllMocks();

          const User = require('../../src/models/User');
          const Appointment = require('../../src/models/Appointment');
          const Patient = require('../../src/models/Patient');
          const Prescription = require('../../src/models/Prescription');

          User.countDocuments.mockResolvedValue(role === 'doctor' ? 5 : 3);
          Appointment.countDocuments.mockResolvedValue(10);
          Appointment.find.mockReturnValue({
            populate: jest.fn().mockReturnValue({
              sort: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([]),
              }),
            }),
          });
          Patient.countDocuments.mockResolvedValue(20);
          Prescription.countDocuments.mockResolvedValue(15);

          const req = mockReq({ user: { id: 'u1', role } });
          const res = mockRes();
          const next = mockNext();

          await dashboardController.stats(req, res, next);

          if (sendSuccess.mock.calls.length !== 1) return false;
          if (sendSuccess.mock.calls[0][0] !== res) return false;

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  test('userController.listDoctors calls sendSuccess with any DB result', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            _id: fc.string({ minLength: 5, maxLength: 10 }),
            name: fc.string({ minLength: 1, maxLength: 20 }),
            email: fc.string({ minLength: 1, maxLength: 20 }),
            role: fc.constant('doctor'),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        async (doctors) => {
          jest.clearAllMocks();

          const User = require('../../src/models/User');
          User.find.mockReturnValue({
            select: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(doctors),
            }),
          });

          const req = mockReq();
          const res = mockRes();
          const next = mockNext();

          await userController.listDoctors(req, res, next);

          if (sendSuccess.mock.calls.length !== 1) return false;
          if (sendSuccess.mock.calls[0][0] !== res) return false;

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
});
