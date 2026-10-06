import { prisma } from '../config/database.js';
import { fail } from './workflow-utils.js';
import { assertManuscriptAccess } from './file-access.service.js';
import { readStoredFile } from './storage.service.js';

export async function readPrivateFile(id, user) {
  let file = await prisma.storedFile.findUnique({ where: { id } });
  if (!file) {
    const mFile = await prisma.manuscriptFile.findUnique({ where: { id } });
    if (mFile?.file_id) {
      file = await prisma.storedFile.findUnique({ where: { id: mFile.file_id } });
    }
  }
  if (!file) fail(404, 'Berkas tidak ditemukan.');

  if (file.owner_id !== user.id && !user.roles.includes('SUPERADMIN')) {
    const isInternalStaff = user.roles.some(role =>
      ['VERIFIKATOR', 'VERIFICATOR', 'HELPER_ADMIN', 'KEPALA_LPMQ', 'DOKUMENTATOR', 'DISTRIBUTOR', 'PENTASHIH'].includes(role)
    );

    const manuscript = await prisma.manuscriptFile.findFirst({ where: { file_id: file.id }, include: { registration: true } });
    if (manuscript) {
      await assertManuscriptAccess(manuscript.registration, user);
    } else if (!isInternalStaff) {
      const receipt = await prisma.paymentRecord.findFirst({
        where: { receipt_file_id: file.id },
        include: { registration: true },
      });
      const isOwnerPublisher = receipt && user.roles.includes('ADMIN_PENERBIT') && receipt.registration?.publisher_id === user.publisherId;
      const vDoc = await prisma.verificationDocument.findFirst({
        where: { file_id: file.id },
        include: { registration: true },
      });
      const isVDocPublisher = vDoc && user.roles.includes('ADMIN_PENERBIT') && vDoc.registration?.publisher_id === user.publisherId;

      if (!isOwnerPublisher && !isVDocPublisher && file.owner_id !== user.id) {
        fail(403, 'Akses berkas ditolak.');
      }
    }
  }

  return { file, bytes: await readStoredFile(file.id) };
}
