import test from 'node:test';
import assert from 'node:assert/strict';
import { formatOfficialDocumentNumber, getRomanMonth, getNextDocumentNumber, ROMAN_MONTHS } from '../src/services/document-number.service.js';

test('B-03 / U-04: getRomanMonth mengonversi bulan 1-12 ke Romawi secara tepat', () => {
  assert.equal(getRomanMonth(1), 'I');
  assert.equal(getRomanMonth(2), 'II');
  assert.equal(getRomanMonth(5), 'V');
  assert.equal(getRomanMonth(9), 'IX');
  assert.equal(getRomanMonth(10), 'X');
  assert.equal(getRomanMonth(11), 'XI');
  assert.equal(getRomanMonth(12), 'XII');
});

test('B-03 / U-04: formatOfficialDocumentNumber memformat surat hasil dengan kode TL.01 dan 4 digit urutan', () => {
  const fixedDate = new Date(2026, 9, 21); // 21 Oktober 2026 -> bulan index 9 = Oktober (X)
  
  const noSurat = formatOfficialDocumentNumber('SURAT_HASIL_VERIFIKASI', 42, fixedDate);
  assert.equal(noSurat, 'B-0042/LPMQ.01/TL.01/X/2026');

  const noSuratRevisi = formatOfficialDocumentNumber('SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI', 1, fixedDate);
  assert.equal(noSuratRevisi, 'B-0001/LPMQ.01/TL.01/X/2026');

  const noBA = formatOfficialDocumentNumber('BERITA_ACARA_VERIFIKASI', 15, fixedDate);
  assert.equal(noBA, 'BA-0015/LPMQ.01/TL.01/X/2026');

  const noNota = formatOfficialDocumentNumber('NOTA_DINAS_VERIFIKASI', 7, fixedDate);
  assert.equal(noNota, 'ND-0007/LPMQ.01/TL.01/X/2026');
});

test('B-03 / U-04: formatOfficialDocumentNumber memformat Sertifikat Penerbit dengan kode 31.74.YY.MM.DD.SEQ', () => {
  const fixedDate = new Date(2026, 9, 19); // 19 Oktober 2026
  const noSertifikat = formatOfficialDocumentNumber('SERTIFIKAT_PENERBIT', 1, fixedDate);
  assert.equal(noSertifikat, '31.74.26.10.19.001');
});

test('B-03 / U-04: getNextDocumentNumber menghasilkan nomor berurutan secara transaksional', async () => {
  // Mock transaction object
  let counter = 0;
  const mockTx = {
    documentNumberSequence: {
      upsert: async ({ create }) => {
        counter += 1;
        return { last_number: counter };
      },
    },
    verificationDocument: {
      findFirst: async () => null, // Tidak ada kolisi
    },
  };

  const fixedDate = new Date(2026, 9, 21);
  const docNo1 = await getNextDocumentNumber(mockTx, 'SURAT_HASIL_VERIFIKASI', fixedDate);
  const docNo2 = await getNextDocumentNumber(mockTx, 'SURAT_HASIL_VERIFIKASI', fixedDate);

  assert.equal(docNo1, 'B-0001/LPMQ.01/TL.01/X/2026');
  assert.equal(docNo2, 'B-0002/LPMQ.01/TL.01/X/2026');
});

