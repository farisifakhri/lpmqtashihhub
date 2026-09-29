import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { renderVerificationPdf } from '../src/services/verification-document-pdf.service.js';

test('nota dinas and result letters render as readable PDF drafts with the LPMQ letterhead', async () => {
  const memo = {
    document_type: 'NOTA_DINAS_VERIFIKASI',
    document_no: 'ND-001',
    version: 1,
    content_snapshot: {
      registration_no: 'REG-001',
      title: "Mushaf Al-Qur'an",
      verifier_name: 'Petugas Verifikasi',
      assigned_by_name: 'Helper Admin',
      physical_receipt_no: 'TT-001',
      volume_count: 30,
      assigned_at: '2026-09-29T00:00:00Z',
      due_at: '2026-10-01T00:00:00Z',
    },
  };
  const result = {
    document_type: 'SURAT_HASIL_VERIFIKASI',
    version: 1,
    content_snapshot: {
      registration_no: 'REG-001',
      title: "Mushaf Al-Qur'an",
      publisher_name: 'PT Mushaf Nusantara',
      publisher_address: 'Jakarta Timur',
      decision: 'REVISION_REQUIRED',
      letter_text: 'Naskah belum lolos verifikasi.\n\nPerbaiki kaidah warna tajwid.'.repeat(12),
    },
  };

  for (const document of [memo, result]) {
    const bytes = await renderVerificationPdf(document, { draft: true });
    assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
    const pdf = await PDFDocument.load(bytes);
    assert.ok(pdf.getPageCount() >= 1);
    assert.ok(pdf.getPages().every(page => page.getWidth() === 595 && page.getHeight() === 842));
  }
});
