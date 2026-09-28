import { prisma } from '../config/database.js';
import { fail } from './workflow-utils.js';
import { assertManuscriptAccess } from './file-access.service.js';
import { readStoredFile } from './storage.service.js';

export async function readPrivateFile(id, user) {
  const file = await prisma.storedFile.findUnique({ where: { id } });
  if (!file) fail(404, 'Berkas tidak ditemukan.');
  if (file.owner_id !== user.id && !user.roles.includes('SUPERADMIN')) {
    const manuscript = await prisma.manuscriptFile.findFirst({ where: { file_id: file.id }, include: { registration: true } });
    if (manuscript) await assertManuscriptAccess(manuscript.registration, user);
    else {
      const receipt = await prisma.paymentRecord.findFirst({
        where: { receipt_file_id: file.id },
        include: { registration: true },
      });
      const isInternalStaff = user.roles.some(role => ['VERIFIKATOR', 'HELPER_ADMIN', 'KEPALA_LPMQ'].includes(role));
      const isOwnerPublisher = receipt && user.roles.includes('ADMIN_PENERBIT') && receipt.registration?.publisher_id === user.publisherId;
      if (!receipt || (!isInternalStaff && !isOwnerPublisher)) fail(403, 'Akses berkas ditolak.');
    }
  }
  return { file, bytes: await readStoredFile(file.id) };
}
