import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { renderPhysicalMasterReceiptPdf } from '../src/services/physical-master-receipt-pdf.service.js';

test('tanda terima master fisik yang sudah diterima menghasilkan PDF A4', async () => {
  const bytes = await renderPhysicalMasterReceiptPdf({
    registration_no: 'REG-2026-001',
    title: 'Mushaf Al-Quran Standar',
    publisher: { legal_name: 'PT Penerbit Contoh' },
    service_type: { name: 'Pentashihan Mushaf' },
    physical_master_intake: {
      status: 'RECEIVED', receipt_no: 'TT-LPMQ-2026-001', received_at: new Date('2026-09-29T02:00:00Z'),
      volume_count: 30, format: 'A4', binding_method: 'PER_JUZ', condition: 'BAIK',
      received_by: { name: 'Petugas Loket' },
    },
  });
  assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
  const pdf = await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(), 1);
  assert.deepEqual(pdf.getPage(0).getSize(), { width: 595, height: 842 });
});

test('tanda terima belum dapat dibuat sebelum master fisik diterima', async () => {
  await assert.rejects(() => renderPhysicalMasterReceiptPdf({ physical_master_intake: { status: 'PENDING' } }));
});
