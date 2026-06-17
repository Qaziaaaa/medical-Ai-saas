'use strict';

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

function mockRes() {
  return { setHeader: jest.fn() };
}

function makePrescription(overrides = {}) {
  return {
    _id: 'rx123',
    doctor: { name: 'Smith', credentials: 'MD, Cardiology' },
    patient: { fullName: 'Jane Doe', dateOfBirth: new Date('1990-01-01') },
    createdAt: new Date('2025-06-15T10:00:00Z'),
    medicines: [
      { name: 'Amoxicillin', dosage: '500mg', frequency: '3x daily', duration: '7 days' },
    ],
    notes: 'Take with food',
    ...overrides,
  };
}

describe('pdfGenerator', () => {
  let res;

  beforeEach(() => {
    mockDocInstance = null;
    res = mockRes();
  });

  function render(prescription) {
    generatePrescriptionPDF(prescription, res);
    return mockDocInstance;
  }

  function getTexts(doc) {
    return doc.calls.filter(([m]) => m === 'text').map(([, t]) => t);
  }

  describe('HTTP headers', () => {
    it('sets Content-Type to application/pdf', () => {
      render(makePrescription());
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    });

    it('sets Content-Disposition with prescription ID', () => {
      render(makePrescription());
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename=prescription-rx123.pdf'
      );
    });
  });

  describe('PDF structure', () => {
    it('renders clinic name header', () => {
      const doc = render(makePrescription());
      expect(getTexts(doc)).toContain('AI Clinic');
    });

    it('renders subtitle Medical Prescription', () => {
      const doc = render(makePrescription());
      expect(getTexts(doc)).toContain('Medical Prescription');
    });

    it('renders prescribing physician name', () => {
      const doc = render(makePrescription());
      expect(getTexts(doc)).toContain('Dr. Smith');
    });

    it('renders doctor credentials', () => {
      const doc = render(makePrescription());
      expect(getTexts(doc)).toContain('MD, Cardiology');
    });

    it('renders patient name', () => {
      const doc = render(makePrescription());
      expect(getTexts(doc)).toContain('Jane Doe');
    });

    it('renders medicine name in table', () => {
      const doc = render(makePrescription());
      expect(getTexts(doc)).toContain('Amoxicillin');
    });

    it('renders dosage, frequency, duration', () => {
      const doc = render(makePrescription());
      const texts = getTexts(doc);
      expect(texts).toContain('500mg');
      expect(texts).toContain('3x daily');
      expect(texts).toContain('7 days');
    });

    it('renders notes section when notes present', () => {
      const doc = render(makePrescription());
      const texts = getTexts(doc);
      expect(texts).toContain('Take with food');
      expect(texts).toContain('Notes');
    });

    it('renders footer disclaimer', () => {
      const doc = render(makePrescription());
      expect(getTexts(doc).some((t) => t.includes('computer-generated'))).toBe(true);
    });

    it('calls doc.end() to finalize PDF', () => {
      const doc = render(makePrescription());
      expect(doc.calls.some(([m]) => m === 'end')).toBe(true);
    });

    it('pipes doc to res', () => {
      const doc = render(makePrescription());
      expect(doc.calls.some(([m, dest]) => m === 'pipe' && dest === res)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles missing doctor name', () => {
      const doc = render(makePrescription({ doctor: {} }));
      expect(getTexts(doc)).toContain('Dr. Unknown');
    });

    it('handles missing doctor entirely', () => {
      const doc = render(makePrescription({ doctor: null }));
      expect(getTexts(doc)).toContain('Dr. Unknown');
    });

    it('handles missing doctor credentials', () => {
      const doc = render(makePrescription({ doctor: { name: 'Adams' } }));
      expect(getTexts(doc)).toContain('Dr. Adams');
    });

    it('handles missing patient name', () => {
      const doc = render(makePrescription({ patient: {} }));
      expect(getTexts(doc)).toContain('Unknown');
    });

    it('handles null patient', () => {
      const doc = render(makePrescription({ patient: null }));
      expect(getTexts(doc)).toContain('Unknown');
    });

    it('handles missing patient dateOfBirth', () => {
      const doc = render(makePrescription({ patient: { fullName: 'Test' } }));
      expect(doc.calls.some(([m]) => m === 'end')).toBe(true);
    });

    it('handles empty medicines array', () => {
      const doc = render(makePrescription({ medicines: [] }));
      expect(doc.calls.some(([m]) => m === 'end')).toBe(true);
    });

    it('handles null medicines', () => {
      const doc = render(makePrescription({ medicines: null }));
      expect(doc.calls.some(([m]) => m === 'end')).toBe(true);
    });

    it('skips notes section when notes are empty', () => {
      const doc = render(makePrescription({ notes: '' }));
      expect(getTexts(doc)).not.toContain('Notes');
    });

    it('skips notes section when notes are whitespace', () => {
      const doc = render(makePrescription({ notes: '   ' }));
      expect(getTexts(doc)).not.toContain('Notes');
    });

    it('skips notes section when notes is null', () => {
      const doc = render(makePrescription({ notes: null }));
      expect(getTexts(doc)).not.toContain('Notes');
    });

    it('renders table with header columns', () => {
      const doc = render(makePrescription());
      const texts = getTexts(doc);
      expect(texts).toContain('Medicine');
      expect(texts).toContain('Dosage');
      expect(texts).toContain('Frequency');
      expect(texts).toContain('Duration');
    });

    it('highlights alternate rows with light background', () => {
      const doc = render(makePrescription({
        medicines: [
          { name: 'A', dosage: '1', frequency: '1x', duration: '1d' },
          { name: 'B', dosage: '2', frequency: '2x', duration: '2d' },
        ],
      }));
      const fills = doc.calls.filter(([m]) => m === 'fillColor').map(([, c]) => c);
      expect(fills).toContain(COLORS.white);
      expect(fills).toContain(COLORS.light);
    });

    it('handles duration as dash when empty', () => {
      const doc = render(makePrescription({
        medicines: [{ name: 'M', dosage: '10mg', frequency: '1x' }],
      }));
      expect(getTexts(doc)).toContain('-');
    });
  });

  describe('formatDate helper', () => {
    it('renders prescription date in DD/MM/YYYY format', () => {
      const doc = render(makePrescription());
      expect(getTexts(doc)).toContain('15/06/2025');
    });

    it('renders N/A for null createdAt', () => {
      const doc = render(makePrescription({ createdAt: null }));
      // Date filter for 'N/A' without colliding with other 'N/A' texts
      const naTexts = getTexts(doc).filter((t) => t === 'N/A');
      expect(naTexts.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('table styling', () => {
    it('draws at least 2 rect elements (header bg + table border)', () => {
      const doc = render(makePrescription());
      const rects = doc.calls.filter(([m]) => m === 'rect');
      expect(rects.length).toBeGreaterThanOrEqual(2);
    });

    it('strokes with border color', () => {
      const doc = render(makePrescription());
      const strokes = doc.calls.filter(([m]) => m === 'stroke');
      expect(strokes.length).toBeGreaterThanOrEqual(1);
    });

    it('draws horizontal rules', () => {
      const doc = render(makePrescription());
      const moveTos = doc.calls.filter(([m]) => m === 'moveTo');
      expect(moveTos.length).toBeGreaterThanOrEqual(3);
    });
  });
});
