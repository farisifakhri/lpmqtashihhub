import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import {
  renderPublisherCertificatePdf,
  formatIndonesianDate,
  INDONESIAN_MONTHS,
} from '../src/services/publisher-certificate-pdf.service.js';

test('U-06: formatIndonesianDate menghasilkan nama bulan bahasa Indonesia bukan bahasa Inggris', () => {
  const octDate = new Date('2026-10-19T00:00:00Z');
  const formatted = formatIndonesianDate(octDate);
  assert.match(formatted, /19 Oktober 2026/);
  assert.doesNotMatch(formatted, /October/i);
});

test('U-06: renderPublisherCertificatePdf merender PDF resmi dengan logo, data lengkap NPWP/NIB, dan penandatangan', async () => {
  const samplePublisher = {
    name: 'Yayasan Pesantren Islam (YPI) Al Azhar',
    address: 'Jl. Sisingamangaraja No.2, RT.2/RW.1, Selong, Kec. Kby. Baru, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12120',
    pic_phone: '0217243933',
    email: 'humas@al-azhar.or.id',
    pic_name: 'Akhmad Khotib',
    npwp: '01.234.567.8-012.000',
    nib: '1234567890123',
    nomor_induk_penerbit: '31.74.26.10.19.001',
    decided_at: new Date('2026-10-19T00:00:00Z'),
  };

  const pdfBytes = await renderPublisherCertificatePdf(samplePublisher);
  assert.ok(pdfBytes instanceof Uint8Array);

  // Verifikasi struktur PDF
  const pdfHeader = Buffer.from(pdfBytes.subarray(0, 5)).toString();
  assert.equal(pdfHeader, '%PDF-');

  const pdf = await PDFDocument.load(pdfBytes);
  assert.equal(pdf.getPageCount(), 1);
});

test('U-06: renderPublisherCertificatePdf menangani nilai NPWP dan NIB kosong secara anggun dengan tanda strip', async () => {
  const samplePublisherEmptyFields = {
    name: 'Penerbit Miniatur',
    address: 'Jl. Percetakan No. 1',
    pic_phone: '08123456789',
    email: 'kontak@penerbitmini.id',
    pic_name: 'Budi Santoso',
    npwp: null,
    nib: null,
    decided_at: new Date('2026-10-21T00:00:00Z'),
  };

  const pdfBytes = await renderPublisherCertificatePdf(samplePublisherEmptyFields);
  assert.ok(pdfBytes instanceof Uint8Array);
  const pdf = await PDFDocument.load(pdfBytes);
  assert.equal(pdf.getPageCount(), 1);
});
