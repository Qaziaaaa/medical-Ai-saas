'use strict';

jest.mock('../../src/services/patientService');
jest.mock('../../src/utils/apiResponse', () => ({
  sendSuccess: jest.fn(),
}));

const AppError = require('../../src/utils/AppError');
const patientService = require('../../src/services/patientService');
const patientController = require('../../src/controllers/patientController');
const { sendSuccess } = require('../../src/utils/apiResponse');

function mockReq(overrides = {}) {
  return { body: {}, params: {}, query: {}, user: {}, ...overrides };
}
function mockRes() { return {}; }
function mockNext() { return jest.fn(); }

describe('patientController', () => {
  afterEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('returns patients with pagination', async () => {
      const req = mockReq({ query: { page: '2', limit: '10', search: 'Jo' } });
      const res = mockRes();
      const next = mockNext();
      const result = { patients: [{ _id: '1', fullName: 'John' }], total: 1, page: 2, limit: 10 };
      patientService.listPatients.mockResolvedValue(result);

      await patientController.list(req, res, next);

      expect(patientService.listPatients).toHaveBeenCalledWith({ page: '2', limit: '10', search: 'Jo' });
      expect(sendSuccess).toHaveBeenCalledWith(res, result, 'Patients retrieved successfully');
    });

    it('handles empty query params', async () => {
      const req = mockReq({ query: {} });
      const res = mockRes();
      const next = mockNext();
      patientService.listPatients.mockResolvedValue({ patients: [], total: 0, page: 1, limit: 25 });

      await patientController.list(req, res, next);

      expect(patientService.listPatients).toHaveBeenCalledWith({ page: undefined, limit: undefined, search: undefined });
    });

    it('throws when service fails', async () => {
      const req = mockReq({ query: {} });
      const res = mockRes();
      const next = mockNext();
      const error = new Error('DB error');
      patientService.listPatients.mockRejectedValue(error);

      await patientController.list(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(sendSuccess).not.toHaveBeenCalled();
    });
  });

  describe('getOne', () => {
    it('returns patient by ID', async () => {
      const req = mockReq({ params: { id: 'abc' } });
      const res = mockRes();
      const next = mockNext();
      const patient = { _id: 'abc', fullName: 'Jane' };
      patientService.getPatient.mockResolvedValue(patient);

      await patientController.getOne(req, res, next);

      expect(patientService.getPatient).toHaveBeenCalledWith('abc');
      expect(sendSuccess).toHaveBeenCalledWith(res, { patient }, 'Patient retrieved successfully');
    });

    it('throws 404 when patient not found', async () => {
      const req = mockReq({ params: { id: 'missing' } });
      const res = mockRes();
      const next = mockNext();
      const error = new AppError('Patient not found', 404);
      patientService.getPatient.mockRejectedValue(error);

      await patientController.getOne(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(sendSuccess).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('returns created patient with 201', async () => {
      const req = mockReq({ body: { fullName: 'New Patient' } });
      const res = mockRes();
      const next = mockNext();
      const patient = { _id: 'new', fullName: 'New Patient' };
      patientService.createPatient.mockResolvedValue(patient);

      await patientController.create(req, res, next);

      expect(patientService.createPatient).toHaveBeenCalledWith({ fullName: 'New Patient' });
      expect(sendSuccess).toHaveBeenCalledWith(res, { patient }, 'Patient created successfully', 201);
    });

    it('throws when service fails', async () => {
      const req = mockReq({ body: {} });
      const res = mockRes();
      const next = mockNext();
      const error = new AppError('Validation failed', 422);
      patientService.createPatient.mockRejectedValue(error);

      await patientController.create(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('update', () => {
    it('returns updated patient', async () => {
      const req = mockReq({ params: { id: 'abc' }, body: { fullName: 'Updated' } });
      const res = mockRes();
      const next = mockNext();
      const patient = { _id: 'abc', fullName: 'Updated' };
      patientService.updatePatient.mockResolvedValue(patient);

      await patientController.update(req, res, next);

      expect(patientService.updatePatient).toHaveBeenCalledWith('abc', { fullName: 'Updated' });
      expect(sendSuccess).toHaveBeenCalledWith(res, { patient }, 'Patient updated successfully');
    });

    it('throws 404 when patient not found', async () => {
      const req = mockReq({ params: { id: 'missing' }, body: { fullName: 'Nope' } });
      const res = mockRes();
      const next = mockNext();
      const error = new AppError('Patient not found', 404);
      patientService.updatePatient.mockRejectedValue(error);

      await patientController.update(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('remove', () => {
    it('soft-deletes patient and returns null data', async () => {
      const req = mockReq({ params: { id: 'abc' } });
      const res = mockRes();
      const next = mockNext();
      patientService.deletePatient.mockResolvedValue(undefined);

      await patientController.remove(req, res, next);

      expect(patientService.deletePatient).toHaveBeenCalledWith('abc');
      expect(sendSuccess).toHaveBeenCalledWith(res, null, 'Patient deleted');
    });

    it('throws 404 when patient not found for delete', async () => {
      const req = mockReq({ params: { id: 'missing' } });
      const res = mockRes();
      const next = mockNext();
      const error = new AppError('Patient not found', 404);
      patientService.deletePatient.mockRejectedValue(error);

      await patientController.remove(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
