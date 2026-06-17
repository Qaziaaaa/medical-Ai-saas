'use strict';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Appointment = require('../../src/models/Appointment');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Appointment.deleteMany({});
});

describe('Appointment model', () => {
  describe('validation', () => {
    it('creates a valid appointment with default pending status', async () => {
      const apt = await Appointment.create({
        patient: new mongoose.Types.ObjectId(),
        doctor: new mongoose.Types.ObjectId(),
        scheduledAt: new Date('2025-06-01T10:00:00Z'),
      });

      expect(apt.status).toBe('pending');
      expect(apt.createdAt).toBeDefined();
    });

    it('rejects missing patient', async () => {
      await expect(Appointment.create({
        doctor: new mongoose.Types.ObjectId(),
        scheduledAt: new Date(),
      })).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('rejects missing doctor', async () => {
      await expect(Appointment.create({
        patient: new mongoose.Types.ObjectId(),
        scheduledAt: new Date(),
      })).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('rejects missing scheduledAt', async () => {
      await expect(Appointment.create({
        patient: new mongoose.Types.ObjectId(),
        doctor: new mongoose.Types.ObjectId(),
      })).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('rejects invalid status', async () => {
      await expect(Appointment.create({
        patient: new mongoose.Types.ObjectId(),
        doctor: new mongoose.Types.ObjectId(),
        scheduledAt: new Date(),
        status: 'nonexistent',
      })).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('accepts all valid status values', async () => {
      const statuses = ['pending', 'confirmed', 'completed', 'cancelled'];

      for (const status of statuses) {
        const apt = await Appointment.create({
          patient: new mongoose.Types.ObjectId(),
          doctor: new mongoose.Types.ObjectId(),
          scheduledAt: new Date(),
          status,
        });

        expect(apt.status).toBe(status);

        await Appointment.deleteMany({});
      }
    });

    it('rejects reason exceeding maxlength', async () => {
      await expect(Appointment.create({
        patient: new mongoose.Types.ObjectId(),
        doctor: new mongoose.Types.ObjectId(),
        scheduledAt: new Date(),
        reason: 'A'.repeat(501),
      })).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('accepts reason within limit', async () => {
      const apt = await Appointment.create({
        patient: new mongoose.Types.ObjectId(),
        doctor: new mongoose.Types.ObjectId(),
        scheduledAt: new Date(),
        reason: 'Routine checkup',
      });

      expect(apt.reason).toBe('Routine checkup');
    });
  });

  describe('indexes', () => {
    it('creates index on doctor + scheduledAt', async () => {
      const indexes = await Appointment.collection.indexes();
      const found = indexes.some((idx) =>
        idx.key.doctor === 1 && idx.key.scheduledAt === 1
      );
      expect(found).toBe(true);
    });

    it('creates index on status', async () => {
      const indexes = await Appointment.collection.indexes();
      const found = indexes.some((idx) => idx.key.status === 1);
      expect(found).toBe(true);
    });

    it('creates index on patient', async () => {
      const indexes = await Appointment.collection.indexes();
      const found = indexes.some((idx) => idx.key.patient === 1);
      expect(found).toBe(true);
    });
  });
});
