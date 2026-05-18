const { sendSuccess, sendError } = require('../../src/utils/apiResponse');

// Minimal mock for Express response
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('sendSuccess', () => {
  it('responds with 200 and success envelope by default', () => {
    const res = mockRes();
    sendSuccess(res, { id: 1 });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Success',
      data: { id: 1 },
    });
  });

  it('uses the provided statusCode and message', () => {
    const res = mockRes();
    sendSuccess(res, [], 'Created', 201);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Created',
      data: [],
    });
  });

  it('always sets success: true', () => {
    const res = mockRes();
    sendSuccess(res, null, 'ok', 204);

    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
  });

  it('includes data field even when null', () => {
    const res = mockRes();
    sendSuccess(res, null);

    const body = res.json.mock.calls[0][0];
    expect(body).toHaveProperty('data', null);
  });
});

describe('sendError', () => {
  it('responds with 400 and error envelope by default (no errors key when empty)', () => {
    const res = mockRes();
    sendError(res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Error',
      data: null,
    });
  });

  it('uses the provided statusCode and message', () => {
    const res = mockRes();
    sendError(res, 'Not found', 404);

    expect(res.status).toHaveBeenCalledWith(404);
    const body = res.json.mock.calls[0][0];
    expect(body.message).toBe('Not found');
  });

  it('includes field-level errors when provided', () => {
    const res = mockRes();
    const fieldErrors = [{ field: 'email', message: 'Required' }];
    sendError(res, 'Validation failed', 422, fieldErrors);

    const body = res.json.mock.calls[0][0];
    expect(body.errors).toEqual(fieldErrors);
  });

  it('always sets success: false and data: null', () => {
    const res = mockRes();
    sendError(res, 'Oops', 500);

    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(body.data).toBeNull();
  });

  it('omits the errors key when the errors array is empty', () => {
    const res = mockRes();
    sendError(res, 'Not found', 404, []);

    const body = res.json.mock.calls[0][0];
    expect(body).not.toHaveProperty('errors');
  });

  it('includes the errors key when the errors array is non-empty', () => {
    const res = mockRes();
    const fieldErrors = [{ field: 'name', message: 'Required' }];
    sendError(res, 'Validation failed', 422, fieldErrors);

    const body = res.json.mock.calls[0][0];
    expect(body).toHaveProperty('errors', fieldErrors);
  });
});
