'use strict';

const request = require('supertest');
const {
  startDatabase, stopDatabase, waitForConnection,
  seedUsers, cleanDatabase,
  generateToken,
} = require('./helpers/setup');

jest.mock('../../src/services/aiService', () => ({
  checkSymptoms: jest.fn(),
}));

jest.mock('../../src/services/aiPythonService', () => ({
  callPython: jest.fn(),
  callPythonWithFile: jest.fn(),
}));

const aiService = require('../../src/services/aiService');
const aiPythonService = require('../../src/services/aiPythonService');

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

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AI Groq — POST /api/ai/symptom-check', () => {
  const validPayload = {
    symptoms: ['headache', 'fever'],
    patientAge: 30,
    patientGender: 'male',
  };

  it('returns symptom analysis on success', async () => {
    const mockResult = {
      isFallback: false,
      possibleConditions: ['Migraine', 'Common cold'],
      riskLevel: 'low',
      suggestedTests: ['Blood test'],
      disclaimer: 'Consult a doctor.',
    };
    aiService.checkSymptoms.mockResolvedValue(mockResult);

    const res = await request(app)
      .post('/api/ai/symptom-check')
      .set('Authorization', `Bearer ${docToken}`)
      .send(validPayload)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.possibleConditions).toEqual(['Migraine', 'Common cold']);
    expect(res.body.data.riskLevel).toBe('low');
    expect(aiService.checkSymptoms).toHaveBeenCalledWith({
      symptoms: ['headache', 'fever'],
      patientAge: 30,
      patientGender: 'male',
    });
  });

  it('returns 403 for receptionist', async () => {
    const res = await request(app)
      .post('/api/ai/symptom-check')
      .set('Authorization', `Bearer ${recToken}`)
      .send(validPayload)
      .expect(403);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .post('/api/ai/symptom-check')
      .send(validPayload)
      .expect(401);
  });


});

describe('AI Python Proxy — GET /api/ai/python/health', () => {
  it('proxies health check for doctor', async () => {
    aiPythonService.callPython.mockResolvedValue({ status: 'ok' });

    const res = await request(app)
      .get('/api/ai/python/health')
      .set('Authorization', `Bearer ${docToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(aiPythonService.callPython).toHaveBeenCalledWith('/hello', {}, expect.any(String), 'GET');
  });

  it('proxies health check for receptionist', async () => {
    aiPythonService.callPython.mockResolvedValue({ status: 'ok' });

    const res = await request(app)
      .get('/api/ai/python/health')
      .set('Authorization', `Bearer ${recToken}`)
      .expect(200);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .get('/api/ai/python/health')
      .expect(401);
  });
});

describe('AI Python Proxy — POST /api/ai/python/analyze/triage', () => {
  it('proxies triage analysis for doctor', async () => {
    const mockTriage = { triage: 'non-urgent', conditions: ['cold'] };
    aiPythonService.callPython.mockResolvedValue(mockTriage);

    const res = await request(app)
      .post('/api/ai/python/analyze/triage')
      .set('Authorization', `Bearer ${docToken}`)
      .send({ symptoms: 'cough' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(mockTriage);
    expect(aiPythonService.callPython).toHaveBeenCalledWith(
      '/analyze/triage', { symptoms: 'cough' }, expect.any(String)
    );
  });

  it('proxies triage for receptionist', async () => {
    aiPythonService.callPython.mockResolvedValue({ triage: 'urgent' });

    const res = await request(app)
      .post('/api/ai/python/analyze/triage')
      .set('Authorization', `Bearer ${recToken}`)
      .send({ symptoms: 'chest pain' })
      .expect(200);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .post('/api/ai/python/analyze/triage')
      .send({ symptoms: 'cough' })
      .expect(401);
  });
});

describe('AI Python Proxy — POST /api/ai/python/hello', () => {
  it('proxies hello endpoint', async () => {
    aiPythonService.callPython.mockResolvedValue({ message: 'Hello from Python' });

    const res = await request(app)
      .post('/api/ai/python/hello')
      .set('Authorization', `Bearer ${docToken}`)
      .send({ name: 'test' })
      .expect(200);

    expect(res.body.data.message).toBe('Hello from Python');
  });
});

describe('AI Python Proxy — POST /api/ai/python/analyze/interactions', () => {
  it('allows doctor access', async () => {
    aiPythonService.callPython.mockResolvedValue({ interactions: [] });

    const res = await request(app)
      .post('/api/ai/python/analyze/interactions')
      .set('Authorization', `Bearer ${docToken}`)
      .send({ medicines: ['A', 'B'] })
      .expect(200);
  });

  it('blocks receptionist access', async () => {
    const res = await request(app)
      .post('/api/ai/python/analyze/interactions')
      .set('Authorization', `Bearer ${recToken}`)
      .send({ medicines: ['A', 'B'] })
      .expect(403);
  });
});

describe('AI Python Proxy — POST /api/ai/python/analyze/risk', () => {
  it('allows doctor access', async () => {
    aiPythonService.callPython.mockResolvedValue({ risk: 'low' });

    const res = await request(app)
      .post('/api/ai/python/analyze/risk')
      .set('Authorization', `Bearer ${docToken}`)
      .send({ patientId: '123' })
      .expect(200);
  });

  it('blocks receptionist access', async () => {
    const res = await request(app)
      .post('/api/ai/python/analyze/risk')
      .set('Authorization', `Bearer ${recToken}`)
      .send({ patientId: '123' })
      .expect(403);
  });
});

describe('AI Python Proxy — POST /api/ai/python/reports/generate', () => {
  it('allows doctor access', async () => {
    aiPythonService.callPython.mockResolvedValue({ report: 'SOAP report' });

    const res = await request(app)
      .post('/api/ai/python/reports/generate')
      .set('Authorization', `Bearer ${docToken}`)
      .send({ notes: 'Patient has fever' })
      .expect(200);
  });

  it('blocks receptionist access', async () => {
    const res = await request(app)
      .post('/api/ai/python/reports/generate')
      .set('Authorization', `Bearer ${recToken}`)
      .send({ notes: 'test' })
      .expect(403);
  });
});

describe('AI Python Proxy — POST /api/ai/python/analyze/xray', () => {
  it('returns 400 when no file uploaded', async () => {
    const res = await request(app)
      .post('/api/ai/python/analyze/xray')
      .set('Authorization', `Bearer ${docToken}`)
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/no file/i);
  });

  it('blocks receptionist access', async () => {
    const res = await request(app)
      .post('/api/ai/python/analyze/xray')
      .set('Authorization', `Bearer ${recToken}`)
      .expect(403);
  });
});
