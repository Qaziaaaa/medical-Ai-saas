'use strict';

const request = require('supertest');
const { startDatabase, stopDatabase, waitForConnection } = require('./helpers/setup');

let app;

beforeAll(async () => {
  await startDatabase();
  app = require('../../src/app');
  await waitForConnection();
});

afterAll(async () => {
  await stopDatabase();
});

describe('Security — Helmet headers', () => {
  it('sets X-Content-Type-Options: nosniff', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('sets X-Frame-Options: SAMEORIGIN', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('sets X-DNS-Prefetch-Control: off', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-dns-prefetch-control']).toBe('off');
  });

  it('sets X-Download-Options: noopen', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-download-options']).toBe('noopen');
  });

  it('sets X-Permitted-Cross-Domain-Policies: none', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-permitted-cross-domain-policies']).toBe('none');
  });

  it('sets X-XSS-Protection: 0', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-xss-protection']).toBe('0');
  });

  it('sets Referrer-Policy: no-referrer', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
  });

  it('sets Strict-Transport-Security header', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['strict-transport-security']).toBeDefined();
  });

  it('sets Content-Security-Policy header', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['content-security-policy']).toBeDefined();
  });
});

describe('Security — CORS', () => {
  it('allows localhost:5173 origin', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('allows vercel.app subdomains', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://my-app.vercel.app');
    expect(res.headers['access-control-allow-origin']).toBe('https://my-app.vercel.app');
  });

  it('allows requests with no origin', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  it('rejects disallowed origin', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://evil-site.com');
    expect(res.status).toBe(500);
  });

  it('responds to OPTIONS preflight', async () => {
    const res = await request(app)
      .options('/health')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['access-control-allow-methods']).toContain('GET');
  });
});

describe('Security — Body size limits', () => {
  it('rejects JSON payload over 100kb', async () => {
    const largePayload = { data: 'x'.repeat(110 * 1024) };
    const res = await request(app)
      .post('/api/auth/login')
      .send(largePayload);
    expect(res.status).toBe(413);
  });
});

describe('Security — Mongo sanitize', () => {
  it('strips $ operators from request body', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'pass', $where: '1=1' });
    expect(res.status).not.toBe(500);
  });
});

describe('Security — 404 handler', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Route not found');
  });

  it('returns 404 for unknown POST routes', async () => {
    const res = await request(app).post('/api/nonexistent');
    expect(res.status).toBe(404);
  });
});
