import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { renderHandoverPdf } from '../src/services/handover-pdf.service.js';

test('BAST PDF tersedia sebelum dan setelah distributor mengonfirmasi penerimaan', async () => {
  const handover = {
    receipt_no: 'BAST-VER-DIST-REG-001', status: 'PENDING',
    handed_over_at: new Date('2026-09-29T07:00:00Z'), volume_count: 30,
    condition: 'BAIK', notes: 'Master fisik lengkap 30 jilid.',
    from_user: { name: 'Verifikator', nip: '12345' },
    to_user: { name: 'Distributor', nip: '67890' },
    registration: { registration_no: 'REG-001', title: 'Mushaf Uji', publisher: { legal_name: 'Penerbit Uji' }, service_type: { name: 'Pentashihan' } },
  };
  for (const status of ['PENDING', 'RECEIVED']) {
    const bytes = await renderHandoverPdf({ ...handover, status, received_at: status === 'RECEIVED' ? new Date('2026-09-29T08:00:00Z') : null });
    assert.equal(bytes.subarray(0, 4).toString(), '%PDF');
    const pdf = await PDFDocument.load(bytes);
    assert.ok(pdf.getPageCount() >= 1);
  }
});
