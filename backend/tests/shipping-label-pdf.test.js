import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { renderShippingLabelPdf } from '../src/services/registration-receipt-pdf.service.js';

test('renderShippingLabelPdf generates authentic A4 PDF shipping label with correct data', async () => {
  const bytes = await renderShippingLabelPdf({
    registration_no: 'REG-2026-0099',
    title: 'Mushaf Al-Qur\'an Standar Indonesia',
    publisher: {
      legal_name: 'PT Percetakan Menara Kudus',
      address: 'Jl. Menara No. 25, Kauman, Kudus, Jawa Tengah',
      phone: '081234567890',
    },
    physical_master_intake: {
      volume_count: 30,
    },
    service_type: {
      name: 'Mushaf Standar Usmani',
      category: {
        name: 'Tanda Tashih Baru',
      },
    },
    foreign_metadata: {
      penanggung_jawab_produk: 'H. Ahmad Fauzi',
      penanggung_jawab_wa: '081234567890',
    },
  });

  assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
  const pdf = await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(), 1);
  assert.deepEqual(pdf.getPage(0).getSize(), { width: 595, height: 842 });
});

