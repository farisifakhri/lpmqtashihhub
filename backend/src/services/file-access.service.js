import { prisma } from '../config/database.js';
import { fail } from './workflow-utils.js';

export async function assertManuscriptAccess(reg, user, write = false, db = prisma) {
  if (!reg) fail(404, 'Pengajuan tidak ditemukan.');
  if (user.roles.includes('SUPERADMIN')) return;
  if (user.roles.includes('ADMIN_PENERBIT')) {
    if (!user.publisherId || reg.publisher_id !== user.publisherId) fail(403, 'Akses berkas ditolak.');
    if (write && !['DRAFT', 'REVISION_REQUIRED'].includes(reg.status)) fail(409, 'Naskah tidak dapat ditambahkan pada tahap ini. Unggah naskah saat pengajuan masih draf atau setelah petugas meminta perbaikan kepada penerbit.');
    return;
  }
  if (write) fail(403, 'Berkas naskah hanya dapat ditambahkan oleh penerbit atau administrator.');
  const verification = user.roles.includes('VERIFIKATOR') && await db.verificationAssignment.findFirst({
    where: { registration_id: reg.id, verifier_id: user.id, status: { in: ['ASSIGNED', 'IN_PROGRESS'] } },
  });
  const assignment = user.roles.includes('PENTASHIH') && await db.assignment.findFirst({
    where: { registration_id: reg.id, assignee_id: user.id, status: { in: ['ASSIGNED', 'IN_PROGRESS', 'OVERDUE'] } },
  });
  if (!verification && !assignment) fail(403, 'Anda belum memiliki penugasan aktif untuk membaca naskah ini, atau tugas Anda sudah selesai. Hubungi pengelola penugasan jika Anda masih perlu mengaksesnya.');
}
