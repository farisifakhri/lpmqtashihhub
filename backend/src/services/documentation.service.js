import { prisma } from '../config/database.js';
import { fail, requireRole, registration, audit } from './workflow-utils.js';

export async function getDocumentationDetail(id, user) {
  requireRole(user, ['DOKUMENTATOR', 'ADMIN_INTERNAL', 'KEPALA_LPMQ', 'SUPERADMIN']);
  
  const reg = await prisma.registration.findUnique({
    where: { id },
    include: {
      publisher: { select: { id: true, legal_name: true, brand_name: true, email: true } },
      service_type: { select: { id: true, name: true, duration_initial: true } },
      manuscript_files: {
        select: { id: true, file_type: true, file_id: true, file_name: true, file_size: true, created_at: true },
        orderBy: { created_at: 'desc' },
      },
      physical_master_intake: true,
      official_documents: {
        select: {
          id: true,
          document_type: true,
          document_no: true,
          version: true,
          status: true,
          qr_token: true,
          file_id: true,
          issued_at: true,
          valid_until: true,
          content_snapshot: true,
        },
        orderBy: { version: 'desc' },
      },
      documentation_items: {
        orderBy: { checked_at: 'desc' },
      },
    },
  });

  if (!reg) fail(404, 'Pengajuan tidak ditemukan.');

  const metadata = reg.foreign_metadata || {};
  const docArchive = metadata.documentation_archive || null;

  return {
    registration: {
      id: reg.id,
      registration_no: reg.registration_no,
      title: reg.title,
      status: reg.status,
      registration_type: reg.registration_type,
      stage_entered_at: reg.stage_entered_at,
      created_at: reg.created_at,
    },
    publisher: reg.publisher,
    service_type: reg.service_type,
    physical_intake: reg.physical_master_intake,
    manuscript_files: reg.manuscript_files,
    official_documents: reg.official_documents,
    documentation_items: reg.documentation_items,
    documentation_archive: docArchive,
  };
}

export const recordDocumentationArchive = (id, data, user, req) => prisma.$transaction(async tx => {
  requireRole(user, ['DOKUMENTATOR', 'ADMIN_INTERNAL', 'SUPERADMIN']);
  const reg = await registration(tx, id);

  const isBothYes = Boolean(data.has_master_documentation && data.has_received_5_exemplars);

  // 1. Catat / perbarui documentation_items
  let docItem = await tx.documentationItem.findFirst({
    where: { registration_id: id, item_type: 'PHYSICAL_EXEMPLAR_RECEIVED' },
  });

  if (docItem) {
    docItem = await tx.documentationItem.update({
      where: { id: docItem.id },
      data: {
        quantity_actual: data.has_received_5_exemplars ? 5 : 0,
        status: isBothYes ? 'RECEIVED' : 'PENDING',
        checked_by: user.id,
        checked_at: new Date(),
      },
    });
  } else {
    docItem = await tx.documentationItem.create({
      data: {
        registration_id: id,
        item_type: 'PHYSICAL_EXEMPLAR_RECEIVED',
        quantity_target: 5,
        quantity_actual: data.has_received_5_exemplars ? 5 : 0,
        status: isBothYes ? 'RECEIVED' : 'PENDING',
        checked_by: user.id,
        checked_at: new Date(),
      },
    });
  }

  // 2. Simpan metadata arsip & survey
  const existingMeta = (typeof reg.foreign_metadata === 'object' && reg.foreign_metadata !== null)
    ? reg.foreign_metadata
    : {};

  const documentationArchive = {
    has_master_documentation: Boolean(data.has_master_documentation),
    has_received_5_exemplars: Boolean(data.has_received_5_exemplars),
    storage_location: isBothYes ? (data.storage_location || {}) : null,
    survey: data.survey || {},
    recorded_by: { id: user.id, name: user.name },
    recorded_at: new Date().toISOString(),
  };

  const updatedForeignMeta = {
    ...existingMeta,
    documentation_archive: documentationArchive,
  };

  await tx.registration.update({
    where: { id },
    data: { foreign_metadata: updatedForeignMeta },
  });

  // 3. Catat audit log
  await audit(tx, user, 'RECORD_DOCUMENTATION_ARCHIVE', 'Registration', id, documentationArchive, req);

  return {
    documentation_item: docItem,
    documentation_archive: documentationArchive,
  };
}, { isolationLevel: 'ReadCommitted' });

