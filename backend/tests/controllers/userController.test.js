'use strict';

jest.mock('../../src/models/User');
jest.mock('../../src/utils/apiResponse', () => ({
  sendSuccess: jest.fn(),
}));

const User = require('../../src/models/User');
const userController = require('../../src/controllers/userController');
const { sendSuccess } = require('../../src/utils/apiResponse');

function mockReq(overrides = {}) {
  return { body: {}, params: {}, query: {}, user: {}, ...overrides };
}
function mockRes() { return {}; }
function mockNext() { return jest.fn(); }

function makeQueryChain(resolvedValue) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(resolvedValue),
  };
  return chain;
}

describe('userController', () => {
  afterEach(() => jest.clearAllMocks());

  describe('listDoctors', () => {
    it('returns list of doctors', async () => {
      const req = mockReq();
      const res = mockRes();
      const next = mockNext();
      const doctors = [{ _id: 'doc1', name: 'Dr. Smith', email: 'smith@c.com', role: 'doctor' }];
      User.find.mockReturnValue(makeQueryChain(doctors));

      await userController.listDoctors(req, res, next);

      expect(User.find).toHaveBeenCalledWith({ role: 'doctor' });
      expect(sendSuccess).toHaveBeenCalledWith(res, { doctors }, 'Doctors retrieved successfully');
    });

    it('throws when User.find fails', async () => {
      const req = mockReq();
      const res = mockRes();
      const next = mockNext();
      User.find.mockReturnValue(makeQueryChain(null));
      // Make lean() reject
      User.find().lean.mockRejectedValue(new Error('DB error'));

      await userController.listDoctors(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(sendSuccess).not.toHaveBeenCalled();
    });

    it('returns empty array when no doctors', async () => {
      const req = mockReq();
      const res = mockRes();
      const next = mockNext();
      User.find.mockReturnValue(makeQueryChain([]));

      await userController.listDoctors(req, res, next);

      expect(sendSuccess).toHaveBeenCalledWith(res, { doctors: [] }, 'Doctors retrieved successfully');
    });
  });
});
