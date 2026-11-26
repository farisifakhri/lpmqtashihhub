import { randomUUID } from 'node:crypto';

/**
 * Layanan Generator Penomoran Dokumen Resmi Otomatis (B-03 / U-04)
 * Menghasilkan nomor dinas resmi Kemenag LPMQ secara atomik, unik, dan berurutan.
 */

export const ROMAN_MONTHS = [
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'
];

const DISPOSITION_SEQUENCE_TYPE = 'VERIFICATION_DISPOSITION_GLOBAL';
const DISPOSITION_DOCUMENT_TYPE = 'NOTA_DINAS_VERIFIKASI';
const JAKARTA_TIME_ZONE = 'Asia/Jakarta';

export function getJakartaDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: JAKARTA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return { year: Number(values.year), month: values.month, day: values.day };
}

export function formatDispositionNumber(sequence, date = new Date()) {
  const { year, month, day } = getJakartaDateParts(date);
  return `ND.${String(sequence).padStart(3, '0')}/LPMQ.01/TP.${day}/${month}/${year}`;
}

const getHighestIssuedDispositionNumber = async (db, year) => {
  const documents = await db.verificationDocument.findMany({
    where: {
      document_type: DISPOSITION_DOCUMENT_TYPE,
      document_no: { startsWith: 'ND.', endsWith: `/${year}` },
    },
    select: { document_no: true },
  });
  const pattern = new RegExp(`^ND\\.(\\d+)/LPMQ\\.01/TP\\.\\d{2}/\\d{2}/${year}$`);
  return documents.reduce((highest, document) => {
    const match = pattern.exec(document.document_no || '');
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
};

/**
 * Menghasilkan nomor pratinjau tanpa mencadangkan atau mengubah counter.
 * Nomor resmi tetap dihitung kembali di dalam transaksi penerbitan.
 */
export async function getNextDispositionNumberPreview(db, date = new Date()) {
  const { year } = getJakartaDateParts(date);
  const sequenceKey = `${DISPOSITION_SEQUENCE_TYPE}_${year}`;
  const [counter, highestIssued] = await Promise.all([
    db.documentNumberSequence.findUnique({ where: { sequence_key: sequenceKey } }),
    getHighestIssuedDispositionNumber(db, year),
  ]);
  let sequence = Math.max(counter?.last_number || 0, highestIssued) + 1;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = formatDispositionNumber(sequence, date);
    const collision = await db.verificationDocument.findUnique({
      where: { document_no: candidate },
      select: { id: true },
    });
    if (!collision) return candidate;
    sequence += 1;
  }
  throw new Error('Tidak dapat menentukan nomor pratinjau disposisi unik.');
}

/**
 * Reserves the next yearly global disposition number in the caller's transaction.
 * MySQL's unique-key upsert serializes concurrent increments; transaction rollback
 * also rolls the counter back when issuance fails.
 */
export async function getNextDispositionNumber(tx, date = new Date()) {
  const { year } = getJakartaDateParts(date);
  const sequenceKey = `${DISPOSITION_SEQUENCE_TYPE}_${year}`;
  const highestIssued = await getHighestIssuedDispositionNumber(tx, year);
  const firstAvailable = highestIssued + 1;
  await tx.$executeRaw`
    INSERT INTO \`document_number_sequences\`
      (\`id\`, \`sequence_key\`, \`document_type\`, \`year\`, \`last_number\`, \`created_at\`, \`updated_at\`)
    VALUES (${randomUUID()}, ${sequenceKey}, ${DISPOSITION_SEQUENCE_TYPE}, ${year}, ${firstAvailable}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
    ON DUPLICATE KEY UPDATE
      \`last_number\` = \`last_number\` + 1,
      \`updated_at\` = CURRENT_TIMESTAMP(3)
  `;
  const record = await tx.documentNumberSequence.findUnique({ where: { sequence_key: sequenceKey } });
  if (!record) throw new Error('Counter nomor disposisi gagal disimpan.');

  let sequence = record.last_number;
  if (sequence < firstAvailable) {
    const updated = await tx.documentNumberSequence.update({
      where: { sequence_key: sequenceKey },
      data: { last_number: firstAvailable },
    });
    sequence = updated.last_number;
  }

  // The sequence row protects concurrent requests; this check also protects
  // against previously imported or manually issued matching numbers.
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = formatDispositionNumber(sequence, date);
    const collision = await tx.verificationDocument.findUnique({
      where: { document_no: candidate },
      select: { id: true },
    });
    if (!collision) return candidate;

    const updated = await tx.documentNumberSequence.update({
      where: { sequence_key: sequenceKey },
      data: { last_number: { increment: 1 } },
    });
    sequence = updated.last_number;
  }

  throw new Error('Tidak dapat menentukan nomor disposisi unik.');
}

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

    case 'SURAT_PERSETUJUAN_MASTER':
      return `B-${pad4}/LPMQ.01/HM.01/${romanMonth}/${year}`;

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
