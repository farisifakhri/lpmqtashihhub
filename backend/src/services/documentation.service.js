import { randomUUID } from 'node:crypto';
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

export async function getPrintingReports(id, user) {
  requireRole(user, ['PENERBIT', 'DOKUMENTATOR', 'ADMIN_INTERNAL', 'KEPALA_LPMQ', 'SUPERADMIN']);
  const reg = await prisma.registration.findUnique({
    where: { id },
    include: {
      publisher: { select: { id: true, legal_name: true, brand_name: true, email: true, phone: true } },
      service_type: { select: { id: true, name: true, service_kind: true } },
      official_documents: {
        where: { document_type: 'SURAT_TANDA_TASHIH' },
        orderBy: { version: 'desc' },
      },
      documentation_items: {
        where: { item_type: 'PHYSICAL_EXEMPLAR_RECEIVED' },
      },
    },
  });

  if (!reg) fail(404, 'Pengajuan tidak ditemukan.');

  if (user.roles.includes('PENERBIT') && !user.roles.some(r => ['ADMIN_INTERNAL', 'SUPERADMIN', 'DOKUMENTATOR'].includes(r))) {
    if (!user.publisherId || reg.publisher_id !== user.publisherId) {
      fail(403, 'Anda tidak memiliki hak akses untuk melihat data pencetakan permohonan ini.');
    }
  }

  const meta = (typeof reg.foreign_metadata === 'object' && reg.foreign_metadata !== null)
    ? reg.foreign_metadata
    : (typeof reg.foreign_metadata === 'string' ? JSON.parse(reg.foreign_metadata || '{}') : {});

  const stt = reg.official_documents.find(d => d.status === 'ISSUED') || reg.official_documents[0] || null;
  const sttSnap = stt?.content_snapshot
    ? (typeof stt.content_snapshot === 'string' ? JSON.parse(stt.content_snapshot) : stt.content_snapshot)
    : {};

  const sizesList = Array.isArray(meta.sizes) ? meta.sizes : [];
  const totalOplahAllowed = Number(sttSnap.total_oplah)
    || sizesList.reduce((acc, curr) => acc + (Number(curr.oplah) || 0), 0)
    || Number(meta.oplah)
    || 0;

  const reports = Array.isArray(meta.printing_reports) ? meta.printing_reports : [];
  const totalOplahPrinted = reports.reduce((acc, curr) => acc + (Number(curr.oplah_printed) || 0), 0);
  const remainingOplah = Math.max(0, totalOplahAllowed - totalOplahPrinted);
  const isQuotaExceeded = totalOplahAllowed > 0 && totalOplahPrinted > totalOplahAllowed;

  const exemplarItem = reg.documentation_items[0] || null;
  const hasReportedExemplar = reports.some(r => r.exemplar_sent === true);
  const isExemplarReceived = exemplarItem?.status === 'RECEIVED' || (exemplarItem?.quantity_actual || 0) >= 5;

  let exemplarDeliveryStatus = 'PENDING';
  if (isExemplarReceived) {
    exemplarDeliveryStatus = 'RECEIVED';
  } else if (hasReportedExemplar) {
    exemplarDeliveryStatus = 'SENT';
  }

  return {
    registration_id: reg.id,
    registration_no: reg.registration_no,
    title: reg.title,
    publisher: reg.publisher,
    status: reg.status,
    stt: stt ? {
      id: stt.id,
      document_no: stt.document_no,
      status: stt.status,
      issued_at: stt.issued_at,
      valid_until: stt.valid_until,
      qr_token: stt.qr_token,
      is_valid: stt.status === 'ISSUED' && (!stt.valid_until || new Date(stt.valid_until) >= new Date()),
    } : null,
    summary: {
      total_oplah_allowed: totalOplahAllowed,
      total_oplah_printed: totalOplahPrinted,
      remaining_oplah: remainingOplah,
      percentage_printed: totalOplahAllowed > 0 ? Math.min(100, Math.round((totalOplahPrinted / totalOplahAllowed) * 100)) : 0,
      is_quota_exceeded: isQuotaExceeded,
      has_delivered_exemplars: hasReportedExemplar || isExemplarReceived,
      exemplar_delivery_status: exemplarDeliveryStatus,
      exemplar_received_by_lpmq: isExemplarReceived,
      target_exemplars: 5,
      actual_exemplars_received: exemplarItem?.quantity_actual || 0,
    },
    reports: reports.sort((a, b) => new Date(b.created_at || b.print_date) - new Date(a.created_at || a.print_date)),
  };
}

export const createPrintingReport = (id, data, user, req) => prisma.$transaction(async tx => {
  requireRole(user, ['PENERBIT', 'ADMIN_INTERNAL', 'SUPERADMIN']);
  const reg = await registration(tx, id);

  if (user.roles.includes('PENERBIT') && !user.roles.some(r => ['ADMIN_INTERNAL', 'SUPERADMIN'].includes(r))) {
    if (!user.publisherId || reg.publisher_id !== user.publisherId) {
      fail(403, 'Anda tidak berhak melaporkan pencetakan untuk permohonan ini.');
    }
  }

  const hasStt = await tx.officialDocument.findFirst({
    where: { registration_id: id, document_type: 'SURAT_TANDA_TASHIH', status: 'ISSUED' },
  });
  if (!hasStt && !['STT_ISSUED', 'DOCUMENTATION_IN_PROGRESS', 'COMPLETED'].includes(reg.status)) {
    fail(409, 'Laporan pencetakan baru dapat disampaikan setelah Surat Tanda Tashih (STT) resmi diterbitkan.');
  }

  const existingMeta = (typeof reg.foreign_metadata === 'object' && reg.foreign_metadata !== null)
    ? reg.foreign_metadata
    : (typeof reg.foreign_metadata === 'string' ? JSON.parse(reg.foreign_metadata || '{}') : {});

  const currentReports = Array.isArray(existingMeta.printing_reports) ? existingMeta.printing_reports : [];

  const newReport = {
    id: randomUUID(),
    batch_no: Number(data.batch_no || currentReports.length + 1),
    print_date: data.print_date,
    oplah_printed: Number(data.oplah_printed),
    printer_name: data.printer_name,
    printer_location: data.printer_location,
    exemplar_sent: Boolean(data.exemplar_sent),
    exemplar_tracking_no: data.exemplar_tracking_no || null,
    notes: data.notes || '',
    created_at: new Date().toISOString(),
    created_by: { id: user.id, name: user.name, role: user.roles[0] },
  };

  const updatedReports = [...currentReports, newReport];
  const updatedMeta = {
    ...existingMeta,
    printing_reports: updatedReports,
  };

  await tx.registration.update({
    where: { id },
    data: { foreign_metadata: updatedMeta },
  });

  let docItem = await tx.documentationItem.findFirst({
    where: { registration_id: id, item_type: 'PHYSICAL_EXEMPLAR_RECEIVED' },
  });

  if (data.exemplar_sent) {
    if (docItem) {
      if (docItem.status !== 'RECEIVED') {
        docItem = await tx.documentationItem.update({
          where: { id: docItem.id },
          data: {
            status: 'PENDING',
            notes: data.exemplar_tracking_no
              ? 'Dilaporkan terkirim oleh penerbit dengan resi: ' + data.exemplar_tracking_no
              : (docItem.notes || 'Dilaporkan siap / diserahkan oleh penerbit.'),
          },
        });
      }
    } else {
      docItem = await tx.documentationItem.create({
        data: {
          registration_id: id,
          item_type: 'PHYSICAL_EXEMPLAR_RECEIVED',
          quantity_target: 5,
          quantity_actual: 0,
          status: 'PENDING',
          notes: data.exemplar_tracking_no
            ? 'Dilaporkan terkirim oleh penerbit dengan resi: ' + data.exemplar_tracking_no
            : 'Dilaporkan siap / diserahkan oleh penerbit.',
        },
      });
    }
  }

  const internalStaff = await tx.userRole.findMany({
    where: { role: { code: { in: ['DOKUMENTATOR', 'ADMIN_INTERNAL'] } } },
    select: { user_id: true },
  });
  for (const staff of internalStaff) {
    await tx.notification.create({
      data: {
        user_id: staff.user_id,
        registration_id: id,
        type: 'PRINTING_REPORT_SUBMITTED',
        title: 'Laporan Pencetakan Al-Qur\'an Diterima',
        payload: {
          link: '/internal/documentation',
          registration_no: reg.registration_no,
          batch_no: newReport.batch_no,
          oplah_printed: newReport.oplah_printed,
          printer_name: newReport.printer_name,
          exemplar_sent: newReport.exemplar_sent,
        },
      },
    });
  }

  await audit(tx, user, 'CREATE_PRINTING_REPORT', 'Registration', id, newReport, req);

  return {
    success: true,
    message: 'Laporan pencetakan berhasil dicatat.',
    report: newReport,
  };
}, { isolationLevel: 'ReadCommitted' });
