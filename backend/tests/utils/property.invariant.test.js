'use strict';

const fc = require('fast-check');

const COLORS = { primary: '#1a73e8', dark: '#1a1a2e', muted: '#555555', light: '#f8f9fa', border: '#dee2e6', white: '#ffffff' };

let mockDocInstance;

class MockPDFDocument {
  constructor() {
    this.calls = [];
    this.y = 50;
    this.page = { height: 841.89 };
    mockDocInstance = this;
  }

  fontSize(v) { this.calls.push(['fontSize', v]); return this; }
  font(v) { this.calls.push(['font', v]); return this; }
  fillColor(v) { this.calls.push(['fillColor', v]); return this; }
  text(t, x, y, o) { this.calls.push(['text', t, x ?? this.y, y, o]); this.y = (this.y ?? 50) + 20; return this; }
  moveTo(x, y) { this.calls.push(['moveTo', x, y]); return this; }
  lineTo(x, y) { this.calls.push(['lineTo', x, y]); return this; }
  strokeColor(v) { this.calls.push(['strokeColor', v]); return this; }
  lineWidth(v) { this.calls.push(['lineWidth', v]); return this; }
  stroke() { this.calls.push(['stroke']); return this; }
  rect(x, y, w, h) { this.calls.push(['rect', x, y, w, h]); return this; }
  fill() { this.calls.push(['fill']); return this; }
  pipe(dest) { this.calls.push(['pipe', dest]); return this; }
  end() { this.calls.push(['end']); }
}

jest.mock('pdfkit', () => jest.fn(() => new MockPDFDocument()));

const { generatePrescriptionPDF } = require('../../src/utils/pdfGenerator');

afterEach(() => {
  mockDocInstance = null;
});

function getTexts(doc) {
  return doc.calls.filter(([m]) => m === 'text').map(([, t]) => t);
}

/**
 * P12 — pdfGenerator Invariants
 *
 * For any prescription object:
 *   - HTTP headers are always set (Content-Type, Content-Disposition)
 *   - "AI Clinic" and "Medical Prescription" always appear in output
 *   - Doctor name appears in output when present
 *   - Patient name appears in output when present
 *   - Each medicine's name, dosage, frequency appear in output
 *   - doc.end() is always called
 */
describe('P12: pdfGenerator invariants (property-based)', () => {
  const anyMedicineArb = fc.record({
    name: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
    dosage: fc.string({ minLength: 1, maxLength: 15 }).filter((s) => s.trim().length > 0),
    frequency: fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
    duration: fc.option(
      fc.string({ minLength: 1, maxLength: 15 }).filter((s) => s.trim().length > 0),
      { nil: undefined }
    ),
  });

  const prescriptionArb = fc.record({
    _id: fc.string({ minLength: 3, maxLength: 30 }),
    doctor: fc.record({
      name: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
      credentials: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
    }),
    patient: fc.record({
      fullName: fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0),
      dateOfBirth: fc.option(fc.date({ min: new Date('1920-01-01'), max: new Date('2010-12-31') }), { nil: undefined }),
    }),
    createdAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
    medicines: fc.array(anyMedicineArb, { minLength: 1, maxLength: 10 }),
    notes: fc.option(
      fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
      { nil: undefined }
    ),
  });

  test('always sets HTTP headers', () => {
    fc.assert(
      fc.property(prescriptionArb, (prescription) => {
        mockDocInstance = null;
        const res = { setHeader: jest.fn() };

        generatePrescriptionPDF(prescription, res);

        const contentTypeCalls = res.setHeader.mock.calls.filter(
          ([k]) => k === 'Content-Type'
        );
        const dispositionCalls = res.setHeader.mock.calls.filter(
          ([k]) => k === 'Content-Disposition'
        );

        if (contentTypeCalls.length === 0) return false;
        if (contentTypeCalls[0][1] !== 'application/pdf') return false;
        if (dispositionCalls.length === 0) return false;
        if (!dispositionCalls[0][1].includes(prescription._id)) return false;

        return true;
      }),
      { numRuns: 50 }
    );
  });

  test('always includes AI Clinic and Medical Prescription in text output', () => {
    fc.assert(
      fc.property(prescriptionArb, (prescription) => {
        mockDocInstance = null;
        const res = { setHeader: jest.fn() };

        generatePrescriptionPDF(prescription, res);
        const texts = getTexts(mockDocInstance);

        if (!texts.some((t) => t.includes('AI Clinic'))) return false;
        if (!texts.some((t) => t.includes('Medical Prescription'))) return false;

        return true;
      }),
      { numRuns: 50 }
    );
  });

  test('doctor name appears in text output when present', () => {
    fc.assert(
      fc.property(prescriptionArb, (prescription) => {
        mockDocInstance = null;
        const res = { setHeader: jest.fn() };

        generatePrescriptionPDF(prescription, res);
        const texts = getTexts(mockDocInstance);

        const doctorName = prescription.doctor?.name || 'Unknown';
        return texts.some((t) => t.includes(doctorName));
      }),
      { numRuns: 50 }
    );
  });

  test('patient fullName appears in text output when present', () => {
    fc.assert(
      fc.property(prescriptionArb, (prescription) => {
        mockDocInstance = null;
        const res = { setHeader: jest.fn() };

        generatePrescriptionPDF(prescription, res);
        const texts = getTexts(mockDocInstance);

        const patientName = prescription.patient?.fullName || 'Unknown';
        return texts.some((t) => t.includes(patientName));
      }),
      { numRuns: 50 }
    );
  });

  test('each medicine name, dosage, and frequency appears in output', () => {
    fc.assert(
      fc.property(prescriptionArb, (prescription) => {
        mockDocInstance = null;
        const res = { setHeader: jest.fn() };

        generatePrescriptionPDF(prescription, res);
        const texts = getTexts(mockDocInstance);

        return prescription.medicines.every((med) => {
          const nameOk = texts.some((t) => t.includes(med.name));
          const dosageOk = texts.some((t) => t.includes(med.dosage));
          const freqOk = texts.some((t) => t.includes(med.frequency));
          return nameOk && dosageOk && freqOk;
        });
      }),
      { numRuns: 50 }
    );
  });

  test('doc.end() is always called', () => {
    fc.assert(
      fc.property(prescriptionArb, (prescription) => {
        mockDocInstance = null;
        const res = { setHeader: jest.fn() };

        generatePrescriptionPDF(prescription, res);

        return mockDocInstance.calls.some(([m]) => m === 'end');
      }),
      { numRuns: 50 }
    );
  });

  test('notes text appears in output when provided', () => {
    fc.assert(
      fc.property(prescriptionArb, (prescription) => {
        if (!prescription.notes) return true;

        mockDocInstance = null;
        const res = { setHeader: jest.fn() };

        generatePrescriptionPDF(prescription, res);
        const texts = getTexts(mockDocInstance);

        return texts.some((t) => t.includes(prescription.notes.trim()));
      }),
      { numRuns: 30 }
    );
  });
});
