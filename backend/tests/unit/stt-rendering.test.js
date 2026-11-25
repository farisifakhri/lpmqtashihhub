import test from 'node:test';
import assert from 'node:assert/strict';
import { renderSttPdf, renderDraft } from '../../src/services/official-document.service.js';

test('U-15 / B-09: renderSttPdf generates valid PDF with dynamic placeholders and official clauses', async () => {
  const document = {
    id: 'stt-test-01',
    document_type: 'SURAT_TANDA_TASHIH',
    document_no: 'STT/LPMQ/2026/0001',
    status: 'ISSUED',
    qr_token: '12345678-1234-1234-1234-123456789abc',
    created_at: new Date('2026-10-21T08:00:00Z'),
    issued_at: new Date('2026-10-21T08:00:00Z'),
    valid_until: new Date('2028-10-21T08:00:00Z'),
    content_snapshot: {
      title: 'Mushaf Al-Qur\'an Al-Karim 30 Juz Standar Indonesia',
      publisher: 'PT Pustaka Litera Mulia',
      nomor_naskah: '055/PLM/X/2026',
      tanggal_naskah: '15 Oktober 2026',
      nama_pengirim: 'H. Lukman Hakim',
      ttd_pengirim: 'Direktur Utama',
      jenis_mushaf: 'Mushaf Standar Usmani',
      sizes_formatted: 'A4 (21 x 29.7 cm), B5 (17.5 x 25 cm)',
      oplah_formatted: '10.000 Eksemplar',
      total_oplah: 10000,
    },
  };

  const pdfBytes = await renderSttPdf(document, { draft: false });
  assert.ok(Buffer.isBuffer(pdfBytes));
  assert.equal(pdfBytes.subarray(0, 5).toString(), '%PDF-');
  assert.ok(pdfBytes.length > 5000);

  // Periksa apakah draft mode juga dapat dirender
  const draftBytes = await renderDraft({ ...document, status: 'DRAFT' });
  assert.ok(Buffer.isBuffer(draftBytes));
  assert.equal(draftBytes.subarray(0, 5).toString(), '%PDF-');
});

test('U-15: renderSttPdf throws 422 if unsupported Arabic characters are present in snapshot', async () => {
  const document = {
    id: 'stt-test-02',
    document_type: 'SURAT_TANDA_TASHIH',
    document_no: 'DRAFT-STT-02',
    status: 'DRAFT',
    content_snapshot: {
      title: 'القرآن الكريم',
      publisher: 'PT Penerbit Quran',
    },
  };

  await assert.rejects(
    renderSttPdf(document, { draft: true }),
    error => error.statusCode === 422
  );
});


const returnLetter = notes => ({
  document_type: 'REVISION_RETURN_LETTER',
  document_no: 'SPK/LPMQ/2026/0001',
  version: 1,
  status: 'DRAFT',
  content_snapshot: { title: 'Mushaf', registration_no: 'REG-1', publisher: 'PT A', revision_round: 1, notes },
});

test('renderDraft surat pengembalian menerima catatan multi-baris dan titik tengah', async () => {
  const bytes = await renderDraft(returnLetter('Hasil sidang:\n[Abdul Wahid, Lc · Juz 1]: mrf;g\r\n\tbaris tab'));
  assert.equal(Buffer.from(bytes).subarray(0, 5).toString(), '%PDF-');
});

test('renderDraft surat pengembalian tetap menolak huruf Arab dengan 422', async () => {
  await assert.rejects(renderDraft(returnLetter('Catatan:\nبسم')), error => error.statusCode === 422);
});
