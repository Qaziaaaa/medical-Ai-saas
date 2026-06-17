'use strict';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Prescription = require('../../src/models/Prescription');

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
  await Prescription.deleteMany({});
});

describe('Prescription model', () => {
  describe('validation', () => {
    it('creates a valid prescription with medicines', async () => {
      const rx = await Prescription.create({
        patient: new mongoose.Types.ObjectId(),
        doctor: new mongoose.Types.ObjectId(),
        medicines: [
          { name: 'Amoxicillin', dosage: '500mg', frequency: '3x daily', duration: '7 days' },
        ],
      });

      expect(rx.medicines).toHaveLength(1);
      expect(rx.medicines[0].name).toBe('Amoxicillin');
      expect(rx.medicines[0].dosage).toBe('500mg');
      expect(rx.medicines[0].frequency).toBe('3x daily');
      expect(rx.medicines[0].duration).toBe('7 days');
      expect(rx.createdAt).toBeDefined();
    });

    it('rejects missing patient', async () => {
      await expect(Prescription.create({
        doctor: new mongoose.Types.ObjectId(),
        medicines: [{ name: 'M', dosage: '10mg', frequency: '1x daily' }],
      })).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('rejects missing doctor', async () => {
      await expect(Prescription.create({
        patient: new mongoose.Types.ObjectId(),
        medicines: [{ name: 'M', dosage: '10mg', frequency: '1x daily' }],
      })).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('rejects missing medicines', async () => {
      await expect(Prescription.create({
        patient: new mongoose.Types.ObjectId(),
        doctor: new mongoose.Types.ObjectId(),
      })).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('rejects empty medicines array', async () => {
      await expect(Prescription.create({
        patient: new mongoose.Types.ObjectId(),
        doctor: new mongoose.Types.ObjectId(),
        medicines: [],
      })).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('rejects medicine missing required sub-fields', async () => {
      await expect(Prescription.create({
        patient: new mongoose.Types.ObjectId(),
        doctor: new mongoose.Types.ObjectId(),
        medicines: [{ dosage: '10mg', frequency: '1x daily' }],
      })).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('rejects medicine missing dosage', async () => {
      await expect(Prescription.create({
        patient: new mongoose.Types.ObjectId(),
        doctor: new mongoose.Types.ObjectId(),
        medicines: [{ name: 'M', frequency: '1x daily' }],
      })).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('rejects medicine missing frequency', async () => {
      await expect(Prescription.create({
        patient: new mongoose.Types.ObjectId(),
        doctor: new mongoose.Types.ObjectId(),
        medicines: [{ name: 'M', dosage: '10mg' }],
      })).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('accepts multiple medicines', async () => {
      const rx = await Prescription.create({
        patient: new mongoose.Types.ObjectId(),
        doctor: new mongoose.Types.ObjectId(),
        medicines: [
          { name: 'Drug A', dosage: '100mg', frequency: '2x daily' },
          { name: 'Drug B', dosage: '50mg', frequency: '1x daily', duration: '5 days' },
        ],
      });

      expect(rx.medicines).toHaveLength(2);
    });

    it('accepts optional appointment ref and notes', async () => {
      const rx = await Prescription.create({
        patient: new mongoose.Types.ObjectId(),
        doctor: new mongoose.Types.ObjectId(),
        appointment: new mongoose.Types.ObjectId(),
        medicines: [{ name: 'M', dosage: '10mg', frequency: '1x daily' }],
        notes: 'Take with food',
      });

      expect(rx.notes).toBe('Take with food');
      expect(rx.appointment).toBeDefined();
    });

    it('defaults appointment to null', async () => {
      const rx = await Prescription.create({
        patient: new mongoose.Types.ObjectId(),
        doctor: new mongoose.Types.ObjectId(),
        medicines: [{ name: 'M', dosage: '10mg', frequency: '1x daily' }],
      });

      expect(rx.appointment).toBeNull();
    });

    it('medicines sub-documents have no _id', async () => {
      const rx = await Prescription.create({
        patient: new mongoose.Types.ObjectId(),
        doctor: new mongoose.Types.ObjectId(),
        medicines: [{ name: 'M', dosage: '10mg', frequency: '1x daily' }],
      });

      const rxJSON = rx.toJSON();
      expect(rxJSON.medicines[0]._id).toBeUndefined();
    });
  });

  describe('indexes', () => {
    it('creates compound index on patient + createdAt descending', async () => {
      const indexes = await Prescription.collection.indexes();
      const found = indexes.some((idx) =>
        idx.key.patient === 1 && idx.key.createdAt === -1
      );
      expect(found).toBe(true);
    });
  });
});
