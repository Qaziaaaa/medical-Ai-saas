const fc = require('fast-check');
const asyncHandler = require('../../src/utils/asyncHandler');

// Feature: ai-clinic-management-saas, Property 3: Async Handler Error Propagation
// Validates: Requirements 1.5

describe('asyncHandler — unit tests', () => {
  it('calls the wrapped function with req, res, next', async () => {
    const fn = jest.fn().mockResolvedValue(undefined);
    const req = {};
    const res = {};
    const next = jest.fn();

    await asyncHandler(fn)(req, res, next);

    expect(fn).toHaveBeenCalledWith(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards a rejected promise to next()', async () => {
    const error = new Error('boom');
    const fn = jest.fn().mockRejectedValue(error);
    const next = jest.fn();

    await asyncHandler(fn)({}, {}, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('forwards a thrown error inside an async function to next()', async () => {
    const error = new TypeError('bad input');
    const fn = jest.fn(async () => { throw error; });
    const next = jest.fn();

    await asyncHandler(fn)({}, {}, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('does not call next() when the function resolves successfully', async () => {
    const fn = jest.fn(async (req, res) => {
      res.json({ ok: true });
    });
    const res = { json: jest.fn() };
    const next = jest.fn();

    await asyncHandler(fn)({}, res, next);

    expect(next).not.toHaveBeenCalled();
  });
});

describe('asyncHandler — property-based tests (P3)', () => {
  // Property 3: For any async controller that rejects with any error value,
  // asyncHandler SHALL call next() with that exact error object.
  it('P3: always forwards the exact rejection value to next()', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.string().map((msg) => new Error(msg)),
          fc.integer().map((code) => Object.assign(new Error('err'), { statusCode: code })),
          fc.constant(new TypeError('type error')),
        ),
        async (error) => {
          const fn = jest.fn().mockRejectedValue(error);
          const next = jest.fn();

          await asyncHandler(fn)({}, {}, next);

          expect(next).toHaveBeenCalledTimes(1);
          expect(next).toHaveBeenCalledWith(error);

          // Reset mocks between iterations
          fn.mockClear();
          next.mockClear();
        },
      ),
      { numRuns: 100 },
    );
  });
});
