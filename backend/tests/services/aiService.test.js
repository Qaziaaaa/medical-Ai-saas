'use strict';

jest.mock('groq-sdk');

const Groq = require('groq-sdk');
const aiService = require('../../src/services/aiService');
const AppError = require('../../src/utils/AppError');

function makeGroqResponse(content) {
  return {
    choices: [
      {
        message: { content },
      },
    ],
  };
}

const VALID_JSON_RESPONSE = JSON.stringify({
  possibleConditions: ['Common cold', 'Allergic rhinitis'],
  riskLevel: 'low',
  suggestedTests: ['Complete blood count'],
  disclaimer: 'This is an AI-generated assessment for informational purposes only. Always consult a qualified medical professional.',
});

describe('checkSymptoms — validation', () => {
  it('throws 422 when symptoms is empty array', async () => {
    await expect(
      aiService.checkSymptoms({
        symptoms: [],
        patientAge: 30,
        patientGender: 'male',
      })
    ).rejects.toMatchObject({
      message: 'Symptoms are required',
      statusCode: 422,
    });
  });

  it('throws 422 when symptoms is undefined', async () => {
    await expect(
      aiService.checkSymptoms({
        patientAge: 30,
        patientGender: 'male',
      })
    ).rejects.toMatchObject({
      message: 'Symptoms are required',
      statusCode: 422,
    });
  });

  it('throws 422 when patientAge is missing', async () => {
    await expect(
      aiService.checkSymptoms({
        symptoms: 'headache',
        patientGender: 'male',
      })
    ).rejects.toMatchObject({
      message: 'Patient age is required',
      statusCode: 422,
    });
  });

  it('throws 422 when patientGender is missing', async () => {
    await expect(
      aiService.checkSymptoms({
        symptoms: 'headache',
        patientAge: 30,
      })
    ).rejects.toMatchObject({
      message: 'Patient gender is required',
      statusCode: 422,
    });
  });
});

describe('checkSymptoms — success', () => {
  beforeEach(() => {
    const mockCreate = jest.fn().mockResolvedValue(makeGroqResponse(VALID_JSON_RESPONSE));
    Groq.mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns parsed response on success', async () => {
    const result = await aiService.checkSymptoms({
      symptoms: 'cough fever',
      patientAge: 35,
      patientGender: 'male',
      medicalHistory: 'none',
    });

    expect(result.isFallback).toBe(false);
    expect(result.possibleConditions).toEqual(['Common cold', 'Allergic rhinitis']);
    expect(result.riskLevel).toBe('low');
    expect(result.suggestedTests).toEqual(['Complete blood count']);
    expect(result.disclaimer).toBeDefined();
  });

  it('accepts symptoms as an array', async () => {
    const result = await aiService.checkSymptoms({
      symptoms: ['cough', 'fever'],
      patientAge: 25,
      patientGender: 'female',
    });

    expect(result.isFallback).toBe(false);
    expect(result.possibleConditions).toBeDefined();
  });

  it('calls GROQ API with correct model', async () => {
    await aiService.checkSymptoms({
      symptoms: 'headache',
      patientAge: 40,
      patientGender: 'male',
    });

    const mockGroq = Groq.mock.results[0].value;
    expect(mockGroq.chat.completions.create).toHaveBeenCalledWith({
      messages: expect.arrayContaining([
        expect.objectContaining({ role: 'user' }),
      ]),
      model: 'llama-3.3-70b-versatile',
    });
  });

  it('includes medical history in prompt when provided', async () => {
    await aiService.checkSymptoms({
      symptoms: 'dizziness',
      patientAge: 50,
      patientGender: 'female',
      medicalHistory: 'hypertension',
    });

    const mockGroq = Groq.mock.results[0].value;
    const call = mockGroq.chat.completions.create.mock.calls[0][0];
    const prompt = call.messages[0].content;
    expect(prompt).toContain('hypertension');
  });
});

describe('checkSymptoms — retry and fallback', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('returns fallback after all retries exhausted', async () => {
    jest.useFakeTimers();
    const mockCreate = jest.fn().mockRejectedValue(new Error('API timeout'));
    Groq.mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    }));

    const resultPromise = aiService.checkSymptoms({
      symptoms: 'cough',
      patientAge: 30,
      patientGender: 'male',
    });

    // Advance past timeout (15s) + three retry delays (1s, 2s, 4s) = ~22s
    for (let i = 0; i < 30; i++) {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    }

    const result = await resultPromise;

    expect(result.isFallback).toBe(true);
    expect(result.possibleConditions).toEqual([]);
    expect(result.riskLevel).toBe('low');
    expect(result.disclaimer).toContain('AI service is temporarily unavailable');
    // MAX_RETRIES = 2 attempts beyond the initial = 3 total
    expect(mockCreate).toHaveBeenCalledTimes(3);
  });

  it('succeeds on retry after initial failure', async () => {
    jest.useFakeTimers();
    const mockCreate = jest
      .fn()
      .mockRejectedValueOnce(new Error('First attempt failed'))
      .mockResolvedValue(makeGroqResponse(VALID_JSON_RESPONSE));

    Groq.mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    }));

    const resultPromise = aiService.checkSymptoms({
      symptoms: 'cough',
      patientAge: 30,
      patientGender: 'male',
    });

    // Advance past timeout (15s) + first retry delay (1s) = 16s
    for (let i = 0; i < 20; i++) {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    }

    const result = await resultPromise;

    expect(result.isFallback).toBe(false);
    expect(result.possibleConditions).toEqual(['Common cold', 'Allergic rhinitis']);
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });
});

describe('checkSymptoms — malformed response', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('returns fallback when GROQ returns non-JSON content', async () => {
    const mockCreate = jest.fn().mockResolvedValue(makeGroqResponse('Just some text without JSON'));
    Groq.mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    }));

    const resultPromise = aiService.checkSymptoms({
      symptoms: 'cough',
      patientAge: 30,
      patientGender: 'male',
    });

    for (let i = 0; i < 30; i++) {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    }

    const result = await resultPromise;
    expect(result.isFallback).toBe(true);
  });

  it('returns fallback when GROQ returns empty content', async () => {
    const mockCreate = jest.fn().mockResolvedValue(makeGroqResponse(''));
    Groq.mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    }));

    const resultPromise = aiService.checkSymptoms({
      symptoms: 'cough',
      patientAge: 30,
      patientGender: 'male',
    });

    for (let i = 0; i < 30; i++) {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    }

    const result = await resultPromise;
    expect(result.isFallback).toBe(true);
  });

  it('returns fallback when GROQ response has no choices', async () => {
    const mockCreate = jest.fn().mockResolvedValue({ choices: [] });
    Groq.mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    }));

    const resultPromise = aiService.checkSymptoms({
      symptoms: 'cough',
      patientAge: 30,
      patientGender: 'male',
    });

    for (let i = 0; i < 30; i++) {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    }

    const result = await resultPromise;
    expect(result.isFallback).toBe(true);
  });
});

describe('checkSymptoms — timeout', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('returns fallback when GROQ request times out', async () => {
    jest.useFakeTimers();

    const mockCreate = jest.fn().mockReturnValue(new Promise(() => {}));
    Groq.mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    }));

    const resultPromise = aiService.checkSymptoms({
      symptoms: 'cough',
      patientAge: 30,
      patientGender: 'male',
    });

    // Flush all timers in chunks to allow promise microtasks to drain
    for (let i = 0; i < 60; i++) {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    }

    const result = await resultPromise;
    expect(result.isFallback).toBe(true);
  }, 15000);
});
