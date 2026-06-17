'use strict';

const request = require('supertest');
const mongoose = require('mongoose');
const {
  startDatabase, stopDatabase, waitForConnection,
  seedUsers, seedPatient, cleanDatabase,
  generateToken,
} = require('./helpers/setup');

let app, doctor, receptionist;
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
});

afterAll(async () => {
  await cleanDatabase();
  await stopDatabase();
});

describe('Patient CRUD — POST /api/patients', () => {
  const validPatient = {
    fullName: 'Jane Smith',
    dateOfBirth: '1985-06-20',
    gender: 'female',
    contactNumber: '+1 555 111 2222',
  };

  it('creates a patient when receptionist sends valid data', async () => {
    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${recToken}`)
      .send(validPatient)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.patient.fullName).toBe('Jane Smith');
    expect(res.body.data.patient._id).toBeDefined();
  });

  it('returns 403 when a doctor tries to create a patient', async () => {
    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${docToken}`)
      .send(validPatient)
      .expect(403);

    expect(res.body.success).toBe(false);
  });

  it('returns 422 for missing required fields', async () => {
    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${recToken}`)
      .send({ fullName: 'Incomplete' })
      .expect(422);

    expect(res.body.success).toBe(false);
  });
});

describe('Patient CRUD — GET /api/patients', () => {
  beforeAll(async () => {
    await seedPatient({ fullName: 'Alice Wonder' });
    await seedPatient({ fullName: 'Bob Builder' });
  });

  it('lists patients for authenticated user', async () => {
    const res = await request(app)
      .get('/api/patients')
      .set('Authorization', `Bearer ${docToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.patients)).toBe(true);
    expect(res.body.data.patients.length).toBeGreaterThanOrEqual(2);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .get('/api/patients')
      .expect(401);

    expect(res.body.success).toBe(false);
  });

  it('supports search query', async () => {
    const res = await request(app)
      .get('/api/patients?search=Alice')
      .set('Authorization', `Bearer ${docToken}`)
      .expect(200);

    expect(res.body.data.patients.every(p => p.fullName.includes('Alice'))).toBe(true);
  });

  it('supports pagination', async () => {
    const res = await request(app)
      .get('/api/patients?page=1&limit=1')
      .set('Authorization', `Bearer ${docToken}`)
      .expect(200);

    expect(res.body.data.patients.length).toBe(1);
    expect(res.body.data.total).toBeGreaterThanOrEqual(2);
  });
});

describe('Patient CRUD — GET /api/patients/:id', () => {
  let patientId;

  beforeAll(async () => {
    const p = await seedPatient({ fullName: 'Specific Patient' });
    patientId = p._id.toString();
  });

  it('returns a patient by ID', async () => {
    const res = await request(app)
      .get(`/api/patients/${patientId}`)
      .set('Authorization', `Bearer ${docToken}`)
      .expect(200);

    expect(res.body.data.patient.fullName).toBe('Specific Patient');
  });

  it('returns 404 for non-existent ID', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/api/patients/${fakeId}`)
      .set('Authorization', `Bearer ${docToken}`)
      .expect(404);

    expect(res.body.success).toBe(false);
  });
});

describe('Patient CRUD — PUT /api/patients/:id', () => {
  let patientId;

  beforeAll(async () => {
    const p = await seedPatient({ fullName: 'Update Me' });
    patientId = p._id.toString();
  });

  it('updates a patient when receptionist sends valid data', async () => {
    const res = await request(app)
      .put(`/api/patients/${patientId}`)
      .set('Authorization', `Bearer ${recToken}`)
      .send({ fullName: 'Updated Name' })
      .expect(200);

    expect(res.body.data.patient.fullName).toBe('Updated Name');
  });

  it('returns 403 when a doctor tries to update', async () => {
    const res = await request(app)
      .put(`/api/patients/${patientId}`)
      .set('Authorization', `Bearer ${docToken}`)
      .send({ fullName: 'Doctor Attempt' })
      .expect(403);
  });
});

describe('Patient CRUD — DELETE /api/patients/:id', () => {
  let patientId;

  beforeAll(async () => {
    const p = await seedPatient({ fullName: 'Delete Me' });
    patientId = p._id.toString();
  });

  it('soft-deletes a patient when receptionist', async () => {
    const res = await request(app)
      .delete(`/api/patients/${patientId}`)
      .set('Authorization', `Bearer ${recToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);

    // Verify soft-deleted — get returns 404
    const getRes = await request(app)
      .get(`/api/patients/${patientId}`)
      .set('Authorization', `Bearer ${docToken}`)
      .expect(404);
  });

  it('returns 403 when a doctor tries to delete', async () => {
    const p = await seedPatient({ fullName: 'Protected' });
    const res = await request(app)
      .delete(`/api/patients/${p._id}`)
      .set('Authorization', `Bearer ${docToken}`)
      .expect(403);
  });
});
