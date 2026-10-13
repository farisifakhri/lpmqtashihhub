import { randomUUID, createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { prisma } from '../config/database.js';
import { fail, requireRole, registration, requireStatus, audit, move } from './workflow-utils.js';
import { readStoredFile } from './storage.service.js';

const letterheadLogo = fileURLToPath(new URL('../assets/lpmq-letterhead.png', import.meta.url));

export const createDocument = (id, data, user) => prisma.$transaction(async tx => {
  requireRole(user, ['ADMIN_INTERNAL', 'DISTRIBUTOR', 'DOKUMENTATOR', 'SUPERADMIN']);
  const reg = await registration(tx, id);
  if (data.document_type === 'SURAT_TANDA_TASHIH') {
    const verifiedPayment = await tx.paymentRecord.findFirst({
      where: { registration_id: id, status: 'VERIFIED' },
    });
    if (!verifiedPayment && !['READY_FOR_STT', 'STT_ISSUED'].includes(reg.status)) {
      fail(409, 'Draf Surat Tanda Tashih (STT) baru dapat dibuat setelah setoran PNBP diverifikasi lunas.');
    }
  } else {
    requireStatus(reg, ['READY_FOR_STT']);
  }
  if (reg.core_team_number && !user.roles.includes('ADMIN_INTERNAL') && !user.roles.includes('SUPERADMIN') && ![reg.core_distributor_id, reg.core_documenter_id].includes(user.id)) fail(403, 'Dokumen ini hanya dapat dibuat oleh tim inti pengajuan.');
  const source = await tx.registration.findUnique({ where: { id }, include: {
    publisher: { select: { legal_name: true } },
    verification_assignments: { select: { notes: true, decision: true, verifier: { select: { name: true } } } },
    assignments: { include: { reviews: true, assignee: { select: { name: true } }, team: { select: { name: true, decree_no: true } } } },
  } });
  const last = await tx.officialDocument.findFirst({ where: { registration_id: id, document_type: data.document_type }, orderBy: { version: 'desc' } });
  if (last && last.status === 'DRAFT' && data.reuse_existing_draft) {
    return last;
  }
  if (last && last.status !== 'DRAFT' && data.document_type !== 'SURAT_TANDA_TASHIH') fail(409, 'Dokumen yang telah ditetapkan tidak dapat dibuat ulang melalui aksi draf.');
  const snapshot = {
    title: reg.title, registration_no: reg.registration_no, publisher: source?.publisher?.legal_name || 'Penerbit Terdaftar',
    fee_sla: reg.fee_sla_snapshot, verification: source?.verification_assignments || [],
    assignments: (source?.assignments || []).map(item => ({ stage: item.stage, iteration: item.iteration, assignee: item.assignee?.name, team: item.team, status: item.status, due_at: item.due_at, reviews: item.reviews })),
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
  requireRole(user, ['PENERBIT', 'ADMIN_INTERNAL', 'DISTRIBUTOR', 'DOKUMENTATOR', 'KEPALA_LPMQ', 'SUPERADMIN']);
  if (user.roles.includes('PENERBIT') && !user.roles.some(role => ['ADMIN_INTERNAL', 'DOKUMENTATOR', 'SUPERADMIN'].includes(role))
    && (!user.publisherId || document.registration.publisher_id !== user.publisherId)) fail(403, 'Dokumen ini bukan milik penerbit Anda.');
  if (document.registration.core_team_number && !user.roles.some(role => ['PENERBIT', 'ADMIN_INTERNAL', 'DOKUMENTATOR', 'KEPALA_LPMQ', 'SUPERADMIN'].includes(role))
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

export const requestSttFromAdmin = (id, data, user, req) => prisma.$transaction(async tx => {
  requireRole(user, ['DISTRIBUTOR', 'SUPERADMIN']);
  const reg = await registration(tx, id);
  if (reg.core_team_number && reg.core_distributor_id !== user.id && !user.roles.includes('SUPERADMIN')) {
    fail(403, 'Hanya distributor tim inti yang dapat mengajukan STT.');
  }

  const lastAssignment = await tx.assignment.findFirst({
    where: { registration_id: id },
    orderBy: { iteration: 'desc' },
  });
  if (!lastAssignment) {
    fail(409, 'Naskah belum memiliki riwayat sidang pentashihan.');
  }

  const activeAssignments = await tx.assignment.findMany({
    where: { registration_id: id, iteration: lastAssignment.iteration },
    include: { reviews: true },
  });
  if (activeAssignments.some(item => item.status !== 'COMPLETED' || !item.reviews.length)) {
    fail(409, 'Masih ada pentashih yang belum menyelesaikan sidang telaah.');
  }
  if (activeAssignments.some(item => item.reviews.some(r => r.result !== 'PASSED'))) {
    fail(409, 'Pengajuan STT tidak dapat diproses karena ada hasil telaah yang belum lulus.');
  }

  if (reg.status === 'TASHIH_IN_PROGRESS') {
    await move(tx, reg, 'READY_FOR_STT', user, 'Sidang pentashihan selesai, distributor mengajukan STT ke Admin', req);
  }

  const admins = await tx.userRole.findMany({
    where: { role: { code: { in: ['ADMIN_INTERNAL', 'SUPERADMIN'] } } },
    select: { user_id: true },
  });
  for (const admin of admins) {
    await tx.notification.create({
      data: {
        user_id: admin.user_id,
        registration_id: id,
        type: 'STT_REQUEST',
        title: 'Permintaan Penerbitan Draf STT',
        payload: {
          link: `/internal/distributions`,
          registration_no: reg.registration_no,
          notes: data?.notes || 'Sidang pentashihan telah lengkap & disetujui.',
        },
      },
    });
  }

  await audit(tx, user, 'REQUEST_STT_FROM_ADMIN', 'Registration', id, { notes: data?.notes }, req);
  return { success: true, message: 'Permintaan penerbitan STT berhasil dikirimkan ke Admin Internal.' };
}, { isolationLevel: 'ReadCommitted' });

export const sendDraftToDistributor = (documentId, user, req) => prisma.$transaction(async tx => {
  requireRole(user, ['ADMIN_INTERNAL', 'SUPERADMIN']);
  const doc = await tx.officialDocument.findUnique({
    where: { id: documentId },
    include: { registration: true },
  });
  if (!doc) fail(404, 'Dokumen draf STT tidak ditemukan.');
  if (doc.status !== 'DRAFT') fail(409, 'Hanya draf dokumen yang dapat dikirimkan ke distributor.');

  const snapshot = typeof doc.content_snapshot === 'string' ? JSON.parse(doc.content_snapshot) : (doc.content_snapshot || {});
  snapshot.admin_draft_ready = true;
  snapshot.admin_sent_at = new Date().toISOString();
  snapshot.admin_sent_by = { id: user.id, name: user.name };

  const updated = await tx.officialDocument.update({
    where: { id: documentId },
    data: { content_snapshot: snapshot },
  });

  const distributorId = doc.registration.core_distributor_id;
  if (distributorId) {
    await tx.notification.create({
      data: {
        user_id: distributorId,
        registration_id: doc.registration_id,
        type: 'STT_DRAFT_SENT',
        title: 'Draf STT Siap untuk Pengesahan TU',
        payload: {
          document_id: doc.id,
          link: `/internal/documents`,
          message: 'Admin telah menyelesaikan draf STT. Silakan teruskan ke Tata Usaha (TU).',
        },
      },
    });
  }

  await audit(tx, user, 'SEND_STT_DRAFT_TO_DISTRIBUTOR', 'OfficialDocument', documentId, snapshot, req);
  return updated;
}, { isolationLevel: 'ReadCommitted' });

export const submitToTu = (documentId, data, user, req) => prisma.$transaction(async tx => {
  requireRole(user, ['DISTRIBUTOR', 'ADMIN_INTERNAL', 'SUPERADMIN']);
  const doc = await tx.officialDocument.findUnique({
    where: { id: documentId },
    include: { registration: true, signatories: true },
  });
  if (!doc) fail(404, 'Dokumen draf STT tidak ditemukan.');
  if (doc.status !== 'DRAFT') fail(409, 'Dokumen tidak dalam status draf.');

  const existingSigs = doc.signatories || [];
  
  const findUserByRole = async (code) => {
    const ur = await tx.userRole.findFirst({
      where: { role: { code } },
      include: { user: true },
    });
    return ur?.user;
  };

  const kepala = await findUserByRole('KEPALA_LPMQ') || user;
  const penandatangan1 = data?.signer_1_id 
    ? await tx.user.findUnique({ where: { id: data.signer_1_id } })
    : await findUserByRole('ADMIN_INTERNAL') || user;
  const penandatangan2 = data?.signer_2_id
    ? await tx.user.findUnique({ where: { id: data.signer_2_id } })
    : await findUserByRole('SUPERADMIN') || user;

  const signatoriesConfig = [
    { order: 1, title: 'Penandatangan 1 - Tata Usaha (Paraf 1)', user: penandatangan1 },
    { order: 2, title: 'Penandatangan 2 - Tata Usaha (Paraf 2)', user: penandatangan2 },
    { order: 3, title: 'Kepala Lajnah Pentashihan Mushaf Al-Qur\'an', user: kepala },
  ];

  for (const item of signatoriesConfig) {
    const exists = existingSigs.find(s => s.name_position_snapshot.includes(item.title) || s.name_position_snapshot.includes(`Paraf ${item.order}`));
    if (!exists) {
      await tx.documentSignatory.create({
        data: {
          official_document_id: doc.id,
          signer_user_id: item.user.id,
          name_position_snapshot: `${item.user.name} (${item.title})`,
          method: 'INTERNAL_APPROVAL',
          signing_status: 'PENDING',
        },
      });
    }
  }

  const snapshot = typeof doc.content_snapshot === 'string' ? JSON.parse(doc.content_snapshot) : (doc.content_snapshot || {});
  snapshot.tu_workflow = {
    submitted_at: new Date().toISOString(),
    submitted_by: { id: user.id, name: user.name },
    status: 'SUBMITTED_TO_TU',
  };

  const updated = await tx.officialDocument.update({
    where: { id: doc.id },
    data: { content_snapshot: snapshot },
    include: { signatories: true },
  });

  await audit(tx, user, 'SUBMIT_STT_TO_TU', 'OfficialDocument', doc.id, snapshot, req);
  return updated;
}, { isolationLevel: 'ReadCommitted' });

export const parafDocument = (documentId, order, data, user, req) => prisma.$transaction(async tx => {
  requireRole(user, ['ADMIN_INTERNAL', 'SUPERADMIN', 'KEPALA_LPMQ']);
  const doc = await tx.officialDocument.findUnique({
    where: { id: documentId },
    include: { signatories: true, registration: true },
  });
  if (!doc) fail(404, 'Dokumen STT tidak ditemukan.');
  if (doc.status !== 'DRAFT') fail(409, 'Dokumen tidak dalam status draf.');

  const orderTitle = order === 1 ? 'Paraf 1' : 'Paraf 2';
  const sig = doc.signatories.find(s => s.name_position_snapshot.includes(orderTitle))
    || doc.signatories[order - 1];

  if (sig) {
    await tx.documentSignatory.update({
      where: { id: sig.id },
      data: {
        signing_status: 'SIGNED',
        signed_at: new Date(),
        method: 'INTERNAL_APPROVAL',
      },
    });
  }

  const snapshot = typeof doc.content_snapshot === 'string' ? JSON.parse(doc.content_snapshot) : (doc.content_snapshot || {});
  if (!snapshot.tu_workflow) snapshot.tu_workflow = {};
  snapshot.tu_workflow[`paraf_${order}`] = {
    signed_by: { id: user.id, name: user.name, nip: user.nip || '-' },
    signed_at: new Date().toISOString(),
    notes: data?.notes || 'Disetujui dan dibubuhi paraf resmi Tata Usaha.',
  };

  const updated = await tx.officialDocument.update({
    where: { id: doc.id },
    data: { content_snapshot: snapshot },
    include: { signatories: true },
  });

  await audit(tx, user, `PARAF_STT_ORDER_${order}`, 'OfficialDocument', doc.id, { order, notes: data?.notes }, req);
  return updated;
}, { isolationLevel: 'ReadCommitted' });

export const signDocument = (id, user, req) => prisma.$transaction(async tx => {
  requireRole(user, ['KEPALA_LPMQ']);
  const doc = await tx.officialDocument.findUnique({
    where: { id },
    include: { signatories: true, registration: true },
  });
  if (!doc) fail(404, 'Dokumen tidak ditemukan.');
  if (doc.document_type !== 'SURAT_TANDA_TASHIH') {
    fail(409, 'Dokumen belum dapat ditetapkan karena format resmi dan alur penandatanganan masih menunggu keputusan stakeholder. Dokumen tetap berstatus draf; hubungi pengelola layanan untuk informasi tindak lanjut.');
  }
  if (doc.status === 'ISSUED') fail(409, 'Dokumen ini sudah resmi diterbitkan.');

  const now = new Date();
  const validUntil = new Date(now.getTime() + 2 * 365 * 24 * 60 * 60 * 1000); // 2 tahun kalender

  const year = now.getFullYear();
  const cleanId = doc.id.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase();
  const officialDocNo = doc.document_no.startsWith('DRAFT-')
    ? `STT/LPMQ/${year}/${cleanId}`
    : doc.document_no;

  const kepalaSig = doc.signatories.find(s => s.name_position_snapshot.includes('Kepala') || s.name_position_snapshot.includes('LPMQ'));
  if (kepalaSig) {
    await tx.documentSignatory.update({
      where: { id: kepalaSig.id },
      data: {
        signing_status: 'SIGNED',
        signed_at: now,
        method: 'INTERNAL_APPROVAL',
      },
    });
  }

  const snapshot = typeof doc.content_snapshot === 'string' ? JSON.parse(doc.content_snapshot) : (doc.content_snapshot || {});
  snapshot.final_signature = {
    signed_by: { id: user.id, name: user.name, title: 'Kepala Lajnah Pentashihan Mushaf Al-Qur\'an' },
    signed_at: now.toISOString(),
    method: 'INTERNAL_DIGITAL_SIGNATURE',
    valid_until: validUntil.toISOString(),
  };

  const updatedDoc = await tx.officialDocument.update({
    where: { id },
    data: {
      document_no: officialDocNo,
      status: 'ISSUED',
      issued_at: now,
      valid_until: validUntil,
      qr_token: randomUUID(),
      content_snapshot: snapshot,
    },
    include: { signatories: true },
  });

  const reg = await registration(tx, doc.registration_id);
  if (reg.status !== 'STT_ISSUED') {
    await move(tx, reg, 'STT_ISSUED', user, 'Surat Tanda Tashih (STT) resmi telah disahkan dan diterbitkan oleh Kepala LPMQ', req);
  }

  const publisherUser = await tx.publisher.findUnique({
    where: { id: reg.publisher_id },
    select: { user_id: true },
  });
  if (publisherUser?.user_id) {
    await tx.notification.create({
      data: {
        user_id: publisherUser.user_id,
        registration_id: reg.id,
        type: 'STT_ISSUED',
        title: 'Surat Tanda Tashih (STT) Resmi Terbit',
        payload: {
          document_id: doc.id,
          document_no: officialDocNo,
          link: '/publisher/documents',
          message: `Surat Tanda Tashih untuk ${reg.title} telah diterbitkan dan berlaku selama 2 tahun.`,
        },
      },
    });
  }

  await audit(tx, user, 'SIGN_OFFICIAL_DOCUMENT', 'OfficialDocument', id, { document_no: officialDocNo, valid_until: validUntil }, req);
  return updatedDoc;
}, { isolationLevel: 'ReadCommitted' });
