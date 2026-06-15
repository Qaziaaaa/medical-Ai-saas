'use strict';

const Groq = require('groq-sdk');
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

async function callGroqWithTimeout(prompt) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('GROQ API timeout')), TIMEOUT_MS)
  );

  const result = await Promise.race([
    groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
    }),
    timeoutPromise,
  ]);

  return result;
}

function parseGroqResponse(result) {
  const text = result.choices[0]?.message?.content || '';
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
  if (!symptoms || (Array.isArray(symptoms) && symptoms.length === 0)) {
    throw new AppError('Symptoms are required', 422);
  }
  if (!patientAge) throw new AppError('Patient age is required', 422);
  if (!patientGender) throw new AppError('Patient gender is required', 422);

  const prompt = buildPrompt({ symptoms, patientAge, patientGender, medicalHistory });

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await callGroqWithTimeout(prompt);
      return parseGroqResponse(result);
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        console.error('[AIService] All retries exhausted:', err.message);
        return FALLBACK_RESPONSE;
      }
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  return FALLBACK_RESPONSE;
}

module.exports = { checkSymptoms };
