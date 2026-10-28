import { prisma } from '../config/database.js';
import { fail } from './workflow-utils.js';

export async function listDocumentArchive(registrationId, user, db = prisma) {
  const registration = await db.registration.findUnique({
    where: { id: registrationId },
    select: {
      id: true,
      publisher_id: true,
      registration_no: true,
      title: true,
      created_at: true,
      foreign_metadata: true,
      publisher: { select: { legal_name: true } },
      manuscript_files: {
        where: { type: 'SURAT_PERMOHONAN' },
        orderBy: { version: 'desc' },
        take: 1,
      },
    },
  });
  if (!registration) fail(404, 'Pengajuan tidak ditemukan.');

  const roles = user.roles || [];
  const internal = roles.some(role => ['ADMIN_INTERNAL', 'DOKUMENTATOR', 'SUPERADMIN', 'KEPALA_LPMQ'].includes(role));
  const owner = roles.includes('PENERBIT') && user.publisherId === registration.publisher_id;
  const assignedVerifier = roles.includes('VERIFIKATOR') && Boolean(await db.verificationAssignment.findFirst({ where: { registration_id: registrationId, verifier_id: user.id }, select: { id: true } }));
  if (!internal && !owner && !assignedVerifier) fail(403, 'Akses arsip dokumen ditolak.');

  const [verification, official] = await Promise.all([
    db.verificationDocument.findMany({
      where: { registration_id: registrationId },
      select: {
        id: true, document_type: true, document_no: true, version: true,
        status: true, content_snapshot: true, file_id: true, created_at: true, updated_at: true, sent_at: true,
        created_by: { select: { name: true } },
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
  const permohonanFileId = registration.manuscript_files?.[0]?.file_id || registration.foreign_metadata?.surat_permohonan_file_id;
  const applicationDocs = permohonanFileId ? [{
    id: `app-permohonan-${registration.id}`,
    document_type: 'SURAT_PERMOHONAN',
    document_no: `SP-${registration.registration_no || registration.id.slice(0, 8)}`,
    version: 1,
    status: 'ISSUED',
    source: 'APPLICATION',
    file_id: permohonanFileId,
    created_at: registration.created_at,
    content_snapshot: {
      title: `Surat Permohonan Tanda Tashih — ${registration.title || ''}`,
      publisher_name: registration.publisher?.legal_name || 'Penerbit',
      notes: 'Surat permohonan resmi tanda tashih naskah mushaf yang diajukan penerbit saat pendaftaran.',
    },
  }] : [];

  return [
    ...applicationDocs,
    ...verification.map(item => ({ ...item, source: 'VERIFICATION' })),
    ...official.map(item => ({ ...item, source: 'OFFICIAL' })),
  ];
}
