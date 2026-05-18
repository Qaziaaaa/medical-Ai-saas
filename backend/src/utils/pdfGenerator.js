'use strict';

const PDFDocument = require('pdfkit');

// ── Colour palette ─────────────────────────────────────────────────────────────
const COLORS = {
  primary: '#1a73e8',
  dark: '#1a1a2e',
  muted: '#555555',
  light: '#f8f9fa',
  border: '#dee2e6',
  white: '#ffffff',
};

// ── Layout constants ───────────────────────────────────────────────────────────
const MARGIN = 50;
const PAGE_WIDTH = 595.28; // A4
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

/**
 * Format a Date (or date string) as DD/MM/YYYY.
 * @param {Date|string} date
 * @returns {string}
 */
function formatDate(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Draw a horizontal rule across the content area.
 * @param {PDFDocument} doc
 * @param {number} y
 * @param {string} color
 */
function drawHRule(doc, y, color = COLORS.border) {
  doc
    .moveTo(MARGIN, y)
    .lineTo(PAGE_WIDTH - MARGIN, y)
    .strokeColor(color)
    .lineWidth(0.5)
    .stroke();
}

/**
 * Stream a styled prescription PDF directly to the Express response.
 *
 * @param {object} prescription  - Populated Mongoose prescription document
 * @param {import('express').Response} res  - Express response object
 */
function generatePrescriptionPDF(prescription, res) {
  const doc = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true });

  // ── HTTP headers ─────────────────────────────────────────────────────────────
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=prescription-${prescription._id}.pdf`
  );

  // Pipe the PDF stream directly to the response
  doc.pipe(res);

  // ── HEADER ───────────────────────────────────────────────────────────────────
  // Clinic name
  doc
    .fontSize(26)
    .font('Helvetica-Bold')
    .fillColor(COLORS.primary)
    .text('AI Clinic', MARGIN, MARGIN, { align: 'center', width: CONTENT_WIDTH });

  // Subtitle
  doc
    .fontSize(13)
    .font('Helvetica')
    .fillColor(COLORS.muted)
    .text('Medical Prescription', MARGIN, doc.y + 4, { align: 'center', width: CONTENT_WIDTH });

  const headerBottom = doc.y + 10;
  drawHRule(doc, headerBottom, COLORS.primary);

  // ── DOCTOR SECTION ───────────────────────────────────────────────────────────
  const doctorName = prescription.doctor?.name || 'Unknown';
  const credentials = prescription.doctor?.credentials || '';

  doc
    .fontSize(11)
    .font('Helvetica-Bold')
    .fillColor(COLORS.dark)
    .text('Prescribing Physician', MARGIN, headerBottom + 16);

  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .fillColor(COLORS.dark)
    .text(`Dr. ${doctorName}`, MARGIN, doc.y + 2);

  if (credentials) {
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor(COLORS.muted)
      .text(credentials, MARGIN, doc.y + 2);
  }

  const doctorBottom = doc.y + 10;
  drawHRule(doc, doctorBottom);

  // ── PATIENT SECTION ──────────────────────────────────────────────────────────
  const patientName = prescription.patient?.fullName || 'Unknown';
  const dob = formatDate(prescription.patient?.dateOfBirth);
  const prescriptionDate = formatDate(prescription.createdAt);

  doc
    .fontSize(11)
    .font('Helvetica-Bold')
    .fillColor(COLORS.dark)
    .text('Patient Information', MARGIN, doctorBottom + 16);

  // Two-column layout: left = name + DOB, right = date
  const leftX = MARGIN;
  const rightX = MARGIN + CONTENT_WIDTH / 2;
  const infoY = doc.y + 4;

  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .fillColor(COLORS.muted)
    .text('Patient Name:', leftX, infoY)
    .font('Helvetica')
    .fillColor(COLORS.dark)
    .text(patientName, leftX, doc.y + 1);

  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .fillColor(COLORS.muted)
    .text('Date of Birth:', leftX, doc.y + 4)
    .font('Helvetica')
    .fillColor(COLORS.dark)
    .text(dob, leftX, doc.y + 1);

  // Right column — prescription date
  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .fillColor(COLORS.muted)
    .text('Date:', rightX, infoY)
    .font('Helvetica')
    .fillColor(COLORS.dark)
    .text(prescriptionDate, rightX, infoY + 13);

  const patientBottom = doc.y + 14;
  drawHRule(doc, patientBottom);

  // ── MEDICINES TABLE ──────────────────────────────────────────────────────────
  doc
    .fontSize(11)
    .font('Helvetica-Bold')
    .fillColor(COLORS.dark)
    .text('Prescribed Medicines', MARGIN, patientBottom + 16);

  const tableTop = doc.y + 8;

  // Column widths (total = CONTENT_WIDTH)
  const cols = {
    medicine: { x: MARGIN, width: CONTENT_WIDTH * 0.35 },
    dosage:   { x: MARGIN + CONTENT_WIDTH * 0.35, width: CONTENT_WIDTH * 0.20 },
    frequency:{ x: MARGIN + CONTENT_WIDTH * 0.55, width: CONTENT_WIDTH * 0.25 },
    duration: { x: MARGIN + CONTENT_WIDTH * 0.80, width: CONTENT_WIDTH * 0.20 },
  };

  const ROW_HEIGHT = 22;
  const HEADER_HEIGHT = 24;

  // Table header background
  doc
    .rect(MARGIN, tableTop, CONTENT_WIDTH, HEADER_HEIGHT)
    .fillColor(COLORS.primary)
    .fill();

  // Table header text
  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .fillColor(COLORS.white);

  const headerTextY = tableTop + 7;
  doc.text('Medicine',  cols.medicine.x  + 4, headerTextY, { width: cols.medicine.width  - 8 });
  doc.text('Dosage',    cols.dosage.x    + 4, headerTextY, { width: cols.dosage.width    - 8 });
  doc.text('Frequency', cols.frequency.x + 4, headerTextY, { width: cols.frequency.width - 8 });
  doc.text('Duration',  cols.duration.x  + 4, headerTextY, { width: cols.duration.width  - 8 });

  // Table rows
  const medicines = prescription.medicines || [];
  let rowY = tableTop + HEADER_HEIGHT;

  medicines.forEach((med, idx) => {
    const bgColor = idx % 2 === 0 ? COLORS.white : COLORS.light;

    doc
      .rect(MARGIN, rowY, CONTENT_WIDTH, ROW_HEIGHT)
      .fillColor(bgColor)
      .fill();

    const textY = rowY + 6;
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor(COLORS.dark);

    doc.text(med.name      || '',  cols.medicine.x  + 4, textY, { width: cols.medicine.width  - 8 });
    doc.text(med.dosage    || '',  cols.dosage.x    + 4, textY, { width: cols.dosage.width    - 8 });
    doc.text(med.frequency || '',  cols.frequency.x + 4, textY, { width: cols.frequency.width - 8 });
    doc.text(med.duration  || '-', cols.duration.x  + 4, textY, { width: cols.duration.width  - 8 });

    rowY += ROW_HEIGHT;
  });

  // Table border
  doc
    .rect(MARGIN, tableTop, CONTENT_WIDTH, HEADER_HEIGHT + ROW_HEIGHT * medicines.length)
    .strokeColor(COLORS.border)
    .lineWidth(0.5)
    .stroke();

  // ── NOTES SECTION ────────────────────────────────────────────────────────────
  if (prescription.notes && prescription.notes.trim()) {
    const notesTop = rowY + 20;
    drawHRule(doc, notesTop);

    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor(COLORS.dark)
      .text('Notes', MARGIN, notesTop + 14);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor(COLORS.dark)
      .text(prescription.notes.trim(), MARGIN, doc.y + 4, {
        width: CONTENT_WIDTH,
        align: 'left',
      });
  }

  // ── FOOTER ───────────────────────────────────────────────────────────────────
  const footerY = doc.page.height - MARGIN - 30;
  drawHRule(doc, footerY);

  doc
    .fontSize(8)
    .font('Helvetica-Oblique')
    .fillColor(COLORS.muted)
    .text(
      'This prescription is computer-generated and is valid without a physical signature.',
      MARGIN,
      footerY + 8,
      { align: 'center', width: CONTENT_WIDTH }
    );

  doc.end();
}

module.exports = { generatePrescriptionPDF };
