import { prisma } from '../config/database.js';
import { fail } from './workflow-utils.js';

export async function listDocumentArchive(registrationId, user, db = prisma) {
  const registration = await db.registration.findUnique({
    where: { id: registrationId },
    select: { id: true, publisher_id: true },
  });
  if (!registration) fail(404, 'Pengajuan tidak ditemukan.');

  const roles = user.roles || [];
  const internal = roles.some(role => ['HELPER_ADMIN', 'DOKUMENTATOR', 'SUPERADMIN'].includes(role));
  const owner = roles.includes('ADMIN_PENERBIT') && user.publisherId === registration.publisher_id;
  if (!internal && !owner) fail(403, 'Akses arsip dokumen ditolak.');

  const [verification, official] = await Promise.all([
    db.verificationDocument.findMany({
      where: { registration_id: registrationId },
      select: {
        id: true, document_type: true, document_no: true, version: true,
        status: true, content_snapshot: true, file_id: true, created_at: true,
      },
      orderBy: [{ document_type: 'asc' }, { version: 'desc' }],
    }),
    db.officialDocument.findMany({
      where: { registration_id: registrationId },
      select: {
        id: true, document_type: true, document_no: true, version: true,
        status: true, content_snapshot: true, file_id: true, created_at: true,
      },
      orderBy: [{ document_type: 'asc' }, { version: 'desc' }],
    }),
  ]);
  return [
    ...verification.map(item => ({ ...item, source: 'VERIFICATION' })),
    ...official.map(item => ({ ...item, source: 'OFFICIAL' })),
  ];
}
