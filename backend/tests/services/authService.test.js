'use strict';

jest.mock('../../src/models/User');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../src/models/User');
const authService = require('../../src/services/authService');
const AppError = require('../../src/utils/AppError');

const TEST_SECRET = 'test-jwt-secret';

function makeUser(overrides = {}) {
  return {
    _id: 'user123',
    email: 'doctor@clinic.demo',
    password: '$2a$12$hashedpassword',
    role: 'doctor',
    name: 'Dr. Smith',
    ...overrides,
  };
}

function mockFindOne(user) {
  return { select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(user) }) };
}

beforeAll(() => {
  process.env.JWT_SECRET = TEST_SECRET;
  process.env.JWT_EXPIRES_IN = '7d';
});

afterAll(() => {
  delete process.env.JWT_SECRET;
  delete process.env.JWT_EXPIRES_IN;
});

describe('login', () => {
  afterEach(() => {
    jest.clearAllMocks();
    bcrypt.compare.mockRestore ? bcrypt.compare.mockRestore() : null;
  });

  it('returns token and user when credentials are valid', async () => {
    const user = makeUser();
    User.findOne.mockReturnValue(mockFindOne(user));
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

    const result = await authService.login('doctor@clinic.demo', 'Doctor@123');

    expect(result.token).toBeDefined();
    expect(result.user).toBeDefined();
    expect(result.user.password).toBeUndefined();
    expect(result.user.email).toBe('doctor@clinic.demo');

    const decoded = jwt.verify(result.token, TEST_SECRET);
    expect(decoded.id).toBe('user123');
    expect(decoded.role).toBe('doctor');

    expect(User.findOne).toHaveBeenCalledWith({ email: 'doctor@clinic.demo' });
  });

  it('normalizes email to lowercase', async () => {
    User.findOne.mockReturnValue(mockFindOne(null));

    await expect(
      authService.login('DOCTOR@CLINIC.DEMO', 'Doctor@123')
    ).rejects.toThrow(AppError);

    expect(User.findOne).toHaveBeenCalledWith({ email: 'doctor@clinic.demo' });
  });

  it('throws 401 when user is not found', async () => {
    User.findOne.mockReturnValue(mockFindOne(null));

    await expect(
      authService.login('unknown@test.com', 'pass123')
    ).rejects.toMatchObject({
      message: 'Invalid email or password',
      statusCode: 401,
    });
  });

  it('throws 401 when password does not match', async () => {
    const user = makeUser();
    User.findOne.mockReturnValue(mockFindOne(user));
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

    await expect(
      authService.login('doctor@clinic.demo', 'wrongpass')
    ).rejects.toMatchObject({
      message: 'Invalid email or password',
      statusCode: 401,
    });
  });

  it('returns token that expires per JWT_EXPIRES_IN', async () => {
    process.env.JWT_EXPIRES_IN = '1h';
    const user = makeUser();
    User.findOne.mockReturnValue(mockFindOne(user));
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

    const result = await authService.login('doctor@clinic.demo', 'Doctor@123');

    const decoded = jwt.verify(result.token, TEST_SECRET);
    expect(decoded.exp - decoded.iat).toBe(3600);
  });
});

describe('hashPassword', () => {
  it('returns a bcrypt hash', async () => {
    const hash = await authService.hashPassword('myPassword123');
    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
    const isMatch = await bcrypt.compare('myPassword123', hash);
    expect(isMatch).toBe(true);
  });

  it('produces different hashes for the same password', async () => {
    const hash1 = await authService.hashPassword('samepass');
    const hash2 = await authService.hashPassword('samepass');
    expect(hash1).not.toBe(hash2);
  });
});

describe('getCurrentUser', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns the user when found', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);

    const result = await authService.getCurrentUser('user123');

    expect(result).toEqual(user);
    expect(User.findById).toHaveBeenCalledWith('user123');
  });

  it('throws 404 when user is not found', async () => {
    User.findById.mockResolvedValue(null);

    await expect(
      authService.getCurrentUser('nonexistent')
    ).rejects.toMatchObject({
      message: 'User not found',
      statusCode: 404,
    });
  });
});
