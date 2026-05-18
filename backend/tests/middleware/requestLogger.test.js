'use strict';

const EventEmitter = require('events');

// Mock the logger so we can inspect calls without console noise
jest.mock('../../src/utils/logger', () => ({
  info:  jest.fn(),
  warn:  jest.fn(),
  error: jest.fn(),
}));

const logger        = require('../../src/utils/logger');
const requestLogger = require('../../src/middleware/requestLogger');

/**
 * Creates a minimal mock Express req/res pair.
 */
function makeReqRes({ method = 'GET', url = '/test', statusCode = 200 } = {}) {
  const req = { method, originalUrl: url };

  // res needs to emit 'finish' like a real Express response
  const res = Object.assign(new EventEmitter(), { statusCode });

  return { req, res };
}

describe('requestLogger middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls next()', () => {
    const { req, res } = makeReqRes();
    const next = jest.fn();
    requestLogger(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('logs nothing before the response finishes', () => {
    const { req, res } = makeReqRes();
    requestLogger(req, res, jest.fn());
    expect(logger.info).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs an info message for 2xx responses', () => {
    const { req, res } = makeReqRes({ method: 'GET', url: '/api/patients', statusCode: 200 });
    requestLogger(req, res, jest.fn());
    res.emit('finish');

    expect(logger.info).toHaveBeenCalledTimes(1);
    const msg = logger.info.mock.calls[0][0];
    expect(msg).toContain('[GET]');
    expect(msg).toContain('/api/patients');
    expect(msg).toContain('200');
    expect(msg).toMatch(/\d+ms/);
  });

  it('logs a warn message for 4xx responses', () => {
    const { req, res } = makeReqRes({ method: 'POST', url: '/api/auth/login', statusCode: 401 });
    requestLogger(req, res, jest.fn());
    res.emit('finish');

    expect(logger.warn).toHaveBeenCalledTimes(1);
    const msg = logger.warn.mock.calls[0][0];
    expect(msg).toContain('[POST]');
    expect(msg).toContain('401');
  });

  it('logs an error message for 5xx responses', () => {
    const { req, res } = makeReqRes({ method: 'GET', url: '/api/crash', statusCode: 500 });
    requestLogger(req, res, jest.fn());
    res.emit('finish');

    expect(logger.error).toHaveBeenCalledTimes(1);
    const msg = logger.error.mock.calls[0][0];
    expect(msg).toContain('500');
  });

  it('log message matches format [METHOD] /path statusCode Xms', () => {
    const { req, res } = makeReqRes({ method: 'DELETE', url: '/api/patients/123', statusCode: 204 });
    requestLogger(req, res, jest.fn());
    res.emit('finish');

    const msg = logger.info.mock.calls[0][0];
    expect(msg).toMatch(/^\[DELETE\] \/api\/patients\/123 204 \d+ms$/);
  });

  it('falls back to req.url when req.originalUrl is undefined', () => {
    const req = { method: 'GET', url: '/fallback' };
    const res = Object.assign(new EventEmitter(), { statusCode: 200 });
    requestLogger(req, res, jest.fn());
    res.emit('finish');

    const msg = logger.info.mock.calls[0][0];
    expect(msg).toContain('/fallback');
  });

  it('response time is a non-negative number', () => {
    const { req, res } = makeReqRes({ statusCode: 200 });
    requestLogger(req, res, jest.fn());
    res.emit('finish');

    const msg = logger.info.mock.calls[0][0];
    const match = msg.match(/(\d+)ms/);
    expect(match).not.toBeNull();
    expect(Number(match[1])).toBeGreaterThanOrEqual(0);
  });
});
