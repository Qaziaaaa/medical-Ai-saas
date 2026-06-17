'use strict';

const request = require('supertest');
const {
  startDatabase, stopDatabase, waitForConnection,
  seedUsers, cleanDatabase,
} = require('./helpers/setup');

let app;

beforeAll(async () => {
  await startDatabase();
  app = require('../../src/app');
  await waitForConnection();
  await seedUsers();
});

afterAll(async () => {
  await cleanDatabase();
  await stopDatabase();
});

describe('Auth — POST /api/auth/login', () => {
  it('logs in a doctor with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'doctor@test.com', password: 'Password@123' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('doctor@test.com');
    expect(res.body.data.user.role).toBe('doctor');
  });

  it('logs in a receptionist with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'receptionist@test.com', password: 'Password@123' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('receptionist');
  });

  it('returns 401 for invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@test.com', password: 'Password@123' })
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid/i);
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'doctor@test.com', password: 'wrong-password' })
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid/i);
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'Password@123' })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'doctor@test.com' })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('never exposes the password hash in response', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'doctor@test.com', password: 'Password@123' })
      .expect(200);

    expect(res.body.data.user.password).toBeUndefined();
  });
});

describe('Auth — GET /api/auth/me', () => {
  it('returns the authenticated user', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'doctor@test.com', password: 'Password@123' });

    const token = loginRes.body.data.token;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('doctor@test.com');
  });

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .expect(401);

    expect(res.body.success).toBe(false);
  });

  it('returns 401 with a malformed token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer bad-token')
      .expect(401);

    expect(res.body.success).toBe(false);
  });

  it('returns 401 with an expired token', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'doctor@test.com', password: 'Password@123' });

    expect(loginRes.body.data.token).toBeDefined();

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMCIsInJvbGUiOiJkb2N0b3IiLCJpYXQiOjE1MTYyMzkwMjIsImV4cCI6MTUxNjI0MDIyMn0.5n5n5n5n5n5n5n5n5n5n5n5n5n5n5n5n5n5n5n5n5n5n5n5n5n5n5n5n5n5n5n5n5n5n5n5n')
      .expect(401);

    expect(res.body.success).toBe(false);
  });
});
