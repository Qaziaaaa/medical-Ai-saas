'use strict';

const request = require('supertest');
const mongoose = require('mongoose');
const {
  startDatabase, stopDatabase, waitForConnection,
  seedUsers, seedPatient, seedAppointment, cleanDatabase,
  generateToken,
} = require('./helpers/setup');

let app, doctor, receptionist, patient;
let docToken, recToken;

beforeAll(async () => {
  await startDatabase();
  app = require('../../src/app');
  await waitForConnection();
  const users = await seedUsers();
  doctor = users.doctor;
  receptionist = users.receptionist;
  docToken = generateToken(doctor);
  recToken = generateToken(receptionist);
  patient = await seedPatient({ fullName: 'Prescription Patient' });
});

afterAll(async () => {
  await cleanDatabase();
  await stopDatabase();
});

describe('Prescription — POST /api/prescriptions', () => {
  it('creates a prescription when doctor sends valid data', async () => {
    const res = await request(app)
      .post('/api/prescriptions')
      .set('Authorization', `Bearer ${docToken}`)
      .send({
        patient: patient._id.toString(),
        medicines: [{ name: 'Amoxicillin', dosage: '500mg', frequency: '3 times daily', duration: '7 days' }],
        notes: 'Take with food',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.prescription.medicines.length).toBe(1);
    expect(res.body.data.prescription.medicines[0].name).toBe('Amoxicillin');
  });

  it('returns 403 when a receptionist tries to create a prescription', async () => {
    const res = await request(app)
      .post('/api/prescriptions')
      .set('Authorization', `Bearer ${recToken}`)
      .send({
        patient: patient._id.toString(),
        medicines: [{ name: 'Ibuprofen', dosage: '200mg', frequency: 'as needed', duration: '5 days' }],
      })
      .expect(403);
  });

  it('returns 422 when medicines array is empty', async () => {
    const res = await request(app)
      .post('/api/prescriptions')
      .set('Authorization', `Bearer ${docToken}`)
      .send({
        patient: patient._id.toString(),
        medicines: [],
      })
      .expect(422);
  });

  it('returns 422 when medicines is missing', async () => {
    const res = await request(app)
      .post('/api/prescriptions')
      .set('Authorization', `Bearer ${docToken}`)
      .send({
        patient: patient._id.toString(),
      })
      .expect(422);
  });
});

describe('Prescription — GET /api/prescriptions', () => {
  beforeAll(async () => {
    // Create another patient to test filtering
    const p2 = await seedPatient({ fullName: 'Another Patient' });
    await request(app)
      .post('/api/prescriptions')
      .set('Authorization', `Bearer ${docToken}`)
      .send({
        patient: p2._id.toString(),
        medicines: [{ name: 'Metformin', dosage: '500mg', frequency: 'twice daily', duration: '30 days' }],
      });
  });

  it('lists prescriptions for authenticated user', async () => {
    const res = await request(app)
      .get('/api/prescriptions')
      .set('Authorization', `Bearer ${docToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.prescriptions)).toBe(true);
    expect(res.body.data.prescriptions.length).toBeGreaterThanOrEqual(1);
  });

  it('filters by patientId', async () => {
    const res = await request(app)
      .get(`/api/prescriptions?patientId=${patient._id}`)
      .set('Authorization', `Bearer ${docToken}`)
      .expect(200);

    expect(res.body.data.prescriptions.every(p => p.patient._id === patient._id.toString() || p.patient === patient._id.toString())).toBe(true);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .get('/api/prescriptions')
      .expect(401);
  });
});

describe('Prescription — GET /api/prescriptions/:id', () => {
  let rxId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/prescriptions')
      .set('Authorization', `Bearer ${docToken}`)
      .send({
        patient: patient._id.toString(),
        medicines: [{ name: 'Lisinopril', dosage: '10mg', frequency: 'once daily', duration: '30 days' }],
      });
    rxId = res.body.data.prescription._id;
  });

  it('returns a prescription by ID', async () => {
    const res = await request(app)
      .get(`/api/prescriptions/${rxId}`)
      .set('Authorization', `Bearer ${docToken}`)
      .expect(200);

    expect(res.body.data.prescription.medicines[0].name).toBe('Lisinopril');
  });

  it('returns 404 for non-existent ID', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/api/prescriptions/${fakeId}`)
      .set('Authorization', `Bearer ${docToken}`)
      .expect(404);
  });
});

describe('Prescription — GET /api/prescriptions/:id/pdf', () => {
  let rxId;

  beforeAll(async () => {
    // Create a prescription with appointment
    const apt = await seedAppointment(patient._id, doctor._id);
    const res = await request(app)
      .post('/api/prescriptions')
      .set('Authorization', `Bearer ${docToken}`)
      .send({
        patient: patient._id.toString(),
        appointment: apt._id.toString(),
        medicines: [
          { name: 'Atorvastatin', dosage: '20mg', frequency: 'once daily', duration: '90 days' },
        ],
      });
    rxId = res.body.data.prescription._id;
  });

  it('downloads a PDF for a valid prescription', async () => {
    const res = await request(app)
      .get(`/api/prescriptions/${rxId}/pdf`)
      .set('Authorization', `Bearer ${docToken}`)
      .expect(200);

    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect(res.body.length).toBeGreaterThan(1000);
  });

  it('returns 404 for non-existent prescription PDF', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/api/prescriptions/${fakeId}/pdf`)
      .set('Authorization', `Bearer ${docToken}`)
      .expect(404);
  });
});
