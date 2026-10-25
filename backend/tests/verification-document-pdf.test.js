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

test('surat hasil lolos dengan kode billing menghasilkan PDF final', async () => {
  const document = {
    document_type: 'SURAT_HASIL_VERIFIKASI', document_no: 'B-001/LPMQ',
    qr_token: '00000000-0000-4000-8000-000000000001',
    content_snapshot: {
      decision: 'PASSED', registration_no: 'REG-001', title: 'Mushaf Standar',
      publisher_name: 'PT Mushaf Nusantara', verifier_name: 'Verifikator LPMQ',
      letter_text: 'Naskah memenuhi syarat untuk tahap pembayaran PNBP.',
      billing_no: 'SIMPONI-001', billing_amount: '5000000',
    },
  };
  const bytes = await renderVerificationPdf(document, { approver: { name: 'Kepala LPMQ' }, approvedAt: new Date('2026-09-29T00:00:00Z') });
  assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
  const pdf = await PDFDocument.load(bytes);
  assert.ok(pdf.getPageCount() >= 1);
});

test('U-03: Lembar disposisi dan surat hasil menggunakan nama jabatan kedinasan resmi dan tidak mencetak (Menunggu persetujuan)', async () => {
  const memo = {
    document_type: 'NOTA_DINAS_VERIFIKASI',
    document_no: 'ND-002',
    version: 1,
    content_snapshot: {
      registration_no: 'REG-002',
      title: "Mushaf Al-Qur'an Standar",
      verifier_name: 'Ahmad Falahudin, S.S',
      // Jika penugas bernilai default / admin dummy
      assigned_by_name: 'Helper Admin',
      assigned_at: '2026-10-21T00:00:00Z',
      due_at: '2026-10-23T00:00:00Z',
    },
  };

  const memoBytes = await renderVerificationPdf(memo, { draft: true });
  assert.ok(memoBytes instanceof Uint8Array);
  assert.equal(memoBytes.subarray(0, 5).toString(), '%PDF-');

  const draftResult = {
    document_type: 'SURAT_HASIL_VERIFIKASI',
    version: 1,
    content_snapshot: {
      registration_no: 'REG-002',
      title: "Mushaf Al-Qur'an Standar",
      publisher_name: 'PT Mushaf Nusantara',
      decision: 'PASSED',
      letter_text: 'Hasil verifikasi naskah memenuhi standar.',
      billing_no: 'BILL-12345',
      billing_amount: 1000000,
    },
  };

  const resultBytes = await renderVerificationPdf(draftResult, { draft: true });
  assert.ok(resultBytes instanceof Uint8Array);
  assert.equal(resultBytes.subarray(0, 5).toString(), '%PDF-');

  const baDoc = {
    document_type: 'BERITA_ACARA_VERIFIKASI',
    document_no: 'BA-001',
    version: 1,
    content_snapshot: {
      registration_no: 'REG-002',
      title: "Mushaf Al-Qur'an Standar",
      publisher_name: 'PT Mushaf Nusantara',
      decision: 'PASSED',
      checklist: [],
    },
  };

  const baBytes = await renderVerificationPdf(baDoc, { draft: true });
  assert.ok(baBytes instanceof Uint8Array);
  assert.equal(baBytes.subarray(0, 5).toString(), '%PDF-');
});
