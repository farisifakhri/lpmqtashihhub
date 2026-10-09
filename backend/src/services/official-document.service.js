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
      page.drawImage(logo, { x: 45, y: 744, width: 54, height: 50 });
      const kopLines = [
        { text: 'KEMENTERIAN AGAMA REPUBLIK INDONESIA', font: bold, size: 12 },
        { text: "LAJNAH PENTASHIHAN MUSHAF AL-QUR'AN", font: bold, size: 12 },
        { text: "Gedung Bayt Al-Qur'an & Museum Istiqlal, Jalan Raya TMII Pintu I Jakarta Timur 13560", font, size: 8 },
        { text: 'Telp: (021) 87798807, 8416466, 8416467, 8416468 Fax: (021) 87798807', font, size: 8 },
        { text: 'Website: http://lajnah.kemenag.go.id Email : lajnah@kemenag.go.id', font, size: 8 },
      ];

      let curY = 786;
      for (const item of kopLines) {
        const textW = item.font.widthOfTextAtSize(item.text, item.size);
        page.drawText(item.text, {
          x: (595 - textW) / 2,
          y: curY,
          font: item.font,
          size: item.size,
          color: rgb(0.08, 0.08, 0.08),
        });
        curY -= item.size === 12 ? 14 : 11;
      }

      page.drawLine({ start: { x: 45, y: 728 }, end: { x: 550, y: 728 }, thickness: 1.8, color: rgb(0.08, 0.08, 0.08) });
      y = 708;
    } else {
      y = 780;
    }
    page.drawText('DRAF - BELUM DITETAPKAN / BELUM DITANDATANGANI', { x: 45, y: y + 8, font: bold, size: 8.5, color: rgb(0.75, 0.1, 0.1) });
    y -= 10;
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

  const isRevisionLetter = document.document_type === 'REVISION_RETURN_LETTER';
  const docTitle = document.document_type === 'SURAT_TANDA_TASHIH'
    ? 'SURAT TANDA TASHIH (DRAF)'
    : (document.document_type === 'BERITA_ACARA_TASHIH'
      ? 'BERITA ACARA SIDANG PENTASHIHAN (DRAF)'
      : (isRevisionLetter
        ? 'SURAT PENGEMBALIAN DAN CATATAN HASIL TASHIH'
        : `${document.document_type} (DRAF)`));

  printLine(docTitle, true, 13);
  printLine(`Nomor Dokumen: ${document.document_no}  |  Versi: ${document.version}`, false, 9);
  y -= 8;

  printLine('INFORMASI NASKAH MUSHAF AL-QURAN', true, 10);
  printLine(`Judul Naskah       : ${snap.title || '-'}`, false, 9, 52);
  printLine(`Nomor Registrasi   : ${snap.registration_no || '-'}`, false, 9, 52);
  printLine(`Penerbit Pemohon   : ${snap.publisher || '-'}`, false, 9, 52);
  y -= 8;

  if (isRevisionLetter) {
    printLine('STATUS SIDANG DAN TAHAP PERBAIKAN', true, 10);
    printLine(`Ronde Perbaikan    : Ke-${snap.revision_round || document.version || 1}`, false, 9, 52);
    printLine(`Jenis Naskah       : ${snap.revision_kind === 'NASKAH_DUMI' ? 'Naskah Dumi (Pemeriksaan Cetak Akhir)' : 'Naskah Perbaikan (Koreksi Teks/Rasm)'}`, false, 9, 52);
    printLine(`Petugas Distributor: ${snap.distributor_name || 'Koordinator Distribusi LPMQ'}`, false, 9, 52);
    y -= 8;

    printLine('CATATAN DAN ARAHAN KOREKSI RESMI', true, 10);
    const noteText = String(snap.notes || '-');
    const noteLines = noteText.split('\n');
    for (const nl of noteLines) {
      if (nl.trim()) printLine(nl.trim(), false, 8.5, 52);
    }
    y -= 8;

    printLine('CATATAN PERSURATAN RESMI', true, 10);
    printLine('1. Naskah wajib diperbaiki dan dikembalikan ke Lajnah Pentashihan Mushaf Al-Qur\'an sesuai tenggat waktu.', false, 8.5, 52);
    printLine('2. Dokumen ini mengikat sebagai risalah koreksi resmi Kementerian Agama Republik Indonesia.', false, 8.5, 52);

    return Buffer.from(await pdf.save());
  }

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
  if (document.status === 'DRAFT' || document.document_type === 'REVISION_RETURN_LETTER') return renderDraft(document);
  if (document.status !== 'ISSUED' || (document.valid_until && document.valid_until < new Date())) fail(409, 'Dokumen belum diterbitkan atau sudah tidak berlaku. Hubungi pengelola layanan.');
  if (!document.file_id) return renderDraft(document);
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
