'use strict';

const request = require('supertest');
const mongoose = require('mongoose');
const {
  startDatabase, stopDatabase, waitForConnection,
  seedUsers, seedPatient, seedAppointment, seedPrescription, cleanDatabase,
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

  patient = await seedPatient({ fullName: 'Stats Patient' });

  await seedAppointment(patient._id, doctor._id, {
    scheduledAt: new Date(),
    status: 'pending',
    reason: 'Today visit',
  });
  await seedAppointment(patient._id, doctor._id, {
    scheduledAt: new Date(Date.now() + 86400000),
    status: 'pending',
    reason: 'Future visit',
  });

  await seedPrescription(patient._id, doctor._id);
});

afterAll(async () => {
  await cleanDatabase();
  await stopDatabase();
});

describe('Dashboard — GET /api/dashboard/stats', () => {
  it('returns doctor-specific stats', async () => {
    const res = await request(app)
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${docToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.appointmentsToday).toBe(1);
    expect(res.body.data.totalPatients).toBeGreaterThanOrEqual(1);
    expect(res.body.data.totalPrescriptions).toBeGreaterThanOrEqual(1);
    expect(res.body.data.pendingAppointments).toBeUndefined();
    expect(res.body.message).toMatch(/stats/i);
  });

  it('returns receptionist-specific stats', async () => {
    const res = await request(app)
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${recToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.appointmentsToday).toBe(1);
    expect(res.body.data.totalPatients).toBeGreaterThanOrEqual(1);
    expect(res.body.data.pendingAppointments).toBeGreaterThanOrEqual(1);
    expect(res.body.data.totalPrescriptions).toBeUndefined();
  });

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .get('/api/dashboard/stats')
      .expect(401);

    expect(res.body.success).toBe(false);
  });

  it('returns 401 with a malformed token', async () => {
    const res = await request(app)
      .get('/api/dashboard/stats')
      .set('Authorization', 'Bearer bad-token')
      .expect(401);
  });

  it('returns zero appointmentsToday when none scheduled for this doctor', async () => {
    const User = require('../../src/models/User');
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('Password@123', 4);
    const freshUser = await User.create({
      name: 'Fresh Doctor', email: 'fresh@test.com',
      password: hash, role: 'doctor', credentials: 'MD',
    });
    const token = generateToken(freshUser);

    const res = await request(app)
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.appointmentsToday).toBe(0);
    expect(res.body.data).toHaveProperty('totalPatients');
    expect(res.body.data).toHaveProperty('totalPrescriptions');
    expect(res.body.data).not.toHaveProperty('pendingAppointments');
  });
});
