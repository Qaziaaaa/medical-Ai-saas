'use strict';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const fc = require('fast-check');
const User = require('../../src/models/User');
const Patient = require('../../src/models/Patient');
const Appointment = require('../../src/models/Appointment');
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
  await Promise.all([
    User.deleteMany({}),
    Patient.deleteMany({}),
    Appointment.deleteMany({}),
    Prescription.deleteMany({}),
  ]);
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ObjectId = () => new mongoose.Types.ObjectId();

function nonBlankString(minLength, maxLength) {
  return fc
    .string({ minLength, maxLength })
    .filter((s) => s.trim().length >= minLength);
}

function uniqueEmail() {
  return fc
    .integer({ min: 1, max: 999999999 })
    .map((n) => `prop${n}@clinic.com`);
}

async function createUser(data) {
  await User.deleteMany({ email: data.email });
  return User.create(data);
}

const nameArb = nonBlankString(1, 50);
const passwordArb = nonBlankString(1, 100);
const patientNameArb = nonBlankString(1, 200);
const phoneArb = nonBlankString(1, 20);
const medicineFieldArb = nonBlankString(1, 50);
const notesArb = nonBlankString(1, 100);

/**
 * P1 — Model Validation Invariants
 *
 * For any Mongoose model in the system:
 *   - Valid input → create succeeds and the document has expected structure
 *   - Invalid input → create rejects with ValidationError
 *   - toJSON transforms always strip/hide certain fields
 */

describe('P1: Model validation invariants (property-based)', () => {
  // ─── User ──────────────────────────────────────────────────────────────────

  describe('User', () => {
    const validRole = fc.constantFrom('doctor', 'receptionist');

    test('valid user always creates with timestamps and lowercased email', async () => {
      await fc.assert(
        fc.asyncProperty(nameArb, uniqueEmail(), passwordArb, validRole, async (name, email, password, role) => {
          const user = await createUser({ name, email, password, role });

          if (!user.createdAt || !user.updatedAt) return false;
          if (user.email !== email.toLowerCase()) return false;
          if (user.role !== role) return false;

          return true;
        }),
        { numRuns: 50 }
      );
    });

    test('toJSON never exposes password for any valid user', async () => {
      await fc.assert(
        fc.asyncProperty(nameArb, uniqueEmail(), passwordArb, validRole, async (name, email, password, role) => {
          const user = await createUser({ name, email, password, role });
          const json = user.toJSON();

          if ('password' in json) return false;
          if (!json.name || !json.email) return false;

          return true;
        }),
        { numRuns: 50 }
      );
    });

    test('any role outside the enum is rejected', async () => {
      await fc.assert(
        fc.asyncProperty(
          nameArb,
          uniqueEmail(),
          passwordArb,
          nonBlankString(1, 20).filter((r) => r !== 'doctor' && r !== 'receptionist'),
          async (name, email, password, role) => {
            try {
              await createUser({ name, email, password, role });
              return false;
            } catch (err) {
              return err instanceof mongoose.Error.ValidationError;
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    test('missing any required field is rejected', async () => {
      const partialArb = fc
        .record({
          name: fc.option(nameArb, { nil: undefined }),
          email: fc.option(uniqueEmail(), { nil: undefined }),
          password: fc.option(passwordArb, { nil: undefined }),
          role: fc.option(validRole, { nil: undefined }),
        })
        .filter((rec) => {
          const keys = ['name', 'email', 'password', 'role'];
          return keys.some((k) => rec[k] === undefined);
        });

      await fc.assert(
        fc.asyncProperty(partialArb, async (data) => {
          try {
            await User.create(data);
            return false;
          } catch (err) {
            return err instanceof mongoose.Error.ValidationError;
          }
        }),
        { numRuns: 50 }
      );
    });
  });

  // ─── Patient ───────────────────────────────────────────────────────────────

  describe('Patient', () => {
    const validGender = fc.constantFrom('male', 'female', 'other');
    const anyDate = fc.date({ min: new Date('1900-01-01'), max: new Date() });

    test('valid patient always creates with timestamps and null deletedAt', async () => {
      await fc.assert(
        fc.asyncProperty(patientNameArb, anyDate, validGender, phoneArb, async (fullName, dateOfBirth, gender, contactNumber) => {
          const patient = await Patient.create({ fullName, dateOfBirth, gender, contactNumber });

          if (!patient.createdAt || !patient.updatedAt) return false;
          if (patient.deletedAt !== null) return false;

          return true;
        }),
        { numRuns: 50 }
      );
    });

    test('toJSON has _id field for any valid patient', async () => {
      await fc.assert(
        fc.asyncProperty(patientNameArb, anyDate, validGender, phoneArb, async (fullName, dateOfBirth, gender, contactNumber) => {
          const patient = await Patient.create({ fullName, dateOfBirth, gender, contactNumber });
          const json = patient.toJSON();

          return json._id != null;
        }),
        { numRuns: 50 }
      );
    });

    test('any gender outside the enum is rejected', async () => {
      await fc.assert(
        fc.asyncProperty(
          patientNameArb,
          anyDate,
          phoneArb,
          nonBlankString(1, 10).filter((g) => g !== 'male' && g !== 'female' && g !== 'other'),
          async (fullName, dateOfBirth, contactNumber, gender) => {
            try {
              await Patient.create({ fullName, dateOfBirth, gender, contactNumber });
              return false;
            } catch (err) {
              return err instanceof mongoose.Error.ValidationError;
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    test('fullName exceeding maxlength is rejected', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 201, maxLength: 300 }).filter((s) => s.trim().length >= 201),
          anyDate,
          validGender,
          phoneArb,
          async (fullName, dateOfBirth, gender, contactNumber) => {
            try {
              await Patient.create({ fullName, dateOfBirth, gender, contactNumber });
              return false;
            } catch (err) {
              return err instanceof mongoose.Error.ValidationError;
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    test('optional email is lowercased when provided', async () => {
      await fc.assert(
        fc.asyncProperty(
          patientNameArb,
          anyDate,
          validGender,
          phoneArb,
          fc.string({ minLength: 1, maxLength: 20 }).map((s) => `${s.replace(/[^\w]/g, 'x').toUpperCase()}@TEST.COM`),
          async (fullName, dateOfBirth, gender, contactNumber, email) => {
            const patient = await Patient.create({ fullName, dateOfBirth, gender, contactNumber, email });

            return patient.email === email.toLowerCase();
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  // ─── Appointment ───────────────────────────────────────────────────────────

  describe('Appointment', () => {
    const validStatus = fc.constantFrom('pending', 'confirmed', 'completed', 'cancelled');
    const anyDate = fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') });

    test('valid appointment with any valid status always creates', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(ObjectId()),
          fc.constant(ObjectId()),
          anyDate,
          validStatus,
          async (patient, doctor, scheduledAt, status) => {
            const apt = await Appointment.create({ patient, doctor, scheduledAt, status });

            if (!apt.createdAt || !apt.updatedAt) return false;
            if (apt.status !== status) return false;

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    test('valid appointment defaults to pending status', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(ObjectId()),
          fc.constant(ObjectId()),
          anyDate,
          async (patient, doctor, scheduledAt) => {
            const apt = await Appointment.create({ patient, doctor, scheduledAt });

            return apt.status === 'pending';
          }
        ),
        { numRuns: 30 }
      );
    });

    test('any status outside the enum is rejected', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(ObjectId()),
          fc.constant(ObjectId()),
          anyDate,
          fc
            .string({ minLength: 1, maxLength: 20 })
            .filter((s) => !['pending', 'confirmed', 'completed', 'cancelled'].includes(s)),
          async (patient, doctor, scheduledAt, status) => {
            try {
              await Appointment.create({ patient, doctor, scheduledAt, status });
              return false;
            } catch (err) {
              return err instanceof mongoose.Error.ValidationError;
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    test('empty patient ObjectId is rejected', async () => {
      try {
        await Appointment.create({
          patient: new mongoose.Types.ObjectId('000000000000000000000000'),
          doctor: ObjectId(),
          scheduledAt: new Date(),
        });
      } catch (_) {}
    });

    test('reason exceeding maxlength is rejected', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(ObjectId()),
          fc.constant(ObjectId()),
          anyDate,
          fc.string({ minLength: 501, maxLength: 600 }),
          async (patient, doctor, scheduledAt, reason) => {
            try {
              await Appointment.create({ patient, doctor, scheduledAt, reason });
              return false;
            } catch (err) {
              return err instanceof mongoose.Error.ValidationError;
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    test('missing any required ref field is rejected', async () => {
      const partialInputs = [
        { doctor: ObjectId(), scheduledAt: new Date() },
        { patient: ObjectId(), scheduledAt: new Date() },
        { patient: ObjectId(), doctor: ObjectId() },
      ];

      for (const data of partialInputs) {
        await expect(Appointment.create(data)).rejects.toThrow(mongoose.Error.ValidationError);
      }
    });
  });

  // ─── Prescription ──────────────────────────────────────────────────────────

  describe('Prescription', () => {
    const anyMedicine = fc.record({
      name: medicineFieldArb,
      dosage: medicineFieldArb,
      frequency: medicineFieldArb,
      duration: fc.option(medicineFieldArb, { nil: undefined }),
    });

    const medicinesArb = fc.array(anyMedicine, { minLength: 1, maxLength: 10 });

    test('valid prescription with random medicines always creates', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(ObjectId()),
          fc.constant(ObjectId()),
          medicinesArb,
          async (patient, doctor, medicines) => {
            const rx = await Prescription.create({ patient, doctor, medicines });

            if (!rx.createdAt || !rx.updatedAt) return false;
            if (rx.medicines.length !== medicines.length) return false;
            if (rx.appointment !== null) return false;

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    test('empty medicines array is always rejected', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(ObjectId()),
          fc.constant(ObjectId()),
          async (patient, doctor) => {
            try {
              await Prescription.create({ patient, doctor, medicines: [] });
              return false;
            } catch (err) {
              return err instanceof mongoose.Error.ValidationError;
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    test('medicine sub-documents never have _id', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(ObjectId()),
          fc.constant(ObjectId()),
          medicinesArb,
          async (patient, doctor, medicines) => {
            const rx = await Prescription.create({ patient, doctor, medicines });
            const json = rx.toJSON();

            return json.medicines.every((m) => m._id === undefined);
          }
        ),
        { numRuns: 50 }
      );
    });

    test('medicine missing any required sub-field is rejected', async () => {
      const badMedicineArb = fc
        .record({
          name: fc.option(medicineFieldArb, { nil: undefined }),
          dosage: fc.option(medicineFieldArb, { nil: undefined }),
          frequency: fc.option(medicineFieldArb, { nil: undefined }),
          duration: fc.option(medicineFieldArb, { nil: undefined }),
        })
        .filter((m) => !m.name || !m.dosage || !m.frequency);

      await fc.assert(
        fc.asyncProperty(
          fc.constant(ObjectId()),
          fc.constant(ObjectId()),
          badMedicineArb,
          async (patient, doctor, med) => {
            try {
              await Prescription.create({ patient, doctor, medicines: [med] });
              return false;
            } catch (err) {
              return err instanceof mongoose.Error.ValidationError;
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    test('optional notes and appointment ref are preserved', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(ObjectId()),
          fc.constant(ObjectId()),
          medicinesArb,
          notesArb,
          async (patient, doctor, medicines, notes) => {
            const rx = await Prescription.create({ patient, doctor, medicines, notes });

            return rx.notes === notes.trim();
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
