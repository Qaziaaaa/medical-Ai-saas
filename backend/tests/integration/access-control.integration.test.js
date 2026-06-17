'use strict';

const request = require('supertest');
const mongoose = require('mongoose');
const {
  startDatabase, stopDatabase, waitForConnection,
  seedUsers, cleanDatabase,
  generateToken, JWT_SECRET,
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

describe('Access control — unauthenticated requests', () => {
  const protectedRoutes = [
    ['GET', '/api/patients'],
    ['GET', '/api/patients/000000000000000000000000'],
    ['POST', '/api/patients'],
    ['PUT', '/api/patients/000000000000000000000000'],
    ['DELETE', '/api/patients/000000000000000000000000'],
    ['GET', '/api/appointments'],
    ['POST', '/api/appointments'],
    ['PUT', '/api/appointments/000000000000000000000000'],
    ['PATCH', '/api/appointments/000000000000000000000000/status'],
    ['GET', '/api/prescriptions'],
    ['POST', '/api/prescriptions'],
    ['GET', '/api/prescriptions/000000000000000000000000'],
    ['GET', '/api/prescriptions/000000000000000000000000/pdf'],
    ['GET', '/api/dashboard/stats'],
    ['GET', '/api/users/doctors'],
    ['GET', '/api/auth/me'],
  ];

  it.each(protectedRoutes)('returns 401 for %s %s without token', async (method, route) => {
    const res = await request(app)[method.toLowerCase()](route);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('Access control — role enforcement', () => {
  it('returns 403 when doctor tries receptionist-only POST /api/patients', async () => {
    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${docToken}`)
      .send({ fullName: 'Test', dateOfBirth: '1990-01-01', gender: 'male', contactNumber: '+1 555 555' })
      .expect(403);
  });

  it('returns 403 when doctor tries receptionist-only PUT /api/patients/:id', async () => {
    const res = await request(app)
      .put('/api/patients/000000000000000000000000')
      .set('Authorization', `Bearer ${docToken}`)
      .send({ fullName: 'Hack' })
      .expect(403);
  });

  it('returns 403 when doctor tries receptionist-only DELETE /api/patients/:id', async () => {
    const res = await request(app)
      .delete('/api/patients/000000000000000000000000')
      .set('Authorization', `Bearer ${docToken}`)
      .expect(403);
  });

  it('returns 403 when doctor tries receptionist-only POST /api/appointments', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${docToken}`)
      .send({})
      .expect(403);
  });

  it('returns 403 when receptionist tries doctor-only POST /api/prescriptions', async () => {
    const res = await request(app)
      .post('/api/prescriptions')
      .set('Authorization', `Bearer ${recToken}`)
      .send({})
      .expect(403);
  });

  it('allows doctor to access doctor-allowed GET /api/prescriptions', async () => {
    const res = await request(app)
      .get('/api/prescriptions')
      .set('Authorization', `Bearer ${docToken}`)
      .expect(200);
  });

  it('allows receptionist to access shared GET /api/prescriptions', async () => {
    const res = await request(app)
      .get('/api/prescriptions')
      .set('Authorization', `Bearer ${recToken}`)
      .expect(200);
  });

  it('allows both roles to access GET /api/appointments', async () => {
    await request(app)
      .get('/api/appointments')
      .set('Authorization', `Bearer ${docToken}`)
      .expect(200);

    await request(app)
      .get('/api/appointments')
      .set('Authorization', `Bearer ${recToken}`)
      .expect(200);
  });
});

describe('Access control — invalid / malformed tokens', () => {
  it('returns 401 for token signed with wrong secret', async () => {
    const jwt = require('jsonwebtoken');
    const badToken = jwt.sign(
      { id: doctor._id.toString(), role: 'doctor' },
      'wrong-secret-key'
    );

    const res = await request(app)
      .get('/api/patients')
      .set('Authorization', `Bearer ${badToken}`)
      .expect(401);
  });

  it('returns 401 for badly formatted Authorization header', async () => {
    const res = await request(app)
      .get('/api/patients')
      .set('Authorization', 'NotBearer token123')
      .expect(401);
  });

  it('returns 401 for empty token', async () => {
    const res = await request(app)
      .get('/api/patients')
      .set('Authorization', 'Bearer ')
      .expect(401);
  });
});

describe('Access control — unknown routes', () => {
  it('returns 404 JSON for unknown route', async () => {
    const res = await request(app)
      .get('/api/nonexistent')
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not found/i);
  });
});

describe('Access control — health endpoint', () => {
  it('is publicly accessible', async () => {
    const res = await request(app)
      .get('/health')
      .expect(200);

    expect(res.body.status).toBe('ok');
  });
});
