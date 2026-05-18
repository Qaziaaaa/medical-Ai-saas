'use strict';

/**
 * Unit tests for patientService.
 * MongoDB is mocked via jest.mock so no real DB connection is needed.
 *
 * Validates: Requirements 5.2, 5.3, 5.4, 5.5, 5.6
 */

jest.mock('../../src/models/Patient');

const Patient = require('../../src/models/Patient');
const patientService = require('../../src/services/patientService');
const AppError = require('../../src/utils/AppError');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal valid patient object */
function makePatient(overrides = {}) {
  return {
    _id: 'abc123',
    fullName: 'Jane Doe',
    dateOfBirth: new Date('1990-01-01'),
    gender: 'female',
    contactNumber: '0501234567',
    deletedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

/** Create a chainable Mongoose query mock */
function makeQueryChain(resolvedValue) {
  const chain = {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(resolvedValue),
  };
  return chain;
}

// ─── listPatients ─────────────────────────────────────────────────────────────

describe('listPatients', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns patients and total with default pagination', async () => {
    const patients = [makePatient()];
    Patient.find.mockReturnValue(makeQueryChain(patients));
    Patient.countDocuments.mockResolvedValue(1);

    const result = await patientService.listPatients();

    expect(result.patients).toEqual(patients);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(25);
  });

  it('applies pagination skip correctly', async () => {
    Patient.find.mockReturnValue(makeQueryChain([]));
    Patient.countDocuments.mockResolvedValue(0);

    await patientService.listPatients({ page: 3, limit: 10 });

    const chain = Patient.find.mock.results[0].value;
    expect(chain.skip).toHaveBeenCalledWith(20); // (3-1)*10
    expect(chain.limit).toHaveBeenCalledWith(10);
  });

  it('caps limit at 100', async () => {
    Patient.find.mockReturnValue(makeQueryChain([]));
    Patient.countDocuments.mockResolvedValue(0);

    const result = await patientService.listPatients({ limit: 999 });

    expect(result.limit).toBe(100);
  });

  it('enforces minimum page of 1', async () => {
    Patient.find.mockReturnValue(makeQueryChain([]));
    Patient.countDocuments.mockResolvedValue(0);

    const result = await patientService.listPatients({ page: -5 });

    expect(result.page).toBe(1);
  });

  it('adds $or filter when search is provided', async () => {
    Patient.find.mockReturnValue(makeQueryChain([]));
    Patient.countDocuments.mockResolvedValue(0);

    await patientService.listPatients({ search: 'Jane' });

    const filterArg = Patient.find.mock.calls[0][0];
    expect(filterArg.$or).toBeDefined();
    expect(filterArg.$or).toHaveLength(2);
    // fullName regex should match 'Jane' case-insensitively
    expect(filterArg.$or[0].fullName.test('Jane Doe')).toBe(true);
    expect(filterArg.$or[0].fullName.test('jane doe')).toBe(true);
    expect(filterArg.$or[0].fullName.test('Smith')).toBe(false);
  });

  it('does not add $or filter when search is empty string', async () => {
    Patient.find.mockReturnValue(makeQueryChain([]));
    Patient.countDocuments.mockResolvedValue(0);

    await patientService.listPatients({ search: '' });

    const filterArg = Patient.find.mock.calls[0][0];
    expect(filterArg.$or).toBeUndefined();
  });

  it('always filters out soft-deleted records (deletedAt: null)', async () => {
    Patient.find.mockReturnValue(makeQueryChain([]));
    Patient.countDocuments.mockResolvedValue(0);

    await patientService.listPatients();

    const filterArg = Patient.find.mock.calls[0][0];
    expect(filterArg.deletedAt).toBeNull();
  });

  it('escapes regex special characters in search query', async () => {
    Patient.find.mockReturnValue(makeQueryChain([]));
    Patient.countDocuments.mockResolvedValue(0);

    // Should not throw when search contains regex special chars
    await expect(
      patientService.listPatients({ search: 'test.+*?' })
    ).resolves.not.toThrow();
  });
});

// ─── getPatient ───────────────────────────────────────────────────────────────

describe('getPatient', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns the patient when found and not deleted', async () => {
    const patient = makePatient();
    Patient.findOne.mockResolvedValue(patient);

    const result = await patientService.getPatient('abc123');

    expect(result).toEqual(patient);
    expect(Patient.findOne).toHaveBeenCalledWith({ _id: 'abc123', deletedAt: null });
  });

  it('throws AppError 404 when patient is not found', async () => {
    Patient.findOne.mockResolvedValue(null);

    await expect(patientService.getPatient('nonexistent')).rejects.toMatchObject({
      message: 'Patient not found',
      statusCode: 404,
    });
  });

  it('throws AppError 404 for soft-deleted patients (findOne returns null)', async () => {
    // findOne with { deletedAt: null } filter returns null for deleted patients
    Patient.findOne.mockResolvedValue(null);

    await expect(patientService.getPatient('deleted-id')).rejects.toBeInstanceOf(AppError);
  });
});

// ─── createPatient ────────────────────────────────────────────────────────────

describe('createPatient', () => {
  afterEach(() => jest.clearAllMocks());

  it('creates and returns a new patient', async () => {
    const data = {
      fullName: 'John Smith',
      dateOfBirth: new Date('1985-06-15'),
      gender: 'male',
      contactNumber: '0509876543',
    };
    const created = makePatient({ ...data, _id: 'new123' });
    Patient.create.mockResolvedValue(created);

    const result = await patientService.createPatient(data);

    expect(Patient.create).toHaveBeenCalledWith(data);
    expect(result).toEqual(created);
  });

  it('propagates Mongoose ValidationError when required fields are missing', async () => {
    const validationError = new Error('Validation failed');
    validationError.name = 'ValidationError';
    Patient.create.mockRejectedValue(validationError);

    await expect(patientService.createPatient({})).rejects.toMatchObject({
      name: 'ValidationError',
    });
  });
});

// ─── updatePatient ────────────────────────────────────────────────────────────

describe('updatePatient', () => {
  afterEach(() => jest.clearAllMocks());

  it('updates and returns the patient', async () => {
    const updated = makePatient({ fullName: 'Jane Updated' });
    Patient.findOneAndUpdate.mockResolvedValue(updated);

    const result = await patientService.updatePatient('abc123', { fullName: 'Jane Updated' });

    expect(Patient.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'abc123', deletedAt: null },
      { fullName: 'Jane Updated' },
      { new: true, runValidators: true }
    );
    expect(result).toEqual(updated);
  });

  it('throws AppError 404 when patient not found', async () => {
    Patient.findOneAndUpdate.mockResolvedValue(null);

    await expect(patientService.updatePatient('bad-id', { fullName: 'X' })).rejects.toMatchObject({
      message: 'Patient not found',
      statusCode: 404,
    });
  });

  it('strips deletedAt from the update payload', async () => {
    const updated = makePatient();
    Patient.findOneAndUpdate.mockResolvedValue(updated);

    const data = { fullName: 'Safe', deletedAt: new Date() };
    await patientService.updatePatient('abc123', data);

    const updateArg = Patient.findOneAndUpdate.mock.calls[0][1];
    expect(updateArg.deletedAt).toBeUndefined();
  });
});

// ─── deletePatient ────────────────────────────────────────────────────────────

describe('deletePatient', () => {
  afterEach(() => jest.clearAllMocks());

  it('sets deletedAt to a Date and returns the updated patient', async () => {
    const deleted = makePatient({ deletedAt: new Date() });
    Patient.findOneAndUpdate.mockResolvedValue(deleted);

    const result = await patientService.deletePatient('abc123');

    expect(Patient.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'abc123', deletedAt: null },
      expect.objectContaining({ deletedAt: expect.any(Date) }),
      { new: true }
    );
    expect(result.deletedAt).toBeInstanceOf(Date);
  });

  it('throws AppError 404 when patient not found or already deleted', async () => {
    Patient.findOneAndUpdate.mockResolvedValue(null);

    await expect(patientService.deletePatient('gone')).rejects.toMatchObject({
      message: 'Patient not found',
      statusCode: 404,
    });
  });
});
