'use strict';

jest.mock('../../src/services/aiService');
jest.mock('../../src/utils/apiResponse', () => ({
  sendSuccess: jest.fn(),
}));

const aiService = require('../../src/services/aiService');
const aiController = require('../../src/controllers/aiController');
const { sendSuccess } = require('../../src/utils/apiResponse');

function mockReq(overrides = {}) {
  return { body: {}, params: {}, query: {}, user: {}, ...overrides };
}
function mockRes() { return {}; }
function mockNext() { return jest.fn(); }

describe('aiController', () => {
  afterEach(() => jest.clearAllMocks());

  describe('checkSymptoms', () => {
    it('returns symptom analysis result', async () => {
      const req = mockReq({
        body: {
          symptoms: 'headache',
          patientAge: 30,
          patientGender: 'male',
          medicalHistory: 'none',
        },
      });
      const res = mockRes();
      const next = mockNext();
      const result = { conditions: [{ name: 'Migraine', probability: 0.8 }] };
      aiService.checkSymptoms.mockResolvedValue(result);

      await aiController.checkSymptoms(req, res, next);

      expect(aiService.checkSymptoms).toHaveBeenCalledWith({
        symptoms: 'headache',
        patientAge: 30,
        patientGender: 'male',
        medicalHistory: 'none',
      });
      expect(sendSuccess).toHaveBeenCalledWith(res, result, 'Symptom analysis complete');
    });

    it('throws when service fails', async () => {
      const req = mockReq({ body: { symptoms: 'headache' } });
      const res = mockRes();
      const next = mockNext();
      const error = new Error('GROQ API error');
      aiService.checkSymptoms.mockRejectedValue(error);

      await aiController.checkSymptoms(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(sendSuccess).not.toHaveBeenCalled();
    });
  });
});
