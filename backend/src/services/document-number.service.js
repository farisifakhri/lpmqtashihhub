/**
 * Layanan Generator Penomoran Dokumen Resmi Otomatis (B-03 / U-04)
 * Menghasilkan nomor dinas resmi Kemenag LPMQ secara atomik, unik, dan berurutan.
 */

export const ROMAN_MONTHS = [
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'
];

/**
 * Mengubah index bulan (1-12) ke angka Romawi
 * @param {number} month1to12 
 * @returns {string}
 */
export function getRomanMonth(month1to12) {
  const idx = Math.max(1, Math.min(12, Number(month1to12) || 1)) - 1;
  return ROMAN_MONTHS[idx];
}

/**
 * Format nomor dokumen dinas berdasarkan tipe dan urutan
 * @param {string} documentType 
 * @param {number} sequence 
 * @param {Date} date 
 * @returns {string}
 */
export function formatOfficialDocumentNumber(documentType, sequence, date = new Date()) {
  const year = date.getFullYear();
  const romanMonth = getRomanMonth(date.getMonth() + 1);
  const pad4 = String(sequence).padStart(4, '0');

  switch (documentType) {
    case 'SURAT_HASIL_VERIFIKASI':
    case 'SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI':
      return `B-${pad4}/LPMQ.01/TL.01/${romanMonth}/${year}`;

    case 'BERITA_ACARA_VERIFIKASI':
    case 'BERITA_ACARA_TASHIH':
      return `BA-${pad4}/LPMQ.01/TL.01/${romanMonth}/${year}`;

    case 'NOTA_DINAS_VERIFIKASI':
      return `ND-${pad4}/LPMQ.01/TL.01/${romanMonth}/${year}`;

    case 'SERTIFIKAT_PENERBIT': {
      const yy = String(year).slice(-2);
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const pad3 = String(sequence).padStart(3, '0');
      return `31.74.${yy}.${mm}.${dd}.${pad3}`;
    }

    default:
      return `DOC-${pad4}/LPMQ/${romanMonth}/${year}`;
  }
}

/**
 * Mengambil nomor dokumen resmi berikutnya secara transaksional
 * @param {object} tx Prisma transaction or client
 * @param {string} documentType
 * @param {Date} date
 * @returns {Promise<string>}
 */
export async function getNextDocumentNumber(tx, documentType, date = new Date()) {
  const year = date.getFullYear();
  const sequenceKey = `${documentType}_${year}`;

  let nextSequence = 1;

  // 1. Coba update/upsert secara atomik di DocumentNumberSequence
  try {
    if (tx.documentNumberSequence) {
      const record = await tx.documentNumberSequence.upsert({
        where: { sequence_key: sequenceKey },
        create: {
          sequence_key: sequenceKey,
          document_type: documentType,
          year,
          last_number: 1,
        },
        update: {
          last_number: { increment: 1 },
        },
      });
      nextSequence = record.last_number;
    } else {
      throw new Error('documentNumberSequence model not yet loaded');
    }
  } catch (_err) {
    // 2. Fallback jika tabel/model belum siap: hitung dokumen bertipe sama pada tahun ini
    if (tx.verificationDocument) {
      const count = await tx.verificationDocument.count({
        where: {
          document_type: documentType,
          document_no: { not: null },
          created_at: {
            gte: new Date(year, 0, 1),
            lt: new Date(year + 1, 0, 1),
          },
        },
      });
      nextSequence = count + 1;
    }
  }

  // 3. Pastikan keunikan terhadap database (Collision prevention loop)
  let candidateNo = formatOfficialDocumentNumber(documentType, nextSequence, date);
  if (tx.verificationDocument) {
    let attempts = 0;
    while (attempts < 10) {
      const existing = await tx.verificationDocument.findFirst({
        where: { document_no: candidateNo },
        select: { id: true },
      });
      if (!existing) break;
      nextSequence += 1;
      candidateNo = formatOfficialDocumentNumber(documentType, nextSequence, date);
      attempts += 1;
    }
  }

  return candidateNo;
}
