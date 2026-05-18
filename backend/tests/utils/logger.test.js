'use strict';

describe('logger utility', () => {
  let logger;

  beforeEach(() => {
    // Clear module cache so NODE_ENV changes take effect
    jest.resetModules();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('development mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      logger = require('../../src/utils/logger');
    });

    it('info() calls console.log', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      logger.info('test info message');
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0]).toContain('test info message');
    });

    it('warn() calls console.warn', () => {
      const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      logger.warn('test warn message');
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0]).toContain('test warn message');
    });

    it('error() calls console.error', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      logger.error('test error message');
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0]).toContain('test error message');
    });

    it('output contains a timestamp in ISO format', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      logger.info('timestamp check');
      const output = spy.mock.calls[0][0];
      // ISO timestamp pattern: 2024-01-01T00:00:00.000Z
      expect(output).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('output contains the level label', () => {
      const infoSpy  = jest.spyOn(console, 'log').mockImplementation(() => {});
      const warnSpy  = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      logger.info('msg');
      logger.warn('msg');
      logger.error('msg');

      expect(infoSpy.mock.calls[0][0]).toContain('INFO');
      expect(warnSpy.mock.calls[0][0]).toContain('WARN');
      expect(errorSpy.mock.calls[0][0]).toContain('ERROR');
    });
  });

  describe('production mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      logger = require('../../src/utils/logger');
    });

    afterEach(() => {
      process.env.NODE_ENV = 'test';
    });

    it('info() outputs valid JSON', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      logger.info('prod info');
      const raw = spy.mock.calls[0][0];
      expect(() => JSON.parse(raw)).not.toThrow();
      const parsed = JSON.parse(raw);
      expect(parsed.level).toBe('INFO');
      expect(parsed.message).toBe('prod info');
      expect(parsed.timestamp).toBeDefined();
    });

    it('error() outputs valid JSON with level ERROR', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      logger.error('prod error');
      const parsed = JSON.parse(spy.mock.calls[0][0]);
      expect(parsed.level).toBe('ERROR');
      expect(parsed.message).toBe('prod error');
    });

    it('warn() outputs valid JSON with level WARN', () => {
      const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      logger.warn('prod warn');
      const parsed = JSON.parse(spy.mock.calls[0][0]);
      expect(parsed.level).toBe('WARN');
      expect(parsed.message).toBe('prod warn');
    });
  });
});
