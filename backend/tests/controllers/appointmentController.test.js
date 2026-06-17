'use strict';

jest.mock('../../src/services/appointmentService');
jest.mock('../../src/utils/apiResponse', () => ({
  sendSuccess: jest.fn(),
}));

const AppError = require('../../src/utils/AppError');
const appointmentService = require('../../src/services/appointmentService');
const appointmentController = require('../../src/controllers/appointmentController');
const { sendSuccess } = require('../../src/utils/apiResponse');

function mockReq(overrides = {}) {
  return { body: {}, params: {}, query: {}, user: {}, ...overrides };
}
function mockRes() { return {}; }
function mockNext() { return jest.fn(); }

describe('appointmentController', () => {
  afterEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('returns appointments with filters', async () => {
      const req = mockReq({
        query: { status: 'pending', doctor: 'doc1', patient: 'pat1', dateFrom: '2024-01-01', dateTo: '2024-01-31', page: '1', limit: '20' },
      });
      const res = mockRes();
      const next = mockNext();
      const result = { appointments: [], total: 0, page: 1, limit: 20 };
      appointmentService.listAppointments.mockResolvedValue(result);

      await appointmentController.list(req, res, next);

      expect(appointmentService.listAppointments).toHaveBeenCalledWith({
        status: 'pending', doctor: 'doc1', patient: 'pat1',
        dateFrom: '2024-01-01', dateTo: '2024-01-31', page: '1', limit: '20',
      });
      expect(sendSuccess).toHaveBeenCalledWith(res, result, 'Appointments retrieved successfully');
    });

    it('handles empty query params', async () => {
      const req = mockReq({ query: {} });
      const res = mockRes();
      const next = mockNext();
      appointmentService.listAppointments.mockResolvedValue({ appointments: [], total: 0, page: 1, limit: 25 });

      await appointmentController.list(req, res, next);

      expect(appointmentService.listAppointments).toHaveBeenCalledWith({
        status: undefined, doctor: undefined, patient: undefined,
        dateFrom: undefined, dateTo: undefined, page: undefined, limit: undefined,
      });
    });

    it('throws when service fails', async () => {
      const req = mockReq({ query: {} });
      const res = mockRes();
      const next = mockNext();
      const error = new Error('DB error');
      appointmentService.listAppointments.mockRejectedValue(error);

      await appointmentController.list(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(sendSuccess).not.toHaveBeenCalled();
    });
  });

  describe('getOne', () => {
    it('returns appointment by ID', async () => {
      const req = mockReq({ params: { id: 'apt1' } });
      const res = mockRes();
      const next = mockNext();
      const appointment = { _id: 'apt1', status: 'pending' };
      appointmentService.getAppointment.mockResolvedValue(appointment);

      await appointmentController.getOne(req, res, next);

      expect(appointmentService.getAppointment).toHaveBeenCalledWith('apt1');
      expect(sendSuccess).toHaveBeenCalledWith(res, { appointment }, 'Appointment retrieved successfully');
    });

    it('throws 404 when not found', async () => {
      const req = mockReq({ params: { id: 'missing' } });
      const res = mockRes();
      const next = mockNext();
      const error = new AppError('Appointment not found', 404);
      appointmentService.getAppointment.mockRejectedValue(error);

      await appointmentController.getOne(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('create', () => {
    it('returns created appointment with 201', async () => {
      const req = mockReq({ body: { patient: 'pat1', scheduledAt: new Date() } });
      const res = mockRes();
      const next = mockNext();
      const appointment = { _id: 'new', patient: 'pat1' };
      appointmentService.createAppointment.mockResolvedValue(appointment);

      await appointmentController.create(req, res, next);

      expect(appointmentService.createAppointment).toHaveBeenCalledWith(req.body);
      expect(sendSuccess).toHaveBeenCalledWith(res, { appointment }, 'Appointment created successfully', 201);
    });

    it('throws when service fails', async () => {
      const req = mockReq({ body: {} });
      const res = mockRes();
      const next = mockNext();
      const error = new AppError('Missing required fields', 422);
      appointmentService.createAppointment.mockRejectedValue(error);

      await appointmentController.create(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('update', () => {
    it('returns updated appointment', async () => {
      const req = mockReq({ params: { id: 'apt1' }, body: { scheduledAt: new Date() } });
      const res = mockRes();
      const next = mockNext();
      const appointment = { _id: 'apt1', scheduledAt: new Date() };
      appointmentService.updateAppointment.mockResolvedValue(appointment);

      await appointmentController.update(req, res, next);

      expect(appointmentService.updateAppointment).toHaveBeenCalledWith('apt1', req.body);
      expect(sendSuccess).toHaveBeenCalledWith(res, { appointment }, 'Appointment updated successfully');
    });
  });

  describe('updateStatus', () => {
    it('updates status and uses req.user.role', async () => {
      const req = mockReq({ params: { id: 'apt1' }, body: { status: 'confirmed' }, user: { role: 'receptionist' } });
      const res = mockRes();
      const next = mockNext();
      const appointment = { _id: 'apt1', status: 'confirmed' };
      appointmentService.updateStatus.mockResolvedValue(appointment);

      await appointmentController.updateStatus(req, res, next);

      expect(appointmentService.updateStatus).toHaveBeenCalledWith('apt1', 'confirmed', 'receptionist');
      expect(sendSuccess).toHaveBeenCalledWith(res, { appointment }, 'Appointment status updated successfully');
    });

    it('throws when service rejects transition', async () => {
      const req = mockReq({ params: { id: 'apt1' }, body: { status: 'invalid' }, user: { role: 'doctor' } });
      const res = mockRes();
      const next = mockNext();
      const error = new AppError('Invalid status transition', 400);
      appointmentService.updateStatus.mockRejectedValue(error);

      await appointmentController.updateStatus(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(sendSuccess).not.toHaveBeenCalled();
    });
  });
});
