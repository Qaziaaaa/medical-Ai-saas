'use strict';

jest.mock('../../src/services/authService');
jest.mock('../../src/utils/apiResponse', () => ({
  sendSuccess: jest.fn(),
}));

const AppError = require('../../src/utils/AppError');
const authService = require('../../src/services/authService');
const authController = require('../../src/controllers/authController');
const { sendSuccess } = require('../../src/utils/apiResponse');

function mockReq(overrides = {}) {
  return { body: {}, params: {}, query: {}, user: {}, ...overrides };
}
function mockRes() { return {}; }
function mockNext() { return jest.fn(); }

describe('authController', () => {
  afterEach(() => jest.clearAllMocks());

  describe('login', () => {
    it('returns token and user on valid credentials', async () => {
      const req = mockReq({ body: { email: 'a@b.com', password: 'secret' } });
      const res = mockRes();
      const next = mockNext();
      authService.login.mockResolvedValue({ token: 'tok', user: { id: '1', email: 'a@b.com' } });

      await authController.login(req, res, next);

      expect(authService.login).toHaveBeenCalledWith('a@b.com', 'secret');
      expect(sendSuccess).toHaveBeenCalledWith(
        res,
        { token: 'tok', user: { id: '1', email: 'a@b.com' } },
        'Login successful'
      );
    });

    it('throws 400 when email is missing', async () => {
      const req = mockReq({ body: { password: 'secret' } });
      const res = mockRes();
      const next = mockNext();

      await authController.login(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].statusCode).toBe(400);
      expect(next.mock.calls[0][0].message).toBe('Email and password are required');
    });

    it('throws 400 when password is missing', async () => {
      const req = mockReq({ body: { email: 'a@b.com' } });
      const res = mockRes();
      const next = mockNext();

      await authController.login(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].statusCode).toBe(400);
    });

    it('throws when authService.login fails', async () => {
      const req = mockReq({ body: { email: 'a@b.com', password: 'wrong' } });
      const res = mockRes();
      const next = mockNext();
      const error = new AppError('Invalid credentials', 401);
      authService.login.mockRejectedValue(error);

      await authController.login(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(sendSuccess).not.toHaveBeenCalled();
    });
  });

  describe('me', () => {
    it('returns user for current authenticated user', async () => {
      const req = mockReq({ user: { id: 'user1' } });
      const res = mockRes();
      const next = mockNext();
      authService.getCurrentUser.mockResolvedValue({ id: 'user1', email: 'a@b.com' });

      await authController.me(req, res, next);

      expect(authService.getCurrentUser).toHaveBeenCalledWith('user1');
      expect(sendSuccess).toHaveBeenCalledWith(res, { user: { id: 'user1', email: 'a@b.com' } }, 'User retrieved successfully');
    });

    it('throws when getCurrentUser fails', async () => {
      const req = mockReq({ user: { id: 'bad' } });
      const res = mockRes();
      const next = mockNext();
      const error = new AppError('User not found', 404);
      authService.getCurrentUser.mockRejectedValue(error);

      await authController.me(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(sendSuccess).not.toHaveBeenCalled();
    });
  });
});
