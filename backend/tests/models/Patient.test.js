'use strict';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Patient = require('../../src/models/Patient');

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
  await Patient.deleteMany({});
});

describe('Patient model', () => {
  describe('validation', () => {
    it('creates a valid patient', async () => {
      const patient = await Patient.create({
        fullName: 'Jane Doe',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'female',
        contactNumber: '0501234567',
      });

      expect(patient.fullName).toBe('Jane Doe');
      expect(patient.gender).toBe('female');
      expect(patient.deletedAt).toBeNull();
      expect(patient.createdAt).toBeDefined();
    });

    it('rejects missing fullName', async () => {
      await expect(Patient.create({
        dateOfBirth: new Date(),
        gender: 'male',
        contactNumber: '0500000000',
      })).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('rejects missing dateOfBirth', async () => {
      await expect(Patient.create({
        fullName: 'No DOB',
        gender: 'male',
        contactNumber: '0500000000',
      })).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('rejects missing gender', async () => {
      await expect(Patient.create({
        fullName: 'No Gender',
        dateOfBirth: new Date(),
        contactNumber: '0500000000',
      })).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('rejects invalid gender', async () => {
      await expect(Patient.create({
        fullName: 'Bad Gender',
        dateOfBirth: new Date(),
        gender: 'alien',
        contactNumber: '0500000000',
      })).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('rejects missing contactNumber', async () => {
      await expect(Patient.create({
        fullName: 'No Phone',
        dateOfBirth: new Date(),
        gender: 'female',
      })).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('rejects fullName exceeding maxlength', async () => {
      await expect(Patient.create({
        fullName: 'A'.repeat(201),
        dateOfBirth: new Date(),
        gender: 'other',
        contactNumber: '0500000000',
      })).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('creates patient with optional fields', async () => {
      const patient = await Patient.create({
        fullName: 'Optional Patient',
        dateOfBirth: new Date('1985-05-15'),
        gender: 'male',
        contactNumber: '0509999999',
        email: 'pat@c.com',
        address: '123 Main St',
        medicalHistory: 'None',
      });

      expect(patient.email).toBe('pat@c.com');
      expect(patient.address).toBe('123 Main St');
      expect(patient.medicalHistory).toBe('None');
    });

    it('lowercases email', async () => {
      const patient = await Patient.create({
        fullName: 'Email Case',
        dateOfBirth: new Date(),
        gender: 'female',
        contactNumber: '0501111111',
        email: 'UPPER@C.COM',
      });
      expect(patient.email).toBe('upper@c.com');
    });
  });

  describe('soft-delete', () => {
    it('defaults deletedAt to null', async () => {
      const patient = await Patient.create({
        fullName: 'Active Patient',
        dateOfBirth: new Date(),
        gender: 'male',
        contactNumber: '0502222222',
      });

      expect(patient.deletedAt).toBeNull();
    });

    it('can set deletedAt for soft-delete', async () => {
      const patient = await Patient.create({
        fullName: 'To Delete',
        dateOfBirth: new Date(),
        gender: 'female',
        contactNumber: '0503333333',
      });

      patient.deletedAt = new Date();
      await patient.save();
      expect(patient.deletedAt).toBeInstanceOf(Date);
    });
  });
});
