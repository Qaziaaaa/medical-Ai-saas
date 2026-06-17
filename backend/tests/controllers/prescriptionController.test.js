'use strict';

jest.mock('../../src/services/prescriptionService');
jest.mock('../../src/utils/pdfGenerator', () => ({
  generatePrescriptionPDF: jest.fn(),
}));
jest.mock('../../src/utils/apiResponse', () => ({
  sendSuccess: jest.fn(),
}));

const AppError = require('../../src/utils/AppError');
const prescriptionService = require('../../src/services/prescriptionService');
const { generatePrescriptionPDF } = require('../../src/utils/pdfGenerator');
const prescriptionController = require('../../src/controllers/prescriptionController');
const { sendSuccess } = require('../../src/utils/apiResponse');

function mockReq(overrides = {}) {
  return { body: {}, params: {}, query: {}, user: {}, ...overrides };
}
function mockRes() { return {}; }
function mockNext() { return jest.fn(); }

describe('prescriptionController', () => {
  afterEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('returns prescriptions filtered by patientId', async () => {
      const req = mockReq({ query: { patientId: 'pat1', page: '1', limit: '10' } });
      const res = mockRes();
      const next = mockNext();
      const result = { prescriptions: [{ _id: 'rx1' }], total: 1, page: 1, limit: 10 };
      prescriptionService.listPrescriptions.mockResolvedValue(result);

      await prescriptionController.list(req, res, next);

      expect(prescriptionService.listPrescriptions).toHaveBeenCalledWith({ patientId: 'pat1', page: '1', limit: '10' });
      expect(sendSuccess).toHaveBeenCalledWith(res, result, 'Prescriptions retrieved successfully');
    });

    it('throws when service fails', async () => {
      const req = mockReq({ query: {} });
      const res = mockRes();
      const next = mockNext();
      const error = new Error('DB error');
      prescriptionService.listPrescriptions.mockRejectedValue(error);

      await prescriptionController.list(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(sendSuccess).not.toHaveBeenCalled();
    });
  });

  describe('getOne', () => {
    it('returns prescription by ID', async () => {
      const req = mockReq({ params: { id: 'rx1' } });
      const res = mockRes();
      const next = mockNext();
      const prescription = { _id: 'rx1', medicines: [] };
      prescriptionService.getPrescription.mockResolvedValue(prescription);

      await prescriptionController.getOne(req, res, next);

      expect(prescriptionService.getPrescription).toHaveBeenCalledWith('rx1');
      expect(sendSuccess).toHaveBeenCalledWith(res, { prescription }, 'Prescription retrieved successfully');
    });

    it('throws 404 when not found', async () => {
      const req = mockReq({ params: { id: 'missing' } });
      const res = mockRes();
      const next = mockNext();
      const error = new AppError('Prescription not found', 404);
      prescriptionService.getPrescription.mockRejectedValue(error);

      await prescriptionController.getOne(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('create', () => {
    it('returns created prescription with doctor from req.user', async () => {
      const req = mockReq({ body: { patient: 'pat1', medicines: [] }, user: { id: 'doc1' } });
      const res = mockRes();
      const next = mockNext();
      const prescription = { _id: 'rx1', patient: 'pat1', doctor: 'doc1' };
      prescriptionService.createPrescription.mockResolvedValue(prescription);

      await prescriptionController.create(req, res, next);

      expect(prescriptionService.createPrescription).toHaveBeenCalledWith({
        patient: 'pat1', medicines: [], doctor: 'doc1',
      });
      expect(sendSuccess).toHaveBeenCalledWith(res, { prescription }, 'Prescription created successfully', 201);
    });

    it('throws when service fails', async () => {
      const req = mockReq({ body: { patient: 'pat1' }, user: { id: 'doc1' } });
      const res = mockRes();
      const next = mockNext();
      const error = new AppError('Medicines are required', 400);
      prescriptionService.createPrescription.mockRejectedValue(error);

      await prescriptionController.create(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('downloadPDF', () => {
    it('fetches prescription and streams PDF', async () => {
      const req = mockReq({ params: { id: 'rx1' } });
      const res = mockRes();
      const next = mockNext();
      const prescription = { _id: 'rx1', medicines: [] };
      prescriptionService.getPrescription.mockResolvedValue(prescription);

      await prescriptionController.downloadPDF(req, res, next);

      expect(prescriptionService.getPrescription).toHaveBeenCalledWith('rx1');
      expect(generatePrescriptionPDF).toHaveBeenCalledWith(prescription, res);
      expect(sendSuccess).not.toHaveBeenCalled();
    });

    it('throws 404 when prescription not found for PDF', async () => {
      const req = mockReq({ params: { id: 'missing' } });
      const res = mockRes();
      const next = mockNext();
      const error = new AppError('Prescription not found', 404);
      prescriptionService.getPrescription.mockRejectedValue(error);

      await prescriptionController.downloadPDF(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(generatePrescriptionPDF).not.toHaveBeenCalled();
    });
  });
});
