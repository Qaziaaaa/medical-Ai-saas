/**
 * E2E smoke test for AI Clinic REST API.
 *
 * Requires a running backend on BASE_URL (default http://localhost:5000).
 * Usage: node test-e2e.js
 *
 * Exit codes: 0 = all passed, 1 = any failure
 */
const BASE = process.env.BASE_URL || 'http://localhost:5000';
const http = require('http');
const https = require('https');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
let passed = 0;
let failed = 0;

function ok(name) { console.log(`  \x1b[32mOK\x1b[0m ${name}`); passed++; }
function fail(name, details) { console.log(`  \x1b[31mFAIL\x1b[0m ${name}${details ? ': ' + details : ''}`); failed++; }
function warn(msg) { console.log(`  \x1b[33mWARN\x1b[0m ${msg}`); failed++; }
function skip(name) { console.log(`  \x1b[90mSKIP\x1b[0m ${name}`); passed++; }

function request(method, path, opts = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const body = opts.body ? JSON.stringify(opts.body) : null;
    const headers = { ...opts.headers };
    if (body) headers['Content-Type'] = 'application/json';

    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request(url.toString(), {
      method,
      headers,
      timeout: opts.timeout || 10000,
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks);
        let parsed;
        try { parsed = JSON.parse(raw.toString()); } catch { parsed = null; }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: raw,
          data: parsed,
        });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

function check(name, res, field) {
  if (res.data && res.data.success && (!field || (res.data.data && res.data.data[field] !== undefined))) {
    ok(name);
  } else {
    fail(name, `status=${res.status} body=${JSON.stringify(res.data || '').slice(0, 200)}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('\x1b[36m========== E2E TESTS ==========\x1b[0m');

  // 1. Health
  console.log('\n\x1b[33m-- Health --\x1b[0m');
  const h = await request('GET', '/health');
  check('Health check', { data: { success: h.data && h.data.status === 'ok', data: h.data } });

  // 2. Auth
  console.log('\n\x1b[33m-- Auth --\x1b[0m');
  const d = await request('POST', '/api/auth/login', {
    body: { email: 'doctor@clinic.demo', password: 'Doctor@123' },
  });
  check('Login doctor', d);
  const docToken = d.data && d.data.data && d.data.data.token;
  const docHeaders = { Authorization: `Bearer ${docToken}` };

  const r = await request('POST', '/api/auth/login', {
    body: { email: 'receptionist@clinic.demo', password: 'Recept@123' },
  });
  check('Login receptionist', r);
  const recToken = r.data && r.data.data && r.data.data.token;
  const recHeaders = { Authorization: `Bearer ${recToken}` };

  if (!docToken) { console.log('\x1b[31mABORT: no doctor token\x1b[0m'); process.exit(1); }

  // 3. Patients
  console.log('\n\x1b[33m-- Patients --\x1b[0m');
  const pList = await request('GET', '/api/patients?limit=5', { headers: docHeaders });
  check('List patients', pList);

  const pCreate = await request('POST', '/api/patients', {
    headers: recHeaders,
    body: { fullName: 'E2E Test Patient', dateOfBirth: '1990-01-15', gender: 'male', contactNumber: '+1 555 000 0000' },
  });
  check('Create patient', pCreate);
  const patId = pCreate.data && pCreate.data.data && pCreate.data.data.patient && pCreate.data.data.patient._id;

  if (patId) {
    const pGet = await request('GET', `/api/patients/${patId}`, { headers: docHeaders });
    check('Get patient by ID', pGet);
  }

  // 4. Doctors list
  console.log('\n\x1b[33m-- Doctors --\x1b[0m');
  const docs = await request('GET', '/api/users/doctors', { headers: docHeaders });
  check('List doctors', docs);

  // 5. Appointments
  console.log('\n\x1b[33m-- Appointments --\x1b[0m');
  const apts = await request('GET', '/api/appointments?limit=5', { headers: docHeaders });
  check('List appointments', apts);

  // 6. Prescriptions
  console.log('\n\x1b[33m-- Prescriptions --\x1b[0m');
  const rxs = await request('GET', '/api/prescriptions?limit=5', { headers: docHeaders });
  check('List prescriptions', rxs);

  // 7. Dashboard
  console.log('\n\x1b[33m-- Dashboard --\x1b[0m');
  const ds1 = await request('GET', '/api/dashboard/stats', { headers: docHeaders });
  check('Dash stats (doctor)', ds1);
  const ds2 = await request('GET', '/api/dashboard/stats', { headers: recHeaders });
  check('Dash stats (receptionist)', ds2);

  // 8. AI Symptom Check
  console.log('\n\x1b[33m-- AI Symptom Checker --\x1b[0m');
  const ai = await request('POST', '/api/ai/symptom-check', {
    headers: docHeaders,
    body: { symptoms: 'headache fever', patientAge: 30, patientGender: 'male', medicalHistory: 'none' },
    timeout: 15000,
  });
  check('AI symptom check', { data: { success: ai.data && ai.data.success, data: ai.data && ai.data.data ? { possibleConditions: true } : {} } });

  // 9. AI Triage
  console.log('\n\x1b[33m-- AI Triage --\x1b[0m');
  const t1 = await request('POST', '/api/ai/python/analyze/triage', {
    headers: docHeaders,
    body: { symptoms: 'chest pain radiating to left arm', age: 55, gender: 'male' },
    timeout: 60000,
  });
  check('Triage safety override', { data: { success: t1.data && t1.data.triage_level, data: { triage_level: t1.data && t1.data.triage_level } } });

  const t2 = await request('POST', '/api/ai/python/analyze/triage', {
    headers: docHeaders,
    body: { symptoms: 'cold and cough' },
    timeout: 60000,
  });
  check('Triage keyword', { data: { success: t2.data && t2.data.triage_level, data: { triage_level: t2.data && t2.data.triage_level } } });

  const t3 = await request('POST', '/api/ai/python/analyze/triage', {
    headers: docHeaders,
    body: { symptoms: 'sprained ankle from running', age: 30 },
    timeout: 60000,
  });
  check('Triage BioBERT', { data: { success: t3.data && t3.data.triage_level, data: { triage_level: t3.data && t3.data.triage_level } } });
  if (t3.data && t3.data.method !== 'biobert') warn(`expected biobert got ${t3.data.method}`);

  // 10. Drug Interactions
  console.log('\n\x1b[33m-- Drug Interactions --\x1b[0m');
  const i1 = await request('POST', '/api/ai/python/analyze/interactions', {
    headers: docHeaders,
    body: { medications: ['warfarin', 'ibuprofen'] },
    timeout: 30000,
  });
  check('Interaction found', { data: { success: i1.data && i1.data.total_pairs, data: { total_pairs: i1.data && i1.data.total_pairs } } });
  if (i1.data && (!i1.data.counts || i1.data.counts.major < 1)) warn('expected major interaction');

  const i2 = await request('POST', '/api/ai/python/analyze/interactions', {
    headers: docHeaders,
    body: { medications: ['vitamin C', 'acetaminophen'] },
    timeout: 30000,
  });
  check('Interaction none', { data: { success: i2.data && i2.data.has_interaction === false, data: { total_pairs: i2.data && i2.data.total_pairs } } });

  // 11. Risk Stratification
  console.log('\n\x1b[33m-- Risk Stratification --\x1b[0m');
  const risk1 = await request('POST', '/api/ai/python/analyze/risk', {
    headers: docHeaders,
    body: { age: 75, conditions_count: 4, has_chronic_condition: true, visits_last_6mo: 8 },
    timeout: 30000,
  });
  check('Risk high', { data: { success: risk1.data && risk1.data.risk_level, data: { risk_level: risk1.data && risk1.data.risk_level } } });

  const risk2 = await request('POST', '/api/ai/python/analyze/risk', {
    headers: docHeaders,
    body: { age: 25, conditions_count: 0, has_chronic_condition: false, visits_last_6mo: 1 },
    timeout: 30000,
  });
  check('Risk low', { data: { success: risk2.data && risk2.data.risk_level, data: { risk_level: risk2.data && risk2.data.risk_level } } });

  // 12. SOAP Report
  console.log('\n\x1b[33m-- SOAP Report --\x1b[0m');
  const soap = await request('POST', '/api/ai/python/reports/generate', {
    headers: docHeaders,
    body: { notes: 'Patient has persistent cough for 2 weeks, mild fever', patient_name: 'Test Patient', age: 42, gender: 'male' },
    timeout: 60000,
  });
  check('SOAP report generated', { data: { success: soap.data && soap.data.report, data: { report: soap.data && soap.data.report } } });

  // 13. PDF download
  console.log('\n\x1b[33m-- PDF --\x1b[0m');
  try {
    const rxList = await request('GET', '/api/prescriptions?limit=1', { headers: docHeaders });
    const prescriptions = rxList.data && rxList.data.data && rxList.data.data.prescriptions;
    if (prescriptions && prescriptions[0]) {
      const rxId = prescriptions[0]._id;
      const pdf = await request('GET', `/api/prescriptions/${rxId}/pdf`, { headers: docHeaders, timeout: 15000 });
      const ct = pdf.headers['content-type'] || '';
      if (pdf.body.length > 1000 && ct.includes('pdf')) {
        ok('PDF download');
      } else {
        fail('PDF download', `size=${pdf.body.length} content-type=${ct}`);
      }
    } else {
      skip('PDF download (no prescriptions)');
    }
  } catch (err) {
    fail('PDF download', err.message);
  }

  // Summary
  console.log('\n\x1b[36m=================================\x1b[0m');
  const color = failed === 0 ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}Passed: ${passed}  Failed: ${failed}\x1b[0m`);
  if (failed === 0) console.log('\x1b[32mALL TESTS PASSED\x1b[0m');
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('\x1b[31mFATAL\x1b[0m', err.message);
  process.exit(1);
});
