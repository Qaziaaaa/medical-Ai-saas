'use strict';

jest.mock('axios');

// Mock form-data to return objects with append/getHeaders
jest.mock('form-data', () => {
  const append = jest.fn();
  const getHeaders = jest.fn().mockReturnValue({ 'content-type': 'multipart/form-data' });
  const constructor = jest.fn().mockImplementation(() => ({ append, getHeaders }));
  // Attach shared refs so tests can assert on them
  constructor._append = append;
  constructor._getHeaders = getHeaders;
  return constructor;
});

const axios = require('axios');
const FormData = require('form-data');
const aiPythonService = require('../../src/services/aiPythonService');

function makeAxiosError(status, detail) {
  const err = new Error(detail || 'Request failed');
  err.response = {
    status: status || 503,
    data: { detail: detail || 'Service unavailable' },
  };
  return err;
}

describe('callPython', () => {
  afterEach(() => jest.clearAllMocks());

  it('sends POST request and returns response data on success', async () => {
    const responseData = { result: 'ok', data: { triage_level: 'urgent' } };
    axios.mockResolvedValue({ data: responseData });

    const result = await aiPythonService.callPython('/analyze/triage', { symptoms: 'chest pain' }, 'test-jwt');

    expect(result).toEqual(responseData);
    expect(axios).toHaveBeenCalledWith({
      method: 'POST',
      url: 'http://localhost:8000/api/v1/analyze/triage',
      headers: {
        Authorization: 'Bearer test-jwt',
        'Content-Type': 'application/json',
      },
      timeout: 30000,
      data: { symptoms: 'chest pain' },
    });
  });

  it('sends GET request when method is GET', async () => {
    axios.mockResolvedValue({ data: { status: 'ok' } });

    const result = await aiPythonService.callPython('/hello', {}, 'test-jwt', 'GET');

    expect(result).toEqual({ status: 'ok' });
    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: 'http://localhost:8000/api/v1/hello',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-jwt',
        }),
      })
    );
  });

  it('does not send data body for GET requests', async () => {
    axios.mockResolvedValue({ data: {} });

    await aiPythonService.callPython('/hello', { some: 'data' }, 'test-jwt', 'GET');

    const config = axios.mock.calls[0][0];
    expect(config.data).toBeUndefined();
  });

  it('defaults to localhost:8000', async () => {
    axios.mockResolvedValue({ data: {} });

    await aiPythonService.callPython('/health', {}, 'token');

    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'http://localhost:8000/api/v1/health' })
    );
  });

  it('wraps axios error with statusCode from response', async () => {
    axios.mockRejectedValue(makeAxiosError(422, 'Validation error'));

    try {
      await aiPythonService.callPython('/analyze/triage', {}, 'token');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err.message).toBe('Validation error');
      expect(err.statusCode).toBe(422);
      expect(err.isOperational).toBe(true);
      expect(err.pythonDetail).toBeDefined();
    }
  });

  it('falls back to err.message when response has no detail', async () => {
    const err = new Error('Network timeout');
    err.response = { status: 504, data: {} };
    axios.mockRejectedValue(err);

    try {
      await aiPythonService.callPython('/analyze/triage', {}, 'token');
      expect.fail('Should have thrown');
    } catch (caught) {
      expect(caught.message).toBe('Network timeout');
      expect(caught.statusCode).toBe(504);
    }
  });

  it('falls back to 503 when error has no response', async () => {
    const err = new Error('Connection refused');
    axios.mockRejectedValue(err);

    try {
      await aiPythonService.callPython('/analyze/triage', {}, 'token');
      expect.fail('Should have thrown');
    } catch (caught) {
      expect(caught.statusCode).toBe(503);
      expect(caught.message).toBe('Connection refused');
    }
  });

  it('handles error with no message', async () => {
    axios.mockRejectedValue({});

    try {
      await aiPythonService.callPython('/analyze/triage', {}, 'token');
      expect.fail('Should have thrown');
    } catch (caught) {
      expect(caught.message).toBe('Python AI service unavailable');
      expect(caught.statusCode).toBe(503);
    }
  });

  it('reads error.message from response.data if detail is missing', async () => {
    const err = new Error('Overridden');
    err.response = { status: 400, data: { message: 'Bad request from Python' } };
    axios.mockRejectedValue(err);

    try {
      await aiPythonService.callPython('/analyze/triage', {}, 'token');
    } catch (caught) {
      expect(caught.message).toBe('Bad request from Python');
    }
  });

  it('reads error.error from response.data if detail and message are missing', async () => {
    const err = new Error('Overridden');
    err.response = { status: 500, data: { error: 'Internal server error in Python' } };
    axios.mockRejectedValue(err);

    try {
      await aiPythonService.callPython('/analyze/triage', {}, 'token');
    } catch (caught) {
      expect(caught.message).toBe('Internal server error in Python');
    }
  });
});

describe('callPythonWithFile', () => {
  afterEach(() => {
    jest.clearAllMocks();
    FormData._append.mockClear();
  });

  it('sends multipart POST with file buffer and returns response', async () => {
    const responseData = { predictions: ['pneumonia'] };
    axios.post.mockResolvedValue({ data: responseData });

    const file = {
      buffer: Buffer.from('fake-image-data'),
      originalname: 'xray.jpg',
      mimetype: 'image/jpeg',
    };

    const result = await aiPythonService.callPythonWithFile('/analyze/xray', file, 'test-jwt');

    expect(result).toEqual(responseData);
    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/analyze/xray',
      expect.any(Object),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-jwt',
        }),
        timeout: 60000,
      })
    );
  });

  it('appends file to form data', async () => {
    axios.post.mockResolvedValue({ data: {} });

    const file = {
      buffer: Buffer.from('data'),
      originalname: 'scan.png',
      mimetype: 'image/png',
    };

    await aiPythonService.callPythonWithFile('/analyze/xray', file, 'token');

    expect(FormData._append).toHaveBeenCalledWith('file', file.buffer, {
      filename: 'scan.png',
      contentType: 'image/png',
    });
  });

  it('wraps file upload error with statusCode', async () => {
    axios.post.mockRejectedValue(makeAxiosError(413, 'File too large'));

    try {
      await aiPythonService.callPythonWithFile('/analyze/xray', { buffer: Buffer.from('x'), originalname: 'x.jpg', mimetype: 'image/jpeg' }, 'token');
      expect.fail('Should have thrown');
    } catch (caught) {
      expect(caught.statusCode).toBe(413);
      expect(caught.message).toBe('File too large');
    }
  });
});

describe('checkHealth', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns true when Python service responds with status ok', async () => {
    axios.get.mockResolvedValue({ data: { status: 'ok' } });

    const healthy = await aiPythonService.checkHealth('token');
    expect(healthy).toBe(true);
  });

  it('returns true when status is "ok" (string)', async () => {
    axios.get.mockResolvedValue({ data: { status: 'ok' } });

    const healthy = await aiPythonService.checkHealth('token');
    expect(healthy).toBe(true);
  });

  it('returns false when Python service is unreachable', async () => {
    axios.get.mockRejectedValue(new Error('Connection refused'));

    const healthy = await aiPythonService.checkHealth('token');
    expect(healthy).toBe(false);
  });

  it('calls the /health endpoint', async () => {
    axios.get.mockResolvedValue({ data: { status: 'ok' } });

    await aiPythonService.checkHealth('token');
    expect(axios.get).toHaveBeenCalledWith('http://localhost:8000/health', { timeout: 5000 });
  });
});
