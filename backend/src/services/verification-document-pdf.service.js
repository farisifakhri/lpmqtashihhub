import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import { prisma } from '../config/database.js';
import { ENV } from '../config/env.js';
import { fail } from './workflow-utils.js';
import { readStoredFile } from './storage.service.js';

const storageRoot = fileURLToPath(new URL('../../storage/private/', import.meta.url));
const label = {
  NOTA_DINAS_VERIFIKASI: 'NOTA DINAS PENUGASAN VERIFIKASI',
  SURAT_HASIL_VERIFIKASI: 'SURAT HASIL VERIFIKASI',
  SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI: 'SURAT PEMBERITAHUAN HASIL VERIFIKASI',
  BERITA_ACARA_VERIFIKASI: 'BERITA ACARA VERIFIKASI',
};
export const fileHash = bytes => createHash('sha256').update(bytes).digest('hex');
export const verificationUrl = token => `${ENV.PUBLIC_APP_URL?.replace(/\/$/, '')}/verify-internal/${token}`;

function safeText(value, font) {
  const text = String(value ?? '');
  for (const character of text) {
    try { font.encodeText(character); }
    catch { fail(422, 'PDF belum dapat dibuat karena ada karakter yang belum didukung oleh font dokumen. Hubungi administrator untuk dukungan font tersebut.'); }
  }
  return text;
}

export async function renderVerificationPdf(document, { draft = false, approver = null, approvedAt = null } = {}) {
  if (!draft && !ENV.PUBLIC_APP_URL) fail(503, 'PUBLIC_APP_URL perlu diatur sebelum QR dokumen diterbitkan.');
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page;
  let y;
  const newPage = () => {
    page = pdf.addPage([595, 842]);
    y = 760;
    if (draft) page.drawText('DRAF - BELUM DISETUJUI', { x: 42, y: 800, font: bold, size: 11, color: rgb(0.7, 0.1, 0.1) });
  };
  const line = (value, emphasized = false) => {
    const face = emphasized ? bold : font;
    const text = safeText(value, face);
    const words = text.split(/\s+/);
    let row = '';
    const flush = () => {
      if (y < 92) newPage();
      page.drawText(row, { x: 42, y, font: face, size: 10, color: rgb(0.12, 0.15, 0.2) });
      y -= 16;
      row = '';
    };
    for (const word of words) {
      const candidate = row ? `${row} ${word}` : word;
      if (face.widthOfTextAtSize(candidate, 10) > 510 && row) flush();
      row = row ? `${row} ${word}` : word;
      if (face.widthOfTextAtSize(row, 10) > 510) fail(422, 'PDF belum dapat dibuat karena ada kata terlalu panjang untuk ukuran halaman.');
    }
    flush();
  };
  newPage();
  line('LAJNAH PENTASHIHAN MUSHAF AL-QURAN', true);
  line(label[document.document_type] || document.document_type, true);
  y -= 8;
  line(`Nomor: ${document.document_no || 'Belum diberi nomor'}`);
  line(`Versi: ${document.version}`);
  line(`Pengajuan: ${document.content_snapshot?.registration_no || '-'}`);
  line(`Naskah: ${document.content_snapshot?.title || '-'}`);
  if (document.document_type === 'NOTA_DINAS_VERIFIKASI') {
    line(`Verifikator: ${document.content_snapshot?.verifier_name || '-'}`);
    line(`Tanggal penugasan: ${document.content_snapshot?.assigned_at || '-'}`);
    line(`Batas penugasan: ${document.content_snapshot?.due_at || '-'}`);
    line(`Catatan: ${document.content_snapshot?.notes || '-'}`);
  } else {
    line(`Keputusan: ${document.content_snapshot?.decision || '-'}`);
    line(`Verifikator: ${document.content_snapshot?.verifier_name || '-'}`);
    y -= 8;
    for (const paragraph of String(document.content_snapshot?.letter_text || document.content_snapshot?.notes || '').split(/\r?\n/)) {
      line(paragraph || ' ');
      y -= 3;
    }
  }
  y -= 15;
  line(draft ? 'Status: Draf, belum disetujui' : 'Status saat diterbitkan: Disetujui secara internal');
  if (!draft) {
    line(`Penyetuju: ${approver?.name || '-'}`);
    line(`Waktu persetujuan: ${approvedAt?.toISOString() || '-'}`);
    const qrData = await QRCode.toDataURL(verificationUrl(document.qr_token), { errorCorrectionLevel: 'M', margin: 1, width: 256 });
    const qr = await pdf.embedPng(Buffer.from(qrData.split(',')[1], 'base64'));
    if (y < 190) newPage();
    page.drawImage(qr, { x: 42, y: y - 105, width: 105, height: 105 });
    page.drawText('Pindai untuk status terkini dan pemeriksaan integritas arsip LPMQ.', { x: 155, y: y - 35, font, size: 9 });
    page.drawText('QR ini bukan tanda tangan elektronik tersertifikasi.', { x: 155, y: y - 51, font, size: 9 });
  }
  return Buffer.from(await pdf.save());
}

// Call inside the same database transaction that approves the document. The caller
// removes paths in createdFiles if that transaction fails.
export async function archiveVerificationPdf(tx, document, user, approvedAt, createdFiles) {
  const bytes = await renderVerificationPdf(document, { approver: user, approvedAt });
  const id = randomUUID();
  await mkdir(storageRoot, { recursive: true });
  const filename = path.join(storageRoot, id);
  await writeFile(filename, bytes, { flag: 'wx' });
  createdFiles.push(filename);
  await tx.storedFile.create({ data: {
    id, owner_id: user.id, mime_type: 'application/pdf', file_size: bytes.length, checksum: fileHash(bytes),
  } });
  return id;
}

export async function cleanupGeneratedFiles(filenames) {
  await Promise.all(filenames.map(name => unlink(name).catch(() => {})));
}

export async function readVerifiedPdf(document) {
  if (!document.file_id) fail(409, 'PDF final belum tersedia.');
  const file = await prisma.storedFile.findUnique({ where: { id: document.file_id } });
  if (!file || file.mime_type !== 'application/pdf') fail(409, 'Arsip PDF final tidak ditemukan.');
  let bytes;
  try { bytes = await readStoredFile(file.id); }
  catch (error) { if (error.code === 'ENOENT') fail(409, 'Arsip PDF final tidak ditemukan.'); throw error; }
  if (fileHash(bytes) !== file.checksum) fail(409, 'Integritas arsip PDF tidak cocok dengan checksum yang tersimpan.');
  return bytes;
}

export async function publicVerification(token, candidate = null) {
  if (!/^[0-9a-f-]{36}$/i.test(token)) fail(404, 'Dokumen tidak ditemukan.');
  const doc = await prisma.verificationDocument.findUnique({ where: { qr_token: token }, include: {
    created_by: { select: { name: true } }, approved_by: { select: { name: true } },
  } });
  if (!doc || !doc.file_id || !doc.approved_at) fail(404, 'Dokumen belum diterbitkan untuk verifikasi publik.');
  const archive = await prisma.storedFile.findUnique({ where: { id: doc.file_id } });
  let archiveMatches = false;
  if (archive?.mime_type === 'application/pdf') {
    try { archiveMatches = fileHash(await readStoredFile(archive.id)) === archive.checksum; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const superseded = await prisma.verificationDocument.findFirst({ where: {
    registration_id: doc.registration_id, document_type: doc.document_type, version: { gt: doc.version },
    approved_at: { not: null },
  }, select: { version: true }, orderBy: { version: 'desc' } });
  return {
    document_type: doc.document_type, document_no: doc.document_no, version: doc.version,
    status: doc.status, created_by: doc.created_by?.name || null,
    approved_by: doc.approved_by?.name || null, approved_at: doc.approved_at,
    superseded_by_version: superseded?.version || null,
    archive_integrity: archiveMatches ? 'MATCH' : 'MISMATCH',
    checked_file_integrity: candidate ? (archiveMatches && fileHash(candidate) === archive.checksum ? 'MATCH' : 'MISMATCH') : null,
    verification_type: 'LPMQ_INTERNAL',
  };
}
