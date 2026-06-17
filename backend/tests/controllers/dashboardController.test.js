'use strict';

jest.mock('../../src/models/Patient');
jest.mock('../../src/models/Appointment');
jest.mock('../../src/models/Prescription');
jest.mock('../../src/utils/apiResponse', () => ({
  sendSuccess: jest.fn(),
}));

const Patient = require('../../src/models/Patient');
const Appointment = require('../../src/models/Appointment');
const Prescription = require('../../src/models/Prescription');
const dashboardController = require('../../src/controllers/dashboardController');
const { sendSuccess } = require('../../src/utils/apiResponse');

function mockReq(overrides = {}) {
  return { body: {}, params: {}, query: {}, user: {}, ...overrides };
}
function mockRes() { return {}; }
function mockNext() { return jest.fn(); }

describe('dashboardController', () => {
  afterEach(() => jest.clearAllMocks());

  describe('stats', () => {
    it('returns doctor stats including totalPrescriptions', async () => {
      const req = mockReq({ user: { role: 'doctor' } });
      const res = mockRes();
      const next = mockNext();
      Appointment.countDocuments.mockResolvedValue(5);
      Patient.countDocuments.mockResolvedValue(100);
      Prescription.countDocuments.mockResolvedValue(30);

      await dashboardController.stats(req, res, next);

      expect(Appointment.countDocuments).toHaveBeenCalled();
      expect(Patient.countDocuments).toHaveBeenCalledWith({ deletedAt: null });
      expect(Prescription.countDocuments).toHaveBeenCalled();
      expect(sendSuccess).toHaveBeenCalledWith(
        res,
        { appointmentsToday: 5, totalPatients: 100, totalPrescriptions: 30 },
        'Dashboard stats retrieved successfully'
      );
    });

    it('returns receptionist stats including pendingAppointments', async () => {
      const req = mockReq({ user: { role: 'receptionist' } });
      const res = mockRes();
      const next = mockNext();
      Appointment.countDocuments.mockResolvedValueOnce(3);
      Patient.countDocuments.mockResolvedValue(200);
      Appointment.countDocuments.mockResolvedValueOnce(8);

      await dashboardController.stats(req, res, next);

      expect(sendSuccess).toHaveBeenCalledWith(
        res,
        { appointmentsToday: 3, totalPatients: 200, pendingAppointments: 8 },
        'Dashboard stats retrieved successfully'
      );
    });

    it('throws when a model query fails', async () => {
      const req = mockReq({ user: { role: 'doctor' } });
      const res = mockRes();
      const next = mockNext();
      const error = new Error('Connection failed');
      Appointment.countDocuments.mockRejectedValue(error);

      await dashboardController.stats(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(sendSuccess).not.toHaveBeenCalled();
    });
  });
});
