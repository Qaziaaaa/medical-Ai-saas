'use strict';

jest.mock('../../src/models/Prescription');

const Prescription = require('../../src/models/Prescription');
const prescriptionService = require('../../src/services/prescriptionService');
const AppError = require('../../src/utils/AppError');

function makePrescription(overrides = {}) {
  return {
    _id: 'rx123',
    patient: { _id: 'pat1', fullName: 'Jane Doe' },
    doctor: { _id: 'doc1', name: 'Dr. Smith', credentials: 'MD' },
    medicines: [
      { name: 'Amoxicillin', dosage: '500mg', frequency: '3 times daily', duration: '7 days' },
    ],
    notes: 'Take with food',
    createdAt: new Date(),
    ...overrides,
  };
}

function makeQueryChain(resolvedValue) {
  const populateMock = jest.fn().mockReturnThis();
  const chain = {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    populate: populateMock,
    lean: jest.fn().mockResolvedValue(resolvedValue),
  };
  populateMock.mockReturnValue(chain);
  return chain;
}

describe('createPrescription', () => {
  afterEach(() => jest.clearAllMocks());

  it('creates and returns a prescription when medicines are valid', async () => {
    const data = {
      patient: 'pat1',
      doctor: 'doc1',
      medicines: [
        { name: 'Amoxicillin', dosage: '500mg', frequency: '3 times daily', duration: '7 days' },
      ],
      notes: 'Take with food',
    };
    const created = makePrescription();
    Prescription.create.mockResolvedValue(created);

    const result = await prescriptionService.createPrescription(data);

    expect(result).toEqual(created);
    expect(Prescription.create).toHaveBeenCalledWith(data);
  });

  it('throws AppError 422 when medicines array is empty', async () => {
    const data = {
      patient: 'pat1',
      doctor: 'doc1',
      medicines: [],
    };

    const err = await prescriptionService.createPrescription(data).catch(e => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(422);
    expect(err.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'medicines' }),
      ])
    );
  });

  it('throws AppError 422 when medicines is missing', async () => {
    const data = {
      patient: 'pat1',
      doctor: 'doc1',
    };

    await expect(
      prescriptionService.createPrescription(data)
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('throws AppError 422 when a medicine is missing name', async () => {
    const data = {
      patient: 'pat1',
      doctor: 'doc1',
      medicines: [
        { dosage: '500mg', frequency: 'daily' },
      ],
    };

    const err = await prescriptionService.createPrescription(data).catch(e => e);

    expect(err.statusCode).toBe(422);
    expect(err.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'medicines[0].name' }),
      ])
    );
  });

  it('throws AppError 422 when a medicine is missing dosage', async () => {
    const data = {
      patient: 'pat1',
      doctor: 'doc1',
      medicines: [
        { name: 'Ibuprofen', frequency: 'daily' },
      ],
    };

    const err = await prescriptionService.createPrescription(data).catch(e => e);
    expect(err.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'medicines[0].dosage' }),
      ])
    );
  });

  it('throws AppError 422 when a medicine is missing frequency', async () => {
    const data = {
      patient: 'pat1',
      doctor: 'doc1',
      medicines: [
        { name: 'Ibuprofen', dosage: '400mg' },
      ],
    };

    const err = await prescriptionService.createPrescription(data).catch(e => e);
    expect(err.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'medicines[0].frequency' }),
      ])
    );
  });

  it('validates all medicines in the array', async () => {
    const data = {
      patient: 'pat1',
      doctor: 'doc1',
      medicines: [
        { name: '', dosage: '', frequency: '' },
        { name: 'Valid', dosage: '10mg', frequency: 'daily' },
      ],
    };

    const err = await prescriptionService.createPrescription(data).catch(e => e);

    expect(err.errors.length).toBeGreaterThanOrEqual(3);
    expect(err.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'medicines[0].name' }),
        expect.objectContaining({ field: 'medicines[0].dosage' }),
        expect.objectContaining({ field: 'medicines[0].frequency' }),
      ])
    );
    expect(err.errors).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'medicines[1].name' }),
      ])
    );
  });

  it('accepts medicines without duration', async () => {
    const data = {
      patient: 'pat1',
      doctor: 'doc1',
      medicines: [
        { name: 'Paracetamol', dosage: '500mg', frequency: 'as needed' },
      ],
    };
    Prescription.create.mockResolvedValue(makePrescription());

    await expect(
      prescriptionService.createPrescription(data)
    ).resolves.toBeDefined();
  });

  it('propagates Mongoose errors', async () => {
    const dbError = new Error('Database failure');
    Prescription.create.mockRejectedValue(dbError);

    await expect(
      prescriptionService.createPrescription({
        patient: 'pat1',
        doctor: 'doc1',
        medicines: [{ name: 'X', dosage: '10mg', frequency: 'daily' }],
      })
    ).rejects.toThrow('Database failure');
  });
});

describe('listPrescriptions', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns all prescriptions with default pagination', async () => {
    const prescriptions = [makePrescription()];
    Prescription.find.mockReturnValue(makeQueryChain(prescriptions));
    Prescription.countDocuments.mockResolvedValue(1);

    const result = await prescriptionService.listPrescriptions();

    expect(result.prescriptions).toEqual(prescriptions);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(25);
  });

  it('filters by patientId when provided', async () => {
    Prescription.find.mockReturnValue(makeQueryChain([]));
    Prescription.countDocuments.mockResolvedValue(0);

    await prescriptionService.listPrescriptions({ patientId: 'pat1' });

    const filterArg = Prescription.find.mock.calls[0][0];
    expect(filterArg.patient).toBe('pat1');
  });

  it('does not filter by patient when patientId is omitted', async () => {
    Prescription.find.mockReturnValue(makeQueryChain([]));
    Prescription.countDocuments.mockResolvedValue(0);

    await prescriptionService.listPrescriptions();

    const filterArg = Prescription.find.mock.calls[0][0];
    expect(filterArg.patient).toBeUndefined();
  });

  it('caps limit at 100', async () => {
    Prescription.find.mockReturnValue(makeQueryChain([]));
    Prescription.countDocuments.mockResolvedValue(0);

    const result = await prescriptionService.listPrescriptions({ limit: 999 });
    expect(result.limit).toBe(100);
  });

  it('enforces minimum page of 1', async () => {
    Prescription.find.mockReturnValue(makeQueryChain([]));
    Prescription.countDocuments.mockResolvedValue(0);

    const result = await prescriptionService.listPrescriptions({ page: -5 });
    expect(result.page).toBe(1);
  });

  it('sorts by createdAt descending', async () => {
    Prescription.find.mockReturnValue(makeQueryChain([]));
    Prescription.countDocuments.mockResolvedValue(0);

    await prescriptionService.listPrescriptions();

    const chain = Prescription.find.mock.results[0].value;
    expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
  });

  it('populates patient and doctor', async () => {
    Prescription.find.mockReturnValue(makeQueryChain([]));
    Prescription.countDocuments.mockResolvedValue(0);

    await prescriptionService.listPrescriptions();

    const chain = Prescription.find.mock.results[0].value;
    expect(chain.populate).toHaveBeenCalledWith('patient', 'fullName');
    expect(chain.populate).toHaveBeenCalledWith('doctor', 'name credentials');
  });
});

describe('getPrescription', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns the prescription when found', async () => {
    const prescription = makePrescription();
    Prescription.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(prescription),
      }),
    });

    const result = await prescriptionService.getPrescription('rx123');
    expect(result).toEqual(prescription);
  });

  it('populates patient fully and doctor with name/credentials', async () => {
    const prescription = makePrescription();

    // The source code chains: findById().populate('patient').populate('doctor', 'name credentials')
    // We need a chain where first populate returns a chain for the second populate,
    // and the second populate returns a promise resolving to the prescription
    const secondChain = {
      populate: jest.fn().mockResolvedValue(prescription),
    };
    const firstChain = {
      populate: jest.fn().mockReturnValue(secondChain),
    };
    Prescription.findById.mockReturnValue(firstChain);

    const result = await prescriptionService.getPrescription('rx123');

    expect(result).toEqual(prescription);
    expect(firstChain.populate).toHaveBeenNthCalledWith(1, 'patient');
    expect(secondChain.populate).toHaveBeenNthCalledWith(1, 'doctor', 'name credentials');
  });

  it('throws AppError 404 when not found', async () => {
    Prescription.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      }),
    });

    await expect(
      prescriptionService.getPrescription('bad-id')
    ).rejects.toMatchObject({
      message: 'Prescription not found',
      statusCode: 404,
    });
  });
});
