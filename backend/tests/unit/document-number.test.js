import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatOfficialDocumentNumber,
  formatDispositionNumber,
  getJakartaDateParts,
  getNextDispositionNumber,
  getNextDispositionNumberPreview,
  getRomanMonth,
  getNextDocumentNumber,
  ROMAN_MONTHS,
} from '../../src/services/document-number.service.js';

function createDispositionDb(existingNumbers = []) {
  const counters = new Map();
  const existing = new Set(existingNumbers);
  const createTransaction = () => {
    const transactionNumbers = new Map();
    return {
      documentNumberSequence: {
        findUnique: async ({ where }) => {
          const last_number = transactionNumbers.get(where.sequence_key) ?? counters.get(where.sequence_key);
          return last_number === undefined ? null : { last_number };
        },
        update: async ({ where, data }) => {
          const next = data.last_number.increment
            ? counters.get(where.sequence_key) + data.last_number.increment
            : data.last_number;
          counters.set(where.sequence_key, next);
          transactionNumbers.set(where.sequence_key, next);
          return { last_number: next };
        },
      },
      $executeRaw: async (_query, _id, sequenceKey, _documentType, _year, firstAvailable) => {
        const next = counters.has(sequenceKey) ? counters.get(sequenceKey) + 1 : firstAvailable;
        counters.set(sequenceKey, next);
        transactionNumbers.set(sequenceKey, next);
        return 1;
      },
      verificationDocument: {
        findMany: async ({ where }) => existingNumbers
          .filter(number => number.startsWith(where.document_no.startsWith) && number.endsWith(where.document_no.endsWith))
          .map(document_no => ({ document_no })),
        findUnique: async ({ where }) => existing.has(where.document_no) ? { id: 'existing-document' } : null,
      },
    };
  };
  return { ...createTransaction(), counters, createTransaction };
}

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

test('nomor disposisi memakai waktu Asia/Jakarta dan format nomor dinas yang disepakati', () => {
  const utcLateNight = new Date('2026-11-26T17:30:00.000Z');
  assert.deepEqual(getJakartaDateParts(utcLateNight), { year: 2026, month: '11', day: '27' });
  assert.equal(formatDispositionNumber(1, utcLateNight), 'ND.001/LPMQ.01/TP.27/11/2026');
});

test('nomor disposisi memakai urutan global tahunan dan tidak reset saat bulan berubah', async () => {
  const db = createDispositionDb();
  assert.equal(await getNextDispositionNumber(db, new Date('2026-11-26T05:00:00.000Z')), 'ND.001/LPMQ.01/TP.26/11/2026');
  assert.equal(await getNextDispositionNumber(db, new Date('2026-12-01T05:00:00.000Z')), 'ND.002/LPMQ.01/TP.01/12/2026');
  assert.equal(await getNextDispositionNumber(db, new Date('2027-01-01T05:00:00.000Z')), 'ND.001/LPMQ.01/TP.01/01/2027');
});

test('penerbitan disposisi paralel mengambil nomor unik dari satu counter global', async () => {
  const db = createDispositionDb();
  const date = new Date('2026-11-26T05:00:00.000Z');
  const numbers = await Promise.all([
    getNextDispositionNumber(db.createTransaction(), date),
    getNextDispositionNumber(db.createTransaction(), date),
  ]);
  assert.deepEqual(numbers.sort(), [
    'ND.001/LPMQ.01/TP.26/11/2026',
    'ND.002/LPMQ.01/TP.26/11/2026',
  ]);
});

test('pratinjau nomor disposisi tidak mencadangkan nomor dan melanjutkan nomor historis yang sudah terbit', async () => {
  const db = createDispositionDb(['ND.009/LPMQ.01/TP.14/11/2026']);
  const date = new Date('2026-11-26T05:00:00.000Z');
  assert.equal(await getNextDispositionNumberPreview(db, date), 'ND.010/LPMQ.01/TP.26/11/2026');
  assert.equal(await getNextDispositionNumberPreview(db, date), 'ND.010/LPMQ.01/TP.26/11/2026');
  assert.equal(db.counters.size, 0);
  assert.equal(await getNextDispositionNumber(db, date), 'ND.010/LPMQ.01/TP.26/11/2026');
});

