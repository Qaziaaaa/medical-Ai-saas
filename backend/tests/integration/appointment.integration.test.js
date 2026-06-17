'use strict';

const request = require('supertest');
const mongoose = require('mongoose');
const {
  startDatabase, stopDatabase, waitForConnection,
  seedUsers, seedPatient, cleanDatabase,
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
  patient = await seedPatient({ fullName: 'Appointment Patient' });
});

afterAll(async () => {
  await cleanDatabase();
  await stopDatabase();
});

describe('Appointment — POST /api/appointments', () => {
  const futureDate = new Date(Date.now() + 86400000 * 2).toISOString();

  it('creates an appointment when receptionist sends valid data', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${recToken}`)
      .send({
        patient: patient._id.toString(),
        doctor: doctor._id.toString(),
        scheduledAt: futureDate,
        reason: 'Routine checkup',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.appointment.status).toBe('pending');
    expect(res.body.data.appointment.reason).toBe('Routine checkup');
  });

  it('returns 403 when a doctor tries to create an appointment', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${docToken}`)
      .send({
        patient: patient._id.toString(),
        doctor: doctor._id.toString(),
        scheduledAt: futureDate,
      })
      .expect(403);
  });

  it('returns 422 when scheduledAt is in the past', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${recToken}`)
      .send({
        patient: patient._id.toString(),
        doctor: doctor._id.toString(),
        scheduledAt: new Date(Date.now() - 86400000).toISOString(),
      })
      .expect(422);
  });

  it('returns 400/422 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${recToken}`)
      .send({})
    // The exact status depends on when Mongoose catches it —
    // could be CastError → 400 or ValidationError → 422
    expect([400, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });
});

describe('Appointment — GET /api/appointments', () => {
  beforeAll(async () => {
    // Create extra patient for filtering tests
    const p2 = await seedPatient({ fullName: 'Second Patient' });
  });

  it('lists appointments', async () => {
    const res = await request(app)
      .get('/api/appointments')
      .set('Authorization', `Bearer ${docToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.appointments)).toBe(true);
    expect(res.body.data.appointments.length).toBeGreaterThanOrEqual(1);
  });

  it('filters by status', async () => {
    const res = await request(app)
      .get('/api/appointments?status=pending')
      .set('Authorization', `Bearer ${docToken}`)
      .expect(200);

    expect(res.body.data.appointments.every(a => a.status === 'pending')).toBe(true);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .get('/api/appointments')
      .expect(401);
  });
});

describe('Appointment — PATCH /api/appointments/:id/status', () => {
  let appointmentId;

  beforeAll(async () => {
    const apt = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${recToken}`)
      .send({
        patient: patient._id.toString(),
        doctor: doctor._id.toString(),
        scheduledAt: new Date(Date.now() + 86400000 * 5).toISOString(),
        reason: 'Status test',
      });
    appointmentId = apt.body.data.appointment._id;
  });

  it('doctor cannot confirm — only receptionist can', async () => {
    const res = await request(app)
      .patch(`/api/appointments/${appointmentId}/status`)
      .set('Authorization', `Bearer ${docToken}`)
      .send({ status: 'confirmed' })
      .expect(403);

    expect(res.body.success).toBe(false);
  });

  it('doctor can complete a confirmed appointment', async () => {
    // Receptionist creates then confirms
    const apt = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${recToken}`)
      .send({
        patient: patient._id.toString(),
        doctor: doctor._id.toString(),
        scheduledAt: new Date(Date.now() + 86400000 * 6).toISOString(),
      });

    await request(app)
      .patch(`/api/appointments/${apt.body.data.appointment._id}/status`)
      .set('Authorization', `Bearer ${recToken}`)
      .send({ status: 'confirmed' });

    const res = await request(app)
      .patch(`/api/appointments/${apt.body.data.appointment._id}/status`)
      .set('Authorization', `Bearer ${docToken}`)
      .send({ status: 'completed' })
      .expect(200);

    expect(res.body.data.appointment.status).toBe('completed');
  });

  it('receptionist can confirm an appointment', async () => {
    const apt = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${recToken}`)
      .send({
        patient: patient._id.toString(),
        doctor: doctor._id.toString(),
        scheduledAt: new Date(Date.now() + 86400000 * 7).toISOString(),
      });

    const res = await request(app)
      .patch(`/api/appointments/${apt.body.data.appointment._id}/status`)
      .set('Authorization', `Bearer ${recToken}`)
      .send({ status: 'confirmed' })
      .expect(200);

    expect(res.body.data.appointment.status).toBe('confirmed');
  });

  it('receptionist cannot complete an appointment', async () => {
    const apt = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${recToken}`)
      .send({
        patient: patient._id.toString(),
        doctor: doctor._id.toString(),
        scheduledAt: new Date(Date.now() + 86400000 * 8).toISOString(),
        status: 'confirmed',
      });

    const res = await request(app)
      .patch(`/api/appointments/${apt.body.data.appointment._id}/status`)
      .set('Authorization', `Bearer ${recToken}`)
      .send({ status: 'completed' })
      .expect(403);
  });

  it('returns 400 for invalid status value', async () => {
    const res = await request(app)
      .patch(`/api/appointments/${appointmentId}/status`)
      .set('Authorization', `Bearer ${docToken}`)
      .send({ status: 'invalid_status' })
      .expect(400);
  });

  it('either role can cancel', async () => {
    const apt = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${recToken}`)
      .send({
        patient: patient._id.toString(),
        doctor: doctor._id.toString(),
        scheduledAt: new Date(Date.now() + 86400000 * 9).toISOString(),
      });

    const res = await request(app)
      .patch(`/api/appointments/${apt.body.data.appointment._id}/status`)
      .set('Authorization', `Bearer ${recToken}`)
      .send({ status: 'cancelled' })
      .expect(200);

    expect(res.body.data.appointment.status).toBe('cancelled');
  });
});
