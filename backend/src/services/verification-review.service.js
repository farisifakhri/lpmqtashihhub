import { prisma } from '../config/database.js';
import { audit, fail, move, registration, requireRole, requireStatus } from './workflow-utils.js';

const transactionOptions = { isolationLevel: 'ReadCommitted' };

export const startVerification = (assignmentId, user, req) => prisma.$transaction(async tx => {
  requireRole(user, ['VERIFIKATOR']);
  const assignment = await tx.verificationAssignment.findUnique({
    where: { id: assignmentId },
  });
  if (!assignment) fail(404, 'Penugasan verifikasi tidak ditemukan.');
  if (assignment.verifier_id !== user.id) {
    fail(403, 'Anda bukan verifikator yang ditugaskan untuk naskah ini.');
  }
  if (assignment.status === 'COMPLETED') {
    fail(409, 'Pemeriksaan untuk penugasan ini sudah selesai.');
  }

  const reg = await registration(tx, assignment.registration_id);
  if (assignment.status === 'ASSIGNED') {
    requireStatus(reg, ['VERIFICATION_ASSIGNED']);
    const startedAt = new Date();
    const updated = await tx.verificationAssignment.update({
      where: { id: assignmentId },
      data: {
        status: 'IN_PROGRESS',
        started_at: startedAt,
      },
    });
    await move(tx, reg, 'IN_VERIFICATION', user, `Pemeriksaan naskah dimulai oleh verifikator ${user.name}`, req);
    await audit(tx, user, 'START_VERIFICATION', 'VerificationAssignment', assignment.id, updated, req);
    return updated;
  }

  return assignment;
}, transactionOptions);

export const saveVerificationDraft = (assignmentId, data, user, req) => prisma.$transaction(async tx => {
  requireRole(user, ['VERIFIKATOR']);
  const assignment = await tx.verificationAssignment.findUnique({ where: { id: assignmentId } });
  if (!assignment) fail(404, 'Penugasan verifikasi tidak ditemukan.');
  if (assignment.verifier_id !== user.id) {
    fail(403, 'Anda bukan verifikator yang ditugaskan untuk naskah ini.');
  }
  if (assignment.status !== 'IN_PROGRESS') {
    fail(409, 'Pemeriksaan belum dimulai. Mulai pemeriksaan terlebih dahulu.');
  }

  const reg = await registration(tx, assignment.registration_id);
  requireStatus(reg, ['IN_VERIFICATION']);

  if (data.attachment_file_ids?.length) {
    const count = await tx.storedFile.count({ where: { id: { in: data.attachment_file_ids } } });
    if (count !== data.attachment_file_ids.length) {
      fail(400, 'Satu atau lebih berkas lampiran tidak ditemukan di sistem.');
    }
  }

  const existingDraft = await tx.verificationDocument.findFirst({
    where: {
      assignment_id: assignmentId,
      document_type: 'SURAT_HASIL_VERIFIKASI',
      status: 'DRAFT',
    },
    orderBy: { version: 'desc' },
  });

  const content = {
    registration_no: reg.registration_no,
    title: reg.title,
    publisher_id: reg.publisher_id,
    verifier_id: user.id,
    verifier_name: user.name,
    checklist: data.checklist || [],
    decision: data.decision || null,
    notes: data.notes || null,
    letter_text: data.letter_text || '',
    attachment_file_ids: data.attachment_file_ids || [],
    saved_at: new Date().toISOString(),
  };

  if (existingDraft) {
    const updated = await tx.verificationDocument.update({
      where: { id: existingDraft.id },
      data: { content_snapshot: content },
    });
    await audit(tx, user, 'SAVE_VERIFICATION_DRAFT', 'VerificationDocument', updated.id, updated, req);
    return updated;
  }

  const lastDoc = await tx.verificationDocument.findFirst({
    where: { registration_id: reg.id, document_type: 'SURAT_HASIL_VERIFIKASI' },
    orderBy: { version: 'desc' },
    select: { version: true },
  });

  const version = (lastDoc?.version || 0) + 1;
  const created = await tx.verificationDocument.create({
    data: {
      registration_id: reg.id,
      assignment_id: assignmentId,
      document_type: 'SURAT_HASIL_VERIFIKASI',
      version,
      status: 'DRAFT',
      created_by_id: user.id,
      content_snapshot: content,
    },
  });
  await audit(tx, user, 'CREATE_VERIFICATION_DRAFT', 'VerificationDocument', created.id, created, req);
  return created;
}, transactionOptions);

export const submitVerificationDraft = (assignmentId, data, user, req) => prisma.$transaction(async tx => {
  requireRole(user, ['VERIFIKATOR']);
  const assignment = await tx.verificationAssignment.findUnique({ where: { id: assignmentId } });
  if (!assignment) fail(404, 'Penugasan verifikasi tidak ditemukan.');
  if (assignment.verifier_id !== user.id) {
    fail(403, 'Anda bukan verifikator yang ditugaskan untuk naskah ini.');
  }
  if (assignment.status !== 'IN_PROGRESS') {
    fail(409, 'Pemeriksaan belum dimulai.');
  }

  const reg = await registration(tx, assignment.registration_id);
  requireStatus(reg, ['IN_VERIFICATION']);

  if (data.attachment_file_ids?.length) {
    const count = await tx.storedFile.count({ where: { id: { in: data.attachment_file_ids } } });
    if (count !== data.attachment_file_ids.length) {
      fail(400, 'Satu atau lebih berkas lampiran tidak ditemukan di sistem.');
    }
  }

  const existingDraft = await tx.verificationDocument.findFirst({
    where: {
      assignment_id: assignmentId,
      document_type: 'SURAT_HASIL_VERIFIKASI',
      status: 'DRAFT',
    },
    orderBy: { version: 'desc' },
  });

  const lastDoc = await tx.verificationDocument.findFirst({
    where: { registration_id: reg.id, document_type: 'SURAT_HASIL_VERIFIKASI' },
    orderBy: { version: 'desc' },
    select: { version: true },
  });

  const version = existingDraft ? existingDraft.version : (lastDoc?.version || 0) + 1;
  const content = {
    registration_no: reg.registration_no,
    title: reg.title,
    publisher_id: reg.publisher_id,
    verifier_id: user.id,
    verifier_name: user.name,
    checklist: data.checklist,
    decision: data.decision,
    notes: data.notes || null,
    letter_text: data.letter_text,
    attachment_file_ids: data.attachment_file_ids || [],
    submitted_at: new Date().toISOString(),
  };

  const document = existingDraft
    ? await tx.verificationDocument.update({
        where: { id: existingDraft.id },
        data: {
          status: 'SUBMITTED',
          content_snapshot: content,
        },
      })
    : await tx.verificationDocument.create({
        data: {
          registration_id: reg.id,
          assignment_id: assignmentId,
          document_type: 'SURAT_HASIL_VERIFIKASI',
          version,
          status: 'SUBMITTED',
          created_by_id: user.id,
          content_snapshot: content,
        },
      });

  await tx.verificationAssignment.update({
    where: { id: assignmentId },
    data: {
      decision: data.decision,
      notes: data.notes || null,
    },
  });

  const decisionLabel = data.decision === 'PASSED' ? 'Lolos Pemeriksaan' : 'Perlu Perbaikan Penerbit';
  await move(
    tx,
    reg,
    'WAITING_VERIFICATION_APPROVAL',
    user,
    `Draf surat hasil verifikasi versi ${version} diajukan oleh ${user.name} (${decisionLabel})`,
    req
  );

  await audit(tx, user, 'SUBMIT_VERIFICATION_DRAFT', 'VerificationDocument', document.id, document, req);

  // Kirim notifikasi permohonan persetujuan kepada Kepala LPMQ
  const kepalaUsers = await tx.user.findMany({
    where: {
      status: 'ACTIVE',
      roles: { some: { role: { code: 'KEPALA_LPMQ' } } },
    },
    select: { id: true },
  });

  for (const k of kepalaUsers) {
    await tx.notification.create({
      data: {
        user_id: k.id,
        registration_id: reg.id,
        type: 'APPROVAL_REQUEST',
        title: `Persetujuan draf hasil verifikasi: ${reg.registration_no}`,
        payload: {
          assignment_id: assignmentId,
          document_id: document.id,
          version: document.version,
          decision: data.decision,
          verifier_name: user.name,
        },
      },
    });
  }

  return document;
}, transactionOptions);

export const getVerificationAssignmentDetail = async (assignmentId, user) => {
  requireRole(user, ['VERIFIKATOR', 'KEPALA_LPMQ', 'SUPERADMIN']);

  const assignment = await prisma.verificationAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      verifier: { select: { id: true, name: true, email: true, nip: true } },
      assigned_by: { select: { id: true, name: true } },
      registration: {
        include: {
          publisher: { select: { id: true, legal_name: true, entity_type: true, address: true, phone: true } },
          service_type: { include: { category: true } },
          manuscript_files: { orderBy: { version: 'desc' } },
          physical_master_intake: true,
          status_histories: {
            orderBy: { changed_at: 'desc' },
            include: { actor: { select: { id: true, name: true } } },
          },
        },
      },
      documents: {
        orderBy: { version: 'desc' },
      },
    },
  });

  if (!assignment) fail(404, 'Penugasan verifikasi tidak ditemukan.');

  const isHead = user.roles.includes('KEPALA_LPMQ');
  const isAdmin = user.roles.includes('SUPERADMIN');
  if (!isHead && !isAdmin && assignment.verifier_id !== user.id) {
    fail(403, 'Anda tidak memiliki hak akses untuk memeriksa penugasan verifikator lain.');
  }

  const now = new Date();
  const dueAt = assignment.due_at ? new Date(assignment.due_at) : null;
  const isOverdue = dueAt && now.getTime() > dueAt.getTime() && assignment.status !== 'COMPLETED';
  const remainingMs = dueAt ? Math.max(0, dueAt.getTime() - now.getTime()) : null;

  const notaDinas = assignment.documents.find(d => d.document_type === 'NOTA_DINAS_VERIFIKASI') || null;
  const resultDocuments = assignment.documents.filter(d => d.document_type === 'SURAT_HASIL_VERIFIKASI');
  const latestDraft = resultDocuments[0] || null;

  return {
    assignment: {
      id: assignment.id,
      status: assignment.status,
      assigned_at: assignment.assigned_at,
      started_at: assignment.started_at,
      due_at: assignment.due_at,
      completed_at: assignment.completed_at,
      decision: assignment.decision,
      notes: assignment.notes,
      assignment_notes: assignment.assignment_notes,
      verifier: assignment.verifier,
      assigned_by: assignment.assigned_by,
      sla: {
        due_at: assignment.due_at,
        is_overdue: Boolean(isOverdue),
        remaining_ms: remainingMs,
        duration_target: '2 hari',
      },
    },
    registration: assignment.registration,
    nota_dinas: notaDinas,
    latest_result_document: latestDraft,
    result_documents: resultDocuments,
  };
};

export const getVerificationAttachment = async (documentId, fileId, user) => {
  const doc = await prisma.verificationDocument.findUnique({
    where: { id: documentId },
    include: { registration: true },
  });
  if (!doc) fail(404, 'Dokumen verifikasi tidak ditemukan.');

  const isHead = user.roles.includes('KEPALA_LPMQ');
  const isAdmin = user.roles.includes('SUPERADMIN');
  const isOwnerPublisher = user.roles.includes('ADMIN_PENERBIT') && user.publisherId === doc.registration.publisher_id;
  const isAssignedVerifier = user.roles.includes('VERIFIKATOR') && user.id === doc.created_by_id;

  if (isOwnerPublisher) {
    if (doc.status !== 'SENT') {
      fail(403, 'Lampiran surat hasil verifikasi belum dapat diakses penerbit.');
    }
  } else if (!isHead && !isAdmin && !isAssignedVerifier) {
    fail(403, 'Anda tidak memiliki wewenang untuk mengakses lampiran dokumen ini.');
  }

  const attachments = doc.content_snapshot?.attachment_file_ids || [];
  if (!attachments.includes(fileId)) {
    fail(404, 'Berkas lampiran tidak terdaftar pada dokumen ini.');
  }

  const file = await prisma.storedFile.findUnique({ where: { id: fileId } });
  if (!file) fail(404, 'Berkas lampiran tidak ditemukan di penyimpanan.');

  return file;
};

