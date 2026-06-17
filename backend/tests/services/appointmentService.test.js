'use strict';

jest.mock('../../src/models/Appointment');

const Appointment = require('../../src/models/Appointment');
const appointmentService = require('../../src/services/appointmentService');
const AppError = require('../../src/utils/AppError');

function makeAppointment(overrides = {}) {
  return {
    _id: 'appt123',
    patient: { _id: 'pat1', fullName: 'Jane Doe' },
    doctor: { _id: 'doc1', name: 'Dr. Smith', role: 'doctor' },
    scheduledAt: new Date('2026-07-01T10:00:00Z'),
    status: 'pending',
    reason: 'Routine checkup',
    createdAt: new Date(),
    ...overrides,
    populate: function () { return this; },
    save: function () { return Promise.resolve(this); },
    toObject: function () { return { ...this }; },
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

function mockFindOne(resolvedValue) {
  return { lean: jest.fn().mockResolvedValue(resolvedValue) };
}

function futureDate(daysFromNow = 30) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(10, 0, 0, 0);
  return d;
}

describe('listAppointments', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns appointments with default pagination', async () => {
    const appointments = [makeAppointment()];
    Appointment.find.mockReturnValue(makeQueryChain(appointments));
    Appointment.countDocuments.mockResolvedValue(1);

    const result = await appointmentService.listAppointments();

    expect(result.appointments).toEqual(appointments);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(25);
  });

  it('applies status filter', async () => {
    Appointment.find.mockReturnValue(makeQueryChain([]));
    Appointment.countDocuments.mockResolvedValue(0);

    await appointmentService.listAppointments({ status: 'confirmed' });

    const filterArg = Appointment.find.mock.calls[0][0];
    expect(filterArg.status).toBe('confirmed');
  });

  it('applies doctor filter', async () => {
    Appointment.find.mockReturnValue(makeQueryChain([]));
    Appointment.countDocuments.mockResolvedValue(0);

    await appointmentService.listAppointments({ doctor: 'doc123' });

    const filterArg = Appointment.find.mock.calls[0][0];
    expect(filterArg.doctor).toBe('doc123');
  });

  it('applies patient filter', async () => {
    Appointment.find.mockReturnValue(makeQueryChain([]));
    Appointment.countDocuments.mockResolvedValue(0);

    await appointmentService.listAppointments({ patient: 'pat456' });

    const filterArg = Appointment.find.mock.calls[0][0];
    expect(filterArg.patient).toBe('pat456');
  });

  it('applies date range filter', async () => {
    Appointment.find.mockReturnValue(makeQueryChain([]));
    Appointment.countDocuments.mockResolvedValue(0);

    await appointmentService.listAppointments({
      dateFrom: '2026-06-01',
      dateTo: '2026-06-30',
    });

    const filterArg = Appointment.find.mock.calls[0][0];
    expect(filterArg.scheduledAt).toBeDefined();
    expect(filterArg.scheduledAt.$gte).toBeInstanceOf(Date);
    expect(filterArg.scheduledAt.$lte).toBeInstanceOf(Date);
  });

  it('caps limit at 100', async () => {
    Appointment.find.mockReturnValue(makeQueryChain([]));
    Appointment.countDocuments.mockResolvedValue(0);

    const result = await appointmentService.listAppointments({ limit: 999 });
    expect(result.limit).toBe(100);
  });

  it('enforces minimum page of 1', async () => {
    Appointment.find.mockReturnValue(makeQueryChain([]));
    Appointment.countDocuments.mockResolvedValue(0);

    const result = await appointmentService.listAppointments({ page: -5 });
    expect(result.page).toBe(1);
  });

  it('populates patient and doctor', async () => {
    Appointment.find.mockReturnValue(makeQueryChain([]));
    Appointment.countDocuments.mockResolvedValue(0);

    await appointmentService.listAppointments();

    const chain = Appointment.find.mock.results[0].value;
    expect(chain.populate).toHaveBeenCalledWith('patient', 'fullName');
    expect(chain.populate).toHaveBeenCalledWith('doctor', 'name role');
  });

  it('sorts by scheduledAt ascending', async () => {
    Appointment.find.mockReturnValue(makeQueryChain([]));
    Appointment.countDocuments.mockResolvedValue(0);

    await appointmentService.listAppointments();

    const chain = Appointment.find.mock.results[0].value;
    expect(chain.sort).toHaveBeenCalledWith({ scheduledAt: 1 });
  });
});

describe('getAppointment', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns the appointment when found', async () => {
    const appointment = makeAppointment();
    Appointment.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(appointment),
      }),
    });

    const result = await appointmentService.getAppointment('appt123');
    expect(result).toEqual(appointment);
  });

  it('throws AppError 404 when not found', async () => {
    Appointment.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      }),
    });

    await expect(
      appointmentService.getAppointment('bad-id')
    ).rejects.toMatchObject({
      message: 'Appointment not found',
      statusCode: 404,
    });
  });
});

describe('createAppointment', () => {
  afterEach(() => jest.clearAllMocks());

  it('creates and returns a new appointment', async () => {
    const scheduledAt = futureDate();
    const data = {
      patient: 'pat1',
      doctor: 'doc1',
      scheduledAt: scheduledAt.toISOString(),
      reason: 'Checkup',
    };
    const created = makeAppointment({ ...data, scheduledAt });
    Appointment.findOne.mockReturnValue(mockFindOne(null));
    Appointment.create.mockResolvedValue(created);

    const result = await appointmentService.createAppointment(data);

    expect(result).toEqual(created);
    expect(Appointment.create).toHaveBeenCalledWith({
      ...data,
      status: 'pending',
    });
  });

  it('throws AppError 422 when scheduledAt is in the past', async () => {
    const data = {
      patient: 'pat1',
      doctor: 'doc1',
      scheduledAt: new Date('2020-01-01').toISOString(),
    };

    await expect(
      appointmentService.createAppointment(data)
    ).rejects.toMatchObject({
      message: 'Appointment cannot be scheduled in the past',
      statusCode: 422,
    });
  });

  it('throws AppError 409 when doctor has a scheduling conflict', async () => {
    const scheduledAt = futureDate();
    const conflict = makeAppointment({
      scheduledAt: new Date(scheduledAt.getTime() + 15 * 60 * 1000),
    });
    Appointment.findOne.mockReturnValue(mockFindOne(conflict));

    await expect(
      appointmentService.createAppointment({
        patient: 'pat1',
        doctor: 'doc1',
        scheduledAt: scheduledAt.toISOString(),
      })
    ).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('does not create when there is a conflict', async () => {
    const scheduledAt = futureDate();
    const conflict = makeAppointment({
      scheduledAt: new Date(scheduledAt.getTime() + 10 * 60 * 1000),
    });
    Appointment.findOne.mockReturnValue(mockFindOne(conflict));

    await expect(
      appointmentService.createAppointment({
        patient: 'pat1',
        doctor: 'doc1',
        scheduledAt: scheduledAt.toISOString(),
      })
    ).rejects.toThrow();

    expect(Appointment.create).not.toHaveBeenCalled();
  });

  it('uses default status "pending" when no status provided', async () => {
    const scheduledAt = futureDate();
    Appointment.findOne.mockReturnValue(mockFindOne(null));
    Appointment.create.mockResolvedValue(makeAppointment());

    await appointmentService.createAppointment({
      patient: 'pat1',
      doctor: 'doc1',
      scheduledAt: scheduledAt.toISOString(),
    });

    expect(Appointment.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending' })
    );
  });
});

describe('updateAppointment', () => {
  afterEach(() => jest.clearAllMocks());

  it('updates and returns the appointment', async () => {
    const existing = makeAppointment();
    existing.save = jest.fn().mockResolvedValue(existing);
    Appointment.findById.mockResolvedValue(existing);

    const result = await appointmentService.updateAppointment('appt123', {
      reason: 'Updated reason',
    });

    expect(result.reason).toBe('Updated reason');
    expect(existing.save).toHaveBeenCalled();
  });

  it('throws AppError 404 when not found', async () => {
    Appointment.findById.mockResolvedValue(null);

    await expect(
      appointmentService.updateAppointment('bad-id', { reason: 'X' })
    ).rejects.toMatchObject({
      message: 'Appointment not found',
      statusCode: 404,
    });
  });

  it('validates new scheduledAt is not in the past', async () => {
    const existing = makeAppointment();
    existing.save = jest.fn();
    Appointment.findById.mockResolvedValue(existing);

    await expect(
      appointmentService.updateAppointment('appt123', {
        scheduledAt: new Date('2020-01-01').toISOString(),
      })
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('checks conflict when rescheduling', async () => {
    const existing = makeAppointment();
    existing.save = jest.fn().mockResolvedValue(existing);
    Appointment.findById.mockResolvedValue(existing);
    Appointment.findOne.mockReturnValue(mockFindOne(null));

    const newDate = futureDate(60);
    await appointmentService.updateAppointment('appt123', {
      scheduledAt: newDate.toISOString(),
    });

    expect(Appointment.findOne).toHaveBeenCalled();
  });

  it('excludes current appointment from conflict check', async () => {
    const existing = makeAppointment();
    existing.save = jest.fn().mockResolvedValue(existing);
    Appointment.findById.mockResolvedValue(existing);
    Appointment.findOne.mockReturnValue(mockFindOne(null));

    const newDate = futureDate(60);
    await appointmentService.updateAppointment('appt123', {
      scheduledAt: newDate.toISOString(),
      doctor: 'doc1',
    });

    const conflictFilter = Appointment.findOne.mock.calls[0][0];
    expect(conflictFilter._id).toEqual({ $ne: 'appt123' });
  });
});

describe('updateStatus', () => {
  afterEach(() => jest.clearAllMocks());

  it('updates status when valid', async () => {
    const updated = makeAppointment({ status: 'confirmed' });
    Appointment.findByIdAndUpdate.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(updated),
      }),
    });

    const result = await appointmentService.updateStatus('appt123', 'confirmed', 'receptionist');

    expect(result.status).toBe('confirmed');
    expect(Appointment.findByIdAndUpdate).toHaveBeenCalledWith(
      'appt123',
      { status: 'confirmed' },
      { new: true, runValidators: true }
    );
  });

  it('throws 400 for invalid status', async () => {
    await expect(
      appointmentService.updateStatus('appt123', 'invalid-status', 'doctor')
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 403 when receptionist tries to set completed', async () => {
    await expect(
      appointmentService.updateStatus('appt123', 'completed', 'receptionist')
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws 403 when doctor tries to set confirmed', async () => {
    await expect(
      appointmentService.updateStatus('appt123', 'confirmed', 'doctor')
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('allows receptionist to set confirmed', async () => {
    const updated = makeAppointment({ status: 'confirmed' });
    Appointment.findByIdAndUpdate.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(updated),
      }),
    });

    const result = await appointmentService.updateStatus('appt123', 'confirmed', 'receptionist');
    expect(result.status).toBe('confirmed');
  });

  it('allows doctor to set completed', async () => {
    const updated = makeAppointment({ status: 'completed' });
    Appointment.findByIdAndUpdate.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(updated),
      }),
    });

    const result = await appointmentService.updateStatus('appt123', 'completed', 'doctor');
    expect(result.status).toBe('completed');
  });

  it('allows either role to set cancelled', async () => {
    const updated = makeAppointment({ status: 'cancelled' });
    Appointment.findByIdAndUpdate.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(updated),
      }),
    });

    const docResult = await appointmentService.updateStatus('appt123', 'cancelled', 'doctor');
    expect(docResult.status).toBe('cancelled');

    const recResult = await appointmentService.updateStatus('appt456', 'cancelled', 'receptionist');
    expect(recResult.status).toBe('cancelled');
  });

  it('throws 404 when appointment not found', async () => {
    Appointment.findByIdAndUpdate.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      }),
    });

    await expect(
      appointmentService.updateStatus('bad-id', 'cancelled', 'doctor')
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
