import { randomUUID, createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { prisma } from '../config/database.js';
import { fail, requireRole, registration, requireStatus, audit } from './workflow-utils.js';
import { readStoredFile } from './storage.service.js';

const letterheadLogo = fileURLToPath(new URL('../assets/lpmq-letterhead.png', import.meta.url));

export const createDocument = (id, data, user) => prisma.$transaction(async tx => {
  requireRole(user, ['DISTRIBUTOR', 'DOKUMENTATOR', 'SUPERADMIN']);
  const reg = await registration(tx, id);
  requireStatus(reg, ['READY_FOR_STT']);
  if (reg.core_team_number && ![reg.core_distributor_id, reg.core_documenter_id].includes(user.id)) fail(403, 'Dokumen ini hanya dapat dibuat oleh tim inti pengajuan.');
  const source = await tx.registration.findUnique({ where: { id }, include: {
    publisher: { select: { legal_name: true } },
    verification_assignments: { select: { notes: true, decision: true, verifier: { select: { name: true } } } },
    assignments: { include: { reviews: true, assignee: { select: { name: true } }, team: { select: { name: true, decree_no: true } } } },
  } });
  const last = await tx.officialDocument.findFirst({ where: { registration_id: id, document_type: data.document_type }, orderBy: { version: 'desc' } });
  if (last && last.status !== 'DRAFT') fail(409, 'Dokumen yang telah ditetapkan tidak dapat dibuat ulang melalui aksi draf.');
  const snapshot = {
    title: reg.title, registration_no: reg.registration_no, publisher: source.publisher.legal_name,
    fee_sla: reg.fee_sla_snapshot, verification: source.verification_assignments,
    assignments: source.assignments.map(item => ({ stage: item.stage, iteration: item.iteration, assignee: item.assignee.name, team: item.team, status: item.status, due_at: item.due_at, reviews: item.reviews })),
  };
  const document = await tx.officialDocument.create({ data: {
    registration_id: id, document_type: data.document_type, document_no: `DRAFT-${randomUUID()}`,
    version: (last?.version || 0) + 1, content_snapshot: JSON.parse(JSON.stringify(snapshot)),
  } });
  await audit(tx, user, 'CREATE_DOCUMENT_DRAFT', 'OfficialDocument', document.id, document);
  return document;
}, { isolationLevel: 'ReadCommitted' });

export async function getDocument(id, user) {
  const document = await prisma.officialDocument.findUnique({ where: { id }, include: { registration: { select: { publisher_id: true, core_team_number: true, core_distributor_id: true, core_documenter_id: true } } } });
  if (!document) fail(404, 'Dokumen tidak ditemukan.');
  requireRole(user, ['ADMIN_PENERBIT', 'HELPER_ADMIN', 'DISTRIBUTOR', 'DOKUMENTATOR', 'KEPALA_LPMQ', 'SUPERADMIN']);
  if (user.roles.includes('ADMIN_PENERBIT') && !user.roles.some(role => ['HELPER_ADMIN', 'DOKUMENTATOR', 'SUPERADMIN'].includes(role))
    && (!user.publisherId || document.registration.publisher_id !== user.publisherId)) fail(403, 'Dokumen ini bukan milik penerbit Anda.');
  if (document.registration.core_team_number && !user.roles.some(role => ['ADMIN_PENERBIT', 'HELPER_ADMIN', 'DOKUMENTATOR', 'KEPALA_LPMQ', 'SUPERADMIN'].includes(role))
    && ![document.registration.core_distributor_id, document.registration.core_documenter_id].includes(user.id)) fail(403, 'Dokumen ini bukan tugas Anda.');
  return document;
}

export async function renderDraft(document) {
  if (!document.content_snapshot || document.status !== 'DRAFT') fail(409, 'PDF draf belum tersedia untuk dokumen ini.');
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let logo = null;
  try {
    logo = await pdf.embedPng(await readFile(letterheadLogo));
  } catch {}

  let page;
  let y;
  const newPage = () => {
    page = pdf.addPage([595, 842]);
    if (logo) {
      page.drawImage(logo, { x: 42, y: 747, width: 58, height: 55 });
      page.drawText('KEMENTERIAN AGAMA REPUBLIK INDONESIA', { x: 111, y: 791, font: bold, size: 11 });
      page.drawText('LAJNAH PENTASHIHAN MUSHAF AL-QURAN', { x: 111, y: 774, font: bold, size: 11, color: rgb(0.08, 0.38, 0.28) });
      page.drawText('Gedung Bayt Al-Quran & Museum Istiqlal, Jl. Raya TMII Pintu I', { x: 111, y: 758, font, size: 8 });
      page.drawText('Jakarta Timur 13560  |  lajnah@kemenag.go.id', { x: 111, y: 746, font, size: 8 });
      page.drawLine({ start: { x: 42, y: 738 }, end: { x: 553, y: 738 }, thickness: 1.4 });
      y = 710;
    } else {
      y = 780;
    }
    page.drawText('DRAF - BELUM DITETAPKAN / BELUM DITANDATANGANI', { x: 42, y: y + 15, font: bold, size: 9, color: rgb(0.7, 0.1, 0.1) });
  };

  newPage();

  const snap = typeof document.content_snapshot === 'string'
    ? JSON.parse(document.content_snapshot)
    : (document.content_snapshot || {});

  const validateSnapshotEncoding = (obj) => {
    if (!obj) return;
    if (typeof obj === 'string') {
      for (const char of obj) {
        try { font.encodeText(char); }
        catch {
          fail(422, 'PDF draf belum dapat dibuat karena ada karakter, misalnya huruf Arab, yang belum didukung. Data draf tetap tersimpan. Hubungi administrator untuk dukungan huruf pada dokumen; jangan mengubah isi naskah hanya untuk mengatasi kendala ini.');
        }
      }
    } else if (typeof obj === 'object') {
      for (const val of Object.values(obj)) {
        validateSnapshotEncoding(val);
      }
    }
  };
  validateSnapshotEncoding(snap);

  const printLine = (text, isBold = false, size = 10, indent = 42) => {
    const activeFont = isBold ? bold : font;
    const str = String(text ?? '');
    for (const character of str) {
      try { activeFont.encodeText(character); }
      catch {
        fail(422, 'PDF draf belum dapat dibuat karena ada karakter, misalnya huruf Arab, yang belum didukung. Data draf tetap tersimpan. Hubungi administrator untuk dukungan huruf pada dokumen; jangan mengubah isi naskah hanya untuk mengatasi kendala ini.');
      }
    }
    if (y < 60) newPage();
    page.drawText(str, { x: indent, y, font: activeFont, size });
    y -= size + 5;
  };

  const docTitle = document.document_type === 'SURAT_TANDA_TASHIH'
    ? 'SURAT TANDA TASHIH (DRAF)'
    : (document.document_type === 'BERITA_ACARA_TASHIH' ? 'BERITA ACARA SIDANG PENTASHIHAN (DRAF)' : `${document.document_type} (DRAF)`);

  printLine(docTitle, true, 13);
  printLine(`Nomor Dokumen: ${document.document_no}  |  Versi: ${document.version}`, false, 9);
  y -= 8;

  printLine('INFORMASI NASKAH MUSHAF AL-QURAN', true, 10);
  printLine(`Judul Naskah       : ${snap.title || '-'}`, false, 9, 52);
  printLine(`Nomor Registrasi   : ${snap.registration_no || '-'}`, false, 9, 52);
  printLine(`Penerbit Pemohon   : ${snap.publisher || '-'}`, false, 9, 52);
  y -= 8;

  if (snap.verification && snap.verification.length > 0) {
    printLine('RINGKASAN VERIFIKASI AWAL', true, 10);
    snap.verification.forEach((v, idx) => {
      printLine(`${idx + 1}. Verifikator: ${v.verifier?.name || '-'} | Keputusan: ${v.decision || 'SESUAI'}`, false, 9, 52);
      if (v.notes) printLine(`   Catatan: ${v.notes}`, false, 8, 52);
    });
    y -= 8;
  }

  if (snap.assignments && snap.assignments.length > 0) {
    printLine('RIWAYAT SIDANG PENTASHIHAN', true, 10);
    snap.assignments.forEach((a, idx) => {
      printLine(`${idx + 1}. Anggota Sidang: ${a.assignee || '-'} (${a.team?.name || 'Tim Pentashihan'}) - Status: ${a.status || '-'}`, false, 9, 52);
    });
    y -= 8;
  }

  printLine('KETERANGAN DRAF RESMI', true, 10);
  printLine('Dokumen ini merupakan salinan pratinjau resmi draf penetapan LPMQ.', false, 9, 52);
  printLine('Pemberian tanda tangan digital Kepala LPMQ dan penerbitan STT definitif dilakukan setelah seluruh tahapan SOP selesai.', false, 9, 52);

  return Buffer.from(await pdf.save());
}

// Existing issued PDFs are downloaded unchanged: never generate an official
// document from a draft or bypass the pending issuance/signature SOP.
export async function documentPdf(document) {
  if (document.status === 'DRAFT') return renderDraft(document);
  if (document.status !== 'ISSUED' || (document.valid_until && document.valid_until < new Date())) fail(409, 'Dokumen belum diterbitkan atau sudah tidak berlaku. Hubungi pengelola layanan.');
  if (!document.file_id) fail(409, 'Berkas PDF resmi belum tersedia. Hubungi pengelola layanan.');
  const file = await prisma.storedFile.findUnique({ where: { id: document.file_id } });
  if (!file || file.mime_type !== 'application/pdf') fail(409, 'Berkas PDF resmi belum tersedia. Hubungi pengelola layanan.');
  let bytes;
  try { bytes = await readStoredFile(file.id); }
  catch (error) { if (error.code === 'ENOENT') fail(409, 'Berkas PDF resmi belum tersedia. Hubungi pengelola layanan.'); throw error; }
  if (createHash('sha256').update(bytes).digest('hex') !== file.checksum) fail(409, 'Integritas berkas tidak dapat diverifikasi. Hubungi pengelola layanan.');
  return bytes;
}

export async function signDocument(id, user) {
  // No technical administrator bypass for the authority to issue state documents.
  requireRole(user, ['KEPALA_LPMQ']);
  await getDocument(id, user);
  fail(409, 'Dokumen belum dapat ditetapkan karena format resmi dan alur penandatanganan masih menunggu keputusan stakeholder. Dokumen tetap berstatus draf; hubungi pengelola layanan untuk informasi tindak lanjut.');
}
