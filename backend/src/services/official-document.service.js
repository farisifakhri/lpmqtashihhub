import { randomUUID } from 'node:crypto';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { prisma } from '../config/database.js';
import { fail, requireRole, registration, requireStatus, audit } from './workflow-utils.js';

export const createDocument = (id, data, user) => prisma.$transaction(async tx => {
  requireRole(user, ['DISTRIBUTOR', 'DOKUMENTATOR', 'SUPERADMIN']);
  const reg = await registration(tx, id);
  requireStatus(reg, ['READY_FOR_STT']);
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
  const document = await prisma.officialDocument.findUnique({ where: { id }, include: { registration: { select: { publisher_id: true } } } });
  if (!document) fail(404, 'Dokumen tidak ditemukan.');
  requireRole(user, ['ADMIN_PENERBIT', 'DISTRIBUTOR', 'DOKUMENTATOR', 'KEPALA_LPMQ', 'SUPERADMIN']);
  if (user.roles.includes('ADMIN_PENERBIT') && (!user.publisherId || document.registration.publisher_id !== user.publisherId || document.status !== 'ISSUED')) fail(403, 'Dokumen ini belum tersedia untuk akun penerbit Anda. Dokumen hanya dapat diunduh setelah diterbitkan untuk pengajuan milik penerbit Anda.');
  return document;
}

export async function renderDraft(document) {
  if (!document.content_snapshot || document.status !== 'DRAFT') fail(409, 'PDF draf belum tersedia untuk dokumen ini.');
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  let page;
  let y;
  function newPage() {
    page = pdf.addPage([595, 842]); y = 755;
    page.drawText('DRAF - BELUM DITETAPKAN / BELUM DITANDATANGANI', { x: 40, y: 800, font, size: 10, color: rgb(0.65, 0.1, 0.1) });
  }
  newPage();
  const lines = [document.document_type, document.document_no, `Versi: ${document.version}`, ...JSON.stringify(document.content_snapshot, null, 2).split('\n')];
  for (const line of lines) {
    let text = '';
    for (const character of line) {
      try { font.encodeText(character); }
      catch { fail(422, 'PDF draf belum dapat dibuat karena ada karakter, misalnya huruf Arab, yang belum didukung. Data draf tetap tersimpan. Hubungi administrator untuk dukungan huruf pada dokumen; jangan mengubah isi naskah hanya untuk mengatasi kendala ini.'); }
      if (font.widthOfTextAtSize(text + character, 10) > 510) {
        if (y < 45) newPage();
        page.drawText(text, { x: 40, y, font, size: 10 }); y -= 14; text = '';
      }
      text += character;
    }
    if (y < 45) newPage();
    page.drawText(text, { x: 40, y, font, size: 10 }); y -= 14;
  }
  return Buffer.from(await pdf.save());
}

export async function signDocument(id, user) {
  // No technical administrator bypass for the authority to issue state documents.
  requireRole(user, ['KEPALA_LPMQ']);
  await getDocument(id, user);
  fail(409, 'Dokumen belum dapat ditetapkan karena format resmi dan alur penandatanganan masih menunggu keputusan stakeholder. Dokumen tetap berstatus draf; hubungi pengelola layanan untuk informasi tindak lanjut.');
}
