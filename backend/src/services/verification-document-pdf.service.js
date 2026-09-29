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
const letterheadLogo = fileURLToPath(new URL('../assets/lpmq-letterhead.png', import.meta.url));
const label = {
  NOTA_DINAS_VERIFIKASI: 'NOTA DINAS PENUGASAN VERIFIKASI',
  SURAT_HASIL_VERIFIKASI: 'SURAT HASIL VERIFIKASI',
  SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI: 'SURAT PEMBERITAHUAN HASIL VERIFIKASI',
  BERITA_ACARA_VERIFIKASI: 'BERITA ACARA VERIFIKASI',
};
export const fileHash = bytes => createHash('sha256').update(bytes).digest('hex');
export const verificationUrl = token => `${ENV.PUBLIC_APP_URL?.replace(/\/$/, '')}/verify-internal/${token}`;

function safeText(value, font) {
  const text = String(value ?? '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ');
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
  const logo = await pdf.embedPng(await readFile(letterheadLogo));
  let page;
  let y;
  const newPage = () => {
    page = pdf.addPage([595, 842]);
    page.drawImage(logo, { x: 42, y: 747, width: 58, height: 55 });
    page.drawText('KEMENTERIAN AGAMA REPUBLIK INDONESIA', { x: 111, y: 791, font: bold, size: 11 });
    page.drawText('LAJNAH PENTASHIHAN MUSHAF AL-QURAN', { x: 111, y: 774, font: bold, size: 11 });
    page.drawText('Gedung Bayt Al-Quran & Museum Istiqlal, Jl. Raya TMII Pintu I', { x: 111, y: 758, font, size: 8 });
    page.drawText('Jakarta Timur 13560  |  lajnah@kemenag.go.id', { x: 111, y: 746, font, size: 8 });
    page.drawLine({ start: { x: 42, y: 738 }, end: { x: 553, y: 738 }, thickness: 1.4 });
    y = 710;
    if (draft) page.drawText('DRAF - BELUM DISETUJUI', { x: 409, y: 810, font: bold, size: 9, color: rgb(0.7, 0.1, 0.1) });
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
  const content = document.content_snapshot || {};
  const date = approvedAt || (content.assigned_at ? new Date(content.assigned_at) : new Date(content.submitted_at || content.saved_at || Date.now()));
  const dateLabel = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
  newPage();
  if (document.document_type === 'NOTA_DINAS_VERIFIKASI') {
    line('NOTA DINAS', true);
    line(`Nomor: ${document.document_no || 'Belum diberi nomor'}`);
    y -= 8;
    line(`Tanggal: ${dateLabel}`);
    line(`Dari: ${content.assigned_by_name || 'Helper Admin LPMQ'}`);
    line(`Kepada: ${content.verifier_name || '-'}`);
    line('Hal: Penugasan verifikasi naskah mushaf Al-Quran');
    y -= 12;
    line(`Dengan ini Saudara ditugaskan memeriksa naskah ${content.title || '-'} dengan nomor registrasi ${content.registration_no || '-'}.`);
    line(`Master fisik diterima di loket dengan tanda terima ${content.physical_receipt_no || '-'} (${content.volume_count || '-'} jilid).`);
    line(`Batas penyelesaian: ${content.due_at ? new Date(content.due_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }) : '-'}.`);
    y -= 8;
    line('Ruang lingkup pemeriksaan:', true);
    line('1. Kesesuaian data registrasi dan identitas penerbit.');
    line('2. Kelengkapan dan keabsahan berkas digital.');
    line('3. Kesesuaian master fisik A4 per juz dengan tanda terima loket.');
    line('4. Pemeriksaan awal format rasm, harakat, dan tanda baca.');
    if (content.notes) { y -= 8; line(`Catatan penugasan: ${content.notes}`); }
    y -= 12;
    line('Demikian nota dinas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.');
    y -= 15;
    line('Helper Admin LPMQ,');
    y -= 30;
    line(content.assigned_by_name || '-');
  } else if (['SURAT_HASIL_VERIFIKASI', 'SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI'].includes(document.document_type)) {
    line(`Nomor: ${document.document_no || 'Belum diberi nomor'}`);
    line(`Tanggal: ${dateLabel}`);
    line('Sifat: Biasa');
    line('Lampiran: -');
    line(`Hal: ${content.decision === 'PASSED' ? 'Hasil verifikasi dan pemberitahuan PNBP' : 'Hasil verifikasi - tidak lolos'}`);
    y -= 10;
    line(`Yth. Pimpinan ${content.publisher_name || 'Penerbit'}`);
    line(`di ${content.publisher_address || 'alamat terdaftar'}`);
    y -= 8;
    line("Assalamu'alaikum wr. wb.");
    y -= 8;
    for (const paragraph of String(content.letter_text || content.notes || '').split(/\r?\n/)) {
      if (paragraph.trim()) line(paragraph);
      else y -= 9;
    }
    if (content.decision === 'PASSED' && content.billing_no) {
      y -= 10;
      line('Informasi pembayaran PNBP', true);
      line(`Kode billing: ${content.billing_no}`, true);
      line(`Jumlah tagihan: Rp ${Number(content.billing_amount || 0).toLocaleString('id-ID')}`);
      if (content.billing_expires_at) line(`Berlaku sampai: ${new Date(content.billing_expires_at).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB`);
      line('Gunakan kode billing di atas untuk pembayaran, lalu unggah bukti bayar pada portal LPMQ.');
    }
    y -= 8;
    line('Demikian surat ini kami sampaikan. Atas perhatian dan kerja sama Saudara, kami ucapkan terima kasih.');
    y -= 8;
    line("Wassalamu'alaikum wr. wb.");
    y -= 12;
    line(`Diperiksa dan ditandatangani internal oleh Verifikator: ${content.verifier_name || '-'}`);
    y -= 8;
    line("Kepala Lajnah Pentashihan Mushaf Al-Quran,");
    y -= 28;
    line(draft ? '(Menunggu persetujuan)' : approver?.name || '-');
  } else {
    line(label[document.document_type] || document.document_type, true);
    line(`Nomor: ${document.document_no || 'Belum diberi nomor'}`);
    line(`Pengajuan: ${content.registration_no || '-'}`);
    line(`Naskah: ${content.title || '-'}`);
    line(`Keputusan: ${content.decision || '-'}`);
    line(`Verifikator: ${content.verifier_name || '-'}`);
    y -= 8;
    for (const paragraph of String(content.letter_text || content.notes || '').split(/\r?\n/)) {
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
