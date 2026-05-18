'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');
const AppError = require('../utils/AppError');

const TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;

const FALLBACK_RESPONSE = {
  isFallback: true,
  possibleConditions: [],
  riskLevel: 'low',
  suggestedTests: [],
  disclaimer: 'AI service is temporarily unavailable. Please consult a medical professional.',
};

function buildPrompt({ symptoms, patientAge, patientGender, medicalHistory }) {
  return `You are a medical AI assistant. Analyze the following patient information and provide a structured assessment.

Patient Information:
- Age: ${patientAge}
- Gender: ${patientGender}
- Symptoms: ${Array.isArray(symptoms) ? symptoms.join(', ') : symptoms}
${medicalHistory ? `- Medical History: ${medicalHistory}` : ''}

Respond ONLY with a valid JSON object in this exact format:
{
  "possibleConditions": ["condition1", "condition2", "condition3"],
  "riskLevel": "low" | "moderate" | "high",
  "suggestedTests": ["test1", "test2"],
  "disclaimer": "This is an AI-generated assessment for informational purposes only. Always consult a qualified medical professional."
}`;
}

async function callGeminiWithTimeout(prompt) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Gemini API timeout')), TIMEOUT_MS)
  );

  const result = await Promise.race([
    model.generateContent(prompt),
    timeoutPromise,
  ]);

  return result;
}

function parseGeminiResponse(result) {
  const text = result.response.text();
  // Extract JSON from response (may be wrapped in markdown code blocks)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in response');

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    isFallback: false,
    possibleConditions: parsed.possibleConditions || [],
    riskLevel: parsed.riskLevel || 'low',
    suggestedTests: parsed.suggestedTests || [],
    disclaimer: parsed.disclaimer || 'Consult a medical professional.',
  };
}

async function checkSymptoms({ symptoms, patientAge, patientGender, medicalHistory }) {
  // Input validation
  if (!symptoms || (Array.isArray(symptoms) && symptoms.length === 0)) {
    throw new AppError('Symptoms are required', 422);
  }
  if (!patientAge) throw new AppError('Patient age is required', 422);
  if (!patientGender) throw new AppError('Patient gender is required', 422);

  const prompt = buildPrompt({ symptoms, patientAge, patientGender, medicalHistory });

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await callGeminiWithTimeout(prompt);
      return parseGeminiResponse(result);
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        console.error('[AIService] All retries exhausted:', err.message);
        return FALLBACK_RESPONSE;
      }
      // Exponential backoff: 1s, 2s
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  return FALLBACK_RESPONSE;
}

module.exports = { checkSymptoms };
