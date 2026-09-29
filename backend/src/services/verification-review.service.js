import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { audit, fail, move, registration, requireRole, requireStatus } from './workflow-utils.js';
import { assertAttachmentFileOwnership } from './resource-policy.service.js';
import { computeDocumentHash, signVerificationDocument, assertDocumentFullySigned } from './verification-signing.service.js';
import { sendOutboxEmail } from './email-provider.service.js';
import { calculateDueAt } from './sla.service.js';
import { archiveVerificationPdf, cleanupGeneratedFiles, readVerifiedPdf, renderVerificationPdf } from './verification-document-pdf.service.js';

const transactionOptions = { isolationLevel: 'ReadCommitted' };

const resolveAssignment = async (db, idOrRegId, options = {}) => {
  let assignment = await db.verificationAssignment.findUnique({
    where: { id: idOrRegId },
    ...options,
  });
  if (!assignment) {
    assignment = await db.verificationAssignment.findFirst({
      where: { registration_id: idOrRegId },
      orderBy: { assigned_at: 'desc' },
      ...options,
    });
  }
  return assignment;
};

export const startVerification = (assignmentId, user, req) => prisma.$transaction(async tx => {
  requireRole(user, ['VERIFIKATOR']);
  const assignment = await tx.verificationAssignment.findUnique({
    where: { id: assignmentId },
  });
  if (!assignment) fail(404, 'Penugasan verifikasi tidak ditemukan.');
  if (assignment.verifier_id !== user.id) {
    fail(403, 'Anda bukan verifikator yang ditugaskan untuk naskah ini.');
  }
  if (assignment.status === 'IN_PROGRESS') {
    return assignment; // Idempotent
  }
  if (assignment.status !== 'ASSIGNED') {
    fail(409, 'Pemeriksaan tidak dapat dimulai pada status saat ini.');
  }

  const reg = await registration(tx, assignment.registration_id);
  requireStatus(reg, ['VERIFICATION_ASSIGNED']);
  const startedAt = new Date();
  const updated = await tx.verificationAssignment.update({
    where: { id: assignment.id },
    data: {
      status: 'IN_PROGRESS',
      started_at: startedAt,
    },
  });
  await move(tx, reg, 'IN_VERIFICATION', user, `Pemeriksaan naskah dimulai oleh verifikator ${user.name}`, req);
  await audit(tx, user, 'START_VERIFICATION', 'VerificationAssignment', assignment.id, updated, req);
  return updated;
}, transactionOptions);

export const saveVerificationDraft = (assignmentId, data, user, req) => prisma.$transaction(async tx => {
  requireRole(user, ['VERIFIKATOR']);
  const assignment = await tx.verificationAssignment.findUnique({
    where: { id: assignmentId },
  });
  if (!assignment) fail(404, 'Penugasan verifikasi tidak ditemukan.');
  if (assignment.verifier_id !== user.id) {
    fail(403, 'Anda bukan verifikator yang ditugaskan untuk naskah ini.');
  }
  if (assignment.status !== 'IN_PROGRESS') {
    fail(409, 'Pemeriksaan belum dimulai. Mulai pemeriksaan terlebih dahulu.');
  }

  const actualAssignmentId = assignment.id;
  const reg = await registration(tx, assignment.registration_id);
  requireStatus(reg, ['IN_VERIFICATION']);
  const publisher = await tx.publisher.findUnique({ where: { id: reg.publisher_id }, select: { legal_name: true, address: true } });

  const draftAttachments = [...new Set([...(data.attachment_file_ids || []), ...(data.billing_file_id ? [data.billing_file_id] : [])])];
  if (draftAttachments.length) await assertAttachmentFileOwnership(tx, draftAttachments, user, reg.id);
  if (data.billing_file_id) {
    const billingFile = await tx.storedFile.findUnique({ where: { id: data.billing_file_id }, select: { mime_type: true } });
    if (billingFile?.mime_type !== 'application/pdf') fail(422, 'Lampiran billing PNBP harus berupa PDF.');
  }

  const existingDraft = await tx.verificationDocument.findFirst({
    where: {
      assignment_id: actualAssignmentId,
      document_type: { in: ['SURAT_HASIL_VERIFIKASI', 'SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI'] },
      status: 'DRAFT',
    },
    orderBy: { version: 'desc' },
  });

  const content = {
    registration_no: reg.registration_no,
    title: reg.title,
    publisher_id: reg.publisher_id,
    publisher_name: publisher?.legal_name || null,
    publisher_address: publisher?.address || null,
    verifier_id: user.id,
    verifier_name: user.name,
    checklist: data.checklist || [],
    decision: data.decision || null,
    notes: data.notes || null,
    letter_text: data.letter_text || '',
    billing_no: data.decision === 'PASSED' ? data.billing_no || null : null,
    billing_file_id: data.decision === 'PASSED' ? data.billing_file_id || null : null,
    attachment_file_ids: draftAttachments,
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
    where: { registration_id: reg.id, document_type: { in: ['SURAT_HASIL_VERIFIKASI', 'SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI'] } },
    orderBy: { version: 'desc' },
    select: { version: true },
  });

  const version = (lastDoc?.version || 0) + 1;
  const created = await tx.verificationDocument.create({
    data: {
      registration_id: reg.id,
      assignment_id: actualAssignmentId,
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
  const assignment = await tx.verificationAssignment.findUnique({
    where: { id: assignmentId },
  });
  if (!assignment) fail(404, 'Penugasan verifikasi tidak ditemukan.');
  if (assignment.verifier_id !== user.id) {
    fail(403, 'Anda bukan verifikator yang ditugaskan untuk naskah ini.');
  }
  if (assignment.status !== 'IN_PROGRESS') {
    fail(409, 'Pemeriksaan belum dimulai.');
  }

  const actualAssignmentId = assignment.id;
  const reg = await registration(tx, assignment.registration_id);
  requireStatus(reg, ['IN_VERIFICATION']);
  const publisher = await tx.publisher.findUnique({ where: { id: reg.publisher_id }, select: { legal_name: true, address: true } });

  let payment = null;
  if (data.decision === 'PASSED') {
    const billingNo = data.billing_no?.trim();
    if (!billingNo) fail(422, 'Kode billing PNBP wajib diisi untuk surat hasil yang lolos.');
    const total = reg.fee_sla_snapshot?.total_fee;
    if (total === undefined || total === null || !Number.isFinite(Number(total)) || Number(total) < 0) {
      fail(409, 'Tarif PNBP pada pendaftaran belum lengkap.');
    }
    const duplicate = await tx.paymentRecord.findUnique({ where: { billing_no: billingNo } });
    if (duplicate && duplicate.registration_id !== reg.id) fail(409, 'Kode billing PNBP sudah digunakan pada pengajuan lain.');
    const existingPayment = await tx.paymentRecord.findFirst({ where: { registration_id: reg.id }, orderBy: { created_at: 'desc' } });
    if (existingPayment && !['UNPAID', 'EXPIRED', 'CANCELLED'].includes(existingPayment.status)) {
      fail(409, 'Kode billing tidak dapat diganti karena pembayaran sudah diproses.');
    }
    payment = existingPayment
      ? await tx.paymentRecord.update({ where: { id: existingPayment.id }, data: { billing_no: billingNo, amount: new Prisma.Decimal(total), status: 'UNPAID', provider: 'SIMPONI' } })
      : await tx.paymentRecord.create({ data: { registration_id: reg.id, billing_no: billingNo, amount: new Prisma.Decimal(total), provider: 'SIMPONI', status: 'UNPAID' } });
    await audit(tx, user, 'RECORD_BILLING', 'PaymentRecord', payment.id, payment, req);
  }

  const attachments = [...new Set([...(data.attachment_file_ids || []), ...(data.billing_file_id ? [data.billing_file_id] : [])])];
  if (attachments.length) await assertAttachmentFileOwnership(tx, attachments, user, reg.id);
  if (data.billing_file_id) {
    const billingFile = await tx.storedFile.findUnique({ where: { id: data.billing_file_id }, select: { mime_type: true } });
    if (billingFile?.mime_type !== 'application/pdf') fail(422, 'Lampiran billing PNBP harus berupa PDF.');
  }

  const existingDraft = await tx.verificationDocument.findFirst({
    where: {
      assignment_id: actualAssignmentId,
      document_type: { in: ['SURAT_HASIL_VERIFIKASI', 'SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI'] },
      status: { in: ['DRAFT', 'RETURNED'] },
    },
    orderBy: { version: 'desc' },
  });

  const lastDoc = await tx.verificationDocument.findFirst({
    where: { registration_id: reg.id, document_type: { in: ['SURAT_HASIL_VERIFIKASI', 'SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI'] } },
    orderBy: { version: 'desc' },
    select: { version: true },
  });

  const version = existingDraft ? existingDraft.version : (lastDoc?.version || 0) + 1;
  const docType = existingDraft ? existingDraft.document_type : 'SURAT_HASIL_VERIFIKASI';

  const content = {
    registration_no: reg.registration_no,
    title: reg.title,
    publisher_id: reg.publisher_id,
    publisher_name: publisher?.legal_name || null,
    publisher_address: publisher?.address || null,
    verifier_id: user.id,
    verifier_name: user.name,
    checklist: data.checklist,
    decision: data.decision,
    notes: data.notes || null,
    letter_text: data.letter_text,
    billing_no: payment?.billing_no || null,
    billing_amount: payment ? String(payment.amount) : null,
    billing_file_id: payment ? data.billing_file_id || null : null,
    attachment_file_ids: attachments,
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
          assignment_id: actualAssignmentId,
          document_type: docType,
          version,
          status: 'SUBMITTED',
          created_by_id: user.id,
          content_snapshot: content,
        },
      });

  await tx.verificationDocumentSignatory.deleteMany({ where: { document_id: document.id } });
  await tx.verificationDocumentSignatory.create({ data: {
    document_id: document.id, signer_user_id: user.id,
    name_position_snapshot: `${user.name} (Verifikator Naskah)`, sign_order: 1,
    method: 'INTERNAL_APPROVAL', status: 'SIGNED', signed_at: new Date(),
    document_hash: computeDocumentHash(document),
  } });

  // Buat atau perbarui Berita Acara Verifikasi (KB-03 & §4.1)
  const existingBADraft = await tx.verificationDocument.findFirst({
    where: {
      assignment_id: actualAssignmentId,
      document_type: 'BERITA_ACARA_VERIFIKASI',
      status: { in: ['DRAFT', 'RETURNED'] },
    },
    orderBy: { version: 'desc' },
  });

  const baContent = {
    registration_no: reg.registration_no,
    title: reg.title,
    publisher_id: reg.publisher_id,
    verifier_id: user.id,
    verifier_name: user.name,
    checklist: data.checklist,
    decision: data.decision,
    notes: data.notes || null,
    letter_text: data.letter_text,
    submitted_at: new Date().toISOString(),
  };

  let baDocument;
  if (existingBADraft) {
    baDocument = await tx.verificationDocument.update({
      where: { id: existingBADraft.id },
      data: {
        status: 'SUBMITTED',
        content_snapshot: baContent,
      },
    });
  } else {
    baDocument = await tx.verificationDocument.create({
      data: {
        registration_id: reg.id,
        assignment_id: actualAssignmentId,
        document_type: 'BERITA_ACARA_VERIFIKASI',
        version,
        status: 'SUBMITTED',
        created_by_id: user.id,
        content_snapshot: baContent,
      },
    });
  }
  await tx.verificationDocumentSignatory.deleteMany({ where: { document_id: baDocument.id } });
  await tx.verificationDocumentSignatory.create({ data: {
    document_id: baDocument.id, signer_user_id: user.id,
    name_position_snapshot: `${user.name} (Verifikator Naskah)`, sign_order: 1,
    method: 'INTERNAL_APPROVAL', status: 'SIGNED', signed_at: new Date(),
    document_hash: computeDocumentHash(baDocument),
  } });

  const submittedAt = new Date();
  await tx.verificationAssignment.update({
    where: { id: actualAssignmentId },
    data: {
      decision: data.decision,
      notes: data.notes || null,
      status: 'WAITING_APPROVAL',  // Pemilik tindakan berganti ke Kepala LPMQ
      return_reason: null,        // Reset catatan pengembalian setelah perbaikan diajukan
      review_submitted_at: submittedAt,
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
        title: `Permohonan persetujuan draf verifikasi: ${reg.registration_no}`,
        payload: {
          assignment_id: actualAssignmentId,
          document_id: document.id,
          version: document.version,
          decision: data.decision,
          verifier_name: user.name,
          link: `/internal/verifications/${actualAssignmentId}`,
        },
      },
    });
  }

  return document;
}, transactionOptions);

export const getVerificationAssignmentDetail = async (assignmentId, user) => {
  requireRole(user, ['VERIFIKATOR', 'KEPALA_LPMQ', 'HELPER_ADMIN', 'SUPERADMIN']);

  const assignment = await resolveAssignment(prisma, assignmentId, {
    include: {
      verifier: { select: { id: true, name: true, email: true, nip: true } },
      assigned_by: { select: { id: true, name: true } },
      revoked_by: { select: { id: true, name: true } },
      registration: {
        include: {
          publisher: { select: { id: true, legal_name: true, entity_type: true, address: true, phone: true } },
          service_type: { include: { category: true } },
          manuscript_files: { orderBy: { version: 'desc' } },
          physical_master_intake: true,
          payment_records: { orderBy: { created_at: 'desc' } },
          physical_handovers: {
            orderBy: { created_at: 'desc' },
            include: {
              from_user: { select: { id: true, name: true, nip: true } },
              to_user: { select: { id: true, name: true, nip: true } },
            },
          },
          status_histories: {
            orderBy: { changed_at: 'desc' },
            include: { actor: { select: { id: true, name: true } } },
          },
        },
      },
      documents: {
        orderBy: { version: 'desc' },
        include: {
          signatories: {
            orderBy: { sign_order: 'asc' },
            include: { signer: { select: { id: true, name: true, nip: true } } },
          },
        },
      },
    },
  });

  if (!assignment) fail(404, 'Penugasan verifikasi tidak ditemukan.');

  const isHead = user.roles.includes('KEPALA_LPMQ');
  const isAdmin = user.roles.includes('SUPERADMIN') || user.roles.includes('HELPER_ADMIN');
  if (!isHead && !isAdmin && assignment.verifier_id !== user.id) {
    fail(403, 'Anda tidak memiliki hak akses untuk memeriksa penugasan verifikator lain.');
  }

  const now = new Date();
  const dueAt = assignment.due_at ? new Date(assignment.due_at) : null;
  const rawOverdue = dueAt && now.getTime() > dueAt.getTime();
  const isOverdue = ['ASSIGNED', 'IN_PROGRESS'].includes(assignment.status) && rawOverdue;
  const remainingMs = dueAt ? Math.max(0, dueAt.getTime() - now.getTime()) : null;

  let currentStageOwner = 'NONE';
  let verifierPerformance = 'ON_TRACK';

  if (['ASSIGNED', 'IN_PROGRESS'].includes(assignment.status)) {
    currentStageOwner = 'VERIFIKATOR';
    verifierPerformance = rawOverdue ? 'OVERDUE' : 'ON_TRACK';
  } else if (assignment.status === 'WAITING_APPROVAL') {
    currentStageOwner = 'KEPALA_LPMQ';
    if (assignment.review_submitted_at && dueAt) {
      verifierPerformance = new Date(assignment.review_submitted_at).getTime() <= dueAt.getTime() ? 'ON_TIME' : 'LATE';
    } else {
      verifierPerformance = 'ON_TRACK';
    }
  } else if (assignment.status === 'WAITING_SIGNATURE') {
    currentStageOwner = 'SIGNATORIES';
    if (assignment.review_submitted_at && dueAt) {
      verifierPerformance = new Date(assignment.review_submitted_at).getTime() <= dueAt.getTime() ? 'ON_TIME' : 'LATE';
    } else {
      verifierPerformance = 'ON_TRACK';
    }
  } else if (assignment.status === 'READY_TO_SEND') {
    currentStageOwner = 'VERIFIKATOR';
    if (assignment.review_submitted_at && dueAt) {
      verifierPerformance = new Date(assignment.review_submitted_at).getTime() <= dueAt.getTime() ? 'ON_TIME' : 'LATE';
    } else {
      verifierPerformance = 'ON_TRACK';
    }
  } else if (assignment.status === 'COMPLETED') {
    currentStageOwner = 'NONE';
    if (assignment.review_submitted_at && dueAt) {
      verifierPerformance = new Date(assignment.review_submitted_at).getTime() <= dueAt.getTime() ? 'ON_TIME' : 'LATE';
    } else {
      verifierPerformance = 'ON_TIME';
    }
  } else if (assignment.status === 'REVOKED') {
    currentStageOwner = 'NONE';
    verifierPerformance = 'REVOKED';
  }

  const assignmentHistory = await prisma.verificationAssignment.findMany({
    where: { registration_id: assignment.registration_id },
    orderBy: { assigned_at: 'desc' },
    include: {
      verifier: { select: { id: true, name: true, nip: true, email: true } },
      assigned_by: { select: { id: true, name: true } },
      revoked_by: { select: { id: true, name: true } },
      documents: {
        where: { document_type: 'NOTA_DINAS_VERIFIKASI' },
        select: { id: true, document_no: true, version: true, status: true, created_at: true },
      },
    },
  });

  const notaDinas = assignment.documents.find(d => d.document_type === 'NOTA_DINAS_VERIFIKASI') || null;
  const resultDocuments = assignment.documents.filter(d => ['SURAT_HASIL_VERIFIKASI', 'SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI', 'BERITA_ACARA_VERIFIKASI'].includes(d.document_type));
  const latestDraft = resultDocuments.find(d => ['SURAT_HASIL_VERIFIKASI', 'SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI'].includes(d.document_type)) || resultDocuments[0] || null;
  const beritaAcara = assignment.documents.find(d => d.document_type === 'BERITA_ACARA_VERIFIKASI') || null;
  const coreDistributor = assignment.registration.core_distributor_id
    ? await prisma.user.findUnique({ where: { id: assignment.registration.core_distributor_id }, select: { id: true, name: true, nip: true } })
    : null;

  return {
    assignment: {
      id: assignment.id,
      status: assignment.status,
      assigned_at: assignment.assigned_at,
      started_at: assignment.started_at,
      due_at: assignment.due_at,
      completed_at: assignment.completed_at,
      review_submitted_at: assignment.review_submitted_at,
      revoked_at: assignment.revoked_at,
      revoked_by: assignment.revoked_by,
      revocation_reason: assignment.revocation_reason,
      decision: assignment.decision,
      notes: assignment.notes,
      return_reason: assignment.return_reason,
      assignment_notes: assignment.assignment_notes,
      verifier: assignment.verifier,
      assigned_by: assignment.assigned_by,
      current_stage_owner: currentStageOwner,
      verifier_performance: verifierPerformance,
      sla: {
        due_at: assignment.due_at,
        is_overdue: Boolean(isOverdue),
        remaining_ms: remainingMs,
        duration_target: '2 hari kerja',
        review_submitted_at: assignment.review_submitted_at,
        current_stage_owner: currentStageOwner,
        verifier_performance: verifierPerformance,
      },
    },
    registration: { ...assignment.registration, core_distributor: coreDistributor },
    assignment_history: assignmentHistory,
    nota_dinas: notaDinas,
    latest_result_document: latestDraft,
    berita_acara: beritaAcara,
    result_documents: resultDocuments,
  };
};

export const getLatestVerificationAssignment = async (registrationId, user) => {
  requireRole(user, ['VERIFIKATOR', 'KEPALA_LPMQ', 'HELPER_ADMIN', 'SUPERADMIN']);
  const assignment = await prisma.verificationAssignment.findFirst({
    where: { registration_id: registrationId },
    orderBy: { assigned_at: 'desc' },
    include: {
      verifier: { select: { id: true, name: true, email: true, nip: true } },
    },
  });

  if (!assignment) {
    fail(404, 'Penugasan verifikasi untuk pengajuan ini tidak ditemukan.');
  }

  const isHead = user.roles.includes('KEPALA_LPMQ');
  const isAdmin = user.roles.includes('SUPERADMIN') || user.roles.includes('HELPER_ADMIN');
  if (!isHead && !isAdmin && assignment.verifier_id !== user.id) {
    fail(403, 'Anda tidak memiliki hak akses untuk memeriksa penugasan verifikator lain.');
  }

  return assignment;
};

export const revokeVerificationAssignment = (assignmentId, data, user, req) => prisma.$transaction(async tx => {
  requireRole(user, ['HELPER_ADMIN', 'SUPERADMIN']);
  const assignment = await tx.verificationAssignment.findUnique({
    where: { id: assignmentId },
    include: { verifier: true },
  });
  if (!assignment) fail(404, 'Penugasan verifikasi tidak ditemukan.');

  if (assignment.status === 'COMPLETED') {
    fail(409, 'Penugasan verifikasi sudah selesai dan tidak dapat dicabut.');
  }
  if (assignment.status === 'REVOKED') {
    fail(409, 'Penugasan verifikasi sudah dicabut sebelumnya.');
  }
  if (['WAITING_APPROVAL', 'WAITING_SIGNATURE', 'READY_TO_SEND'].includes(assignment.status)) {
    fail(409, 'Penugasan verifikasi tidak dapat dicabut karena draf pemeriksaan sedang dalam proses telaah atau tanda tangan. Kembalikan draf ke verifikator terlebih dahulu.');
  }
  if (!['ASSIGNED', 'IN_PROGRESS'].includes(assignment.status)) {
    fail(409, `Penugasan tidak dapat dicabut pada status "${assignment.status}".`);
  }

  const reg = await registration(tx, assignment.registration_id);
  if (reg.core_team_number) fail(409, 'Anggota tim inti pengajuan tidak dapat dicabut melalui alur ini.');
  const now = new Date();

  const updatedAssignment = await tx.verificationAssignment.update({
    where: { id: assignment.id },
    data: {
      status: 'REVOKED',
      revoked_at: now,
      revoked_by_id: user.id,
      revocation_reason: data.reason,
    },
  });
  await tx.verificationDocument.updateMany({
    where: { assignment_id: assignment.id, document_type: 'NOTA_DINAS_VERIFIKASI', status: 'ISSUED' },
    data: { status: 'REVOKED' },
  });

  await move(tx, reg, 'READY_FOR_VERIFICATION', user, `Penugasan verifikasi dicabut oleh ${user.name}: ${data.reason}`, req);
  await audit(tx, user, 'REVOKE_VERIFICATION_ASSIGNMENT', 'VerificationAssignment', assignment.id, updatedAssignment, req);

  await tx.notification.create({
    data: {
      user_id: assignment.verifier_id,
      registration_id: reg.id,
      type: 'ASSIGNMENT_REVOKED',
      title: `Penugasan verifikasi dicabut: ${reg.registration_no}`,
      payload: {
        assignment_id: assignment.id,
        registration_no: reg.registration_no,
        reason: data.reason,
        revoked_by: user.name,
        link: `/internal/verifications/${assignment.id}`,
      },
    },
  });

  return updatedAssignment;
}, transactionOptions);

export const reassignVerificationAssignment = async (assignmentId, data, user, req) => {
const createdFiles = [];
try { return await prisma.$transaction(async tx => {
  requireRole(user, ['HELPER_ADMIN', 'SUPERADMIN']);
  const assignment = await tx.verificationAssignment.findUnique({
    where: { id: assignmentId },
    include: { verifier: true },
  });
  if (!assignment) fail(404, 'Penugasan verifikasi tidak ditemukan.');
  const coreTeamRegistration = await registration(tx, assignment.registration_id);
  if (coreTeamRegistration.core_team_number) fail(409, 'Anggota tim inti pengajuan tidak dapat diganti melalui alur ini.');

  if (assignment.status === 'COMPLETED') {
    fail(409, 'Penugasan verifikasi sudah selesai dan tidak dapat dialihkan.');
  }
  if (assignment.status === 'REVOKED') {
    fail(409, 'Penugasan verifikasi sudah dicabut sebelumnya.');
  }
  if (['WAITING_APPROVAL', 'WAITING_SIGNATURE', 'READY_TO_SEND'].includes(assignment.status)) {
    fail(409, 'Penugasan verifikasi tidak dapat dialihkan karena draf pemeriksaan sedang dalam proses telaah atau tanda tangan. Kembalikan draf ke verifikator terlebih dahulu.');
  }
  if (!['ASSIGNED', 'IN_PROGRESS'].includes(assignment.status)) {
    fail(409, `Penugasan tidak dapat dialihkan pada status "${assignment.status}".`);
  }

  if (data.verifier_id === assignment.verifier_id) {
    fail(400, 'Verifikator pengganti harus berbeda dengan verifikator yang ditugaskan saat ini.');
  }

  const newVerifier = await tx.user.findUnique({
    where: { id: data.verifier_id },
    include: { roles: { include: { role: true } } },
  });
  if (!newVerifier || newVerifier.status !== 'ACTIVE' || !newVerifier.roles.some(item => item.role.code === 'VERIFIKATOR')) {
    fail(400, 'Pilih pengguna aktif dengan peran Verifikator.');
  }

  if (await tx.verificationDocument.findUnique({ where: { document_no: data.nota_no } })) {
    fail(409, 'Nomor Nota Dinas sudah digunakan. Masukkan nomor resmi yang berbeda.');
  }

  const reg = await registration(tx, assignment.registration_id);
  const intake = await tx.physicalMasterIntake.findUnique({ where: { registration_id: reg.id } });
  const now = new Date();

  const revokedAssignment = await tx.verificationAssignment.update({
    where: { id: assignment.id },
    data: {
      status: 'REVOKED',
      revoked_at: now,
      revoked_by_id: user.id,
      revocation_reason: data.reason,
    },
  });
  await tx.verificationDocument.updateMany({
    where: { assignment_id: assignment.id, document_type: 'NOTA_DINAS_VERIFIKASI', status: 'ISSUED' },
    data: { status: 'REVOKED' },
  });
  await audit(tx, user, 'REVOKE_FOR_REASSIGNMENT', 'VerificationAssignment', assignment.id, revokedAssignment, req);

  const assignedAt = new Date();
  const dueAt = await calculateDueAt(tx, assignedAt, 2, { applyCutoff: true });

  const previousNota = await tx.verificationDocument.findFirst({
    where: { registration_id: reg.id, document_type: 'NOTA_DINAS_VERIFIKASI' },
    orderBy: { version: 'desc' },
    select: { version: true },
  });

  const newAssignment = await tx.verificationAssignment.create({
    data: {
      registration_id: reg.id,
      verifier_id: newVerifier.id,
      assigned_by_id: user.id,
      assigned_at: assignedAt,
      due_at: dueAt,
      assignment_notes: data.notes || assignment.assignment_notes,
      status: 'ASSIGNED',
    },
  });

  const newNota = await tx.verificationDocument.create({
    data: {
      registration_id: reg.id,
      assignment_id: newAssignment.id,
      document_type: 'NOTA_DINAS_VERIFIKASI',
      document_no: data.nota_no,
      version: (previousNota?.version || 0) + 1,
      status: 'ISSUED',
      created_by_id: user.id,
      approved_by_id: user.id,
      approved_at: assignedAt,
      content_snapshot: {
        registration_no: reg.registration_no,
        title: reg.title,
        verifier_id: newVerifier.id,
        verifier_name: newVerifier.name,
        assigned_by_id: user.id,
        assigned_by_name: user.name,
        physical_receipt_no: intake?.receipt_no || null,
        volume_count: intake?.volume_count || null,
        assigned_at: assignedAt.toISOString(),
        due_at: dueAt.toISOString(),
        notes: data.notes || null,
        reassigned_from_assignment_id: assignment.id,
        reassignment_reason: data.reason,
      },
    },
  });
  const fileId = await archiveVerificationPdf(tx, newNota, user, assignedAt, createdFiles);
  const issuedNota = await tx.verificationDocument.update({ where: { id: newNota.id }, data: { file_id: fileId } });

  if (reg.status !== 'VERIFICATION_ASSIGNED') {
    await move(tx, reg, 'VERIFICATION_ASSIGNED', user, `Penugasan dialihkan kepada ${newVerifier.name} via Nota Dinas ${data.nota_no}: ${data.reason}`, req);
  } else {
    await audit(tx, user, 'REASSIGN_VERIFICATION', 'Registration', reg.id, { nota_no: data.nota_no, new_verifier_id: newVerifier.id, reason: data.reason }, req);
  }

  await audit(tx, user, 'CREATE_VERIFICATION_ASSIGNMENT', 'VerificationAssignment', newAssignment.id, newAssignment, req);
  await audit(tx, user, 'APPROVE_INTERNAL_VERIFICATION_MEMO', 'VerificationDocument', newNota.id, { file_id: fileId, approved_at: assignedAt }, req);

  await tx.notification.create({
    data: {
      user_id: assignment.verifier_id,
      registration_id: reg.id,
      type: 'ASSIGNMENT_REVOKED',
      title: `Penugasan verifikasi dialihkan: ${reg.registration_no}`,
      payload: {
        assignment_id: assignment.id,
        registration_no: reg.registration_no,
        reason: data.reason,
        revoked_by: user.name,
        link: `/internal/verifications/${assignment.id}`,
      },
    },
  });

  await tx.notification.create({
    data: {
      user_id: newVerifier.id,
      registration_id: reg.id,
      type: 'ASSIGNMENT',
      title: `Penugasan verifikasi ${reg.registration_no}`,
      payload: {
        assignment_id: newAssignment.id,
        link: `/internal/verifications/${newAssignment.id}`,
        nota_no: data.nota_no,
        assigned_at: assignedAt.toISOString(),
        due_at: dueAt.toISOString(),
      },
    },
  });

  return { assignment: newAssignment, nota_dinas: issuedNota, old_assignment: revokedAssignment };
}, transactionOptions); }
catch (error) { await cleanupGeneratedFiles(createdFiles); throw error; }
};

export const getVerificationAttachment = async (documentId, fileId, user) => {
  const doc = await prisma.verificationDocument.findUnique({
    where: { id: documentId },
    include: { registration: true, assignment: true },
  });
  if (!doc) fail(404, 'Dokumen verifikasi tidak ditemukan.');

  const isHead = user.roles.includes('KEPALA_LPMQ');
  const isAdmin = user.roles.includes('SUPERADMIN') || user.roles.includes('HELPER_ADMIN');
  const isOwnerPublisher = user.roles.includes('ADMIN_PENERBIT') && user.publisherId === doc.registration.publisher_id;
  const isAssignedVerifier = user.roles.includes('VERIFIKATOR') && (user.id === doc.created_by_id || user.id === doc.assignment?.verifier_id);

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

// PR-VER-04: Persetujuan Kepala LPMQ (Epic E)
export const approveVerificationDocument = async (documentId, user, req) => {
const createdFiles = [];
try { return await prisma.$transaction(async tx => {
  if (!user.roles.includes('KEPALA_LPMQ')) {
    fail(403, 'Persetujuan surat hasil verifikasi hanya dapat dilakukan oleh Kepala LPMQ.');
  }

  const doc = await tx.verificationDocument.findUnique({
    where: { id: documentId },
    include: { registration: true, assignment: true },
  });
  if (!doc) fail(404, 'Dokumen verifikasi tidak ditemukan.');
  if (!['SURAT_HASIL_VERIFIKASI', 'SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI', 'BERITA_ACARA_VERIFIKASI'].includes(doc.document_type)) {
    fail(400, 'Hanya dokumen hasil verifikasi yang memerlukan persetujuan.');
  }
  if (doc.status !== 'SUBMITTED') {
    fail(409, `Dokumen saat ini berstatus "${doc.status}". Hanya dokumen yang berstatus SUBMITTED yang dapat disetujui.`);
  }

  const reg = await registration(tx, doc.registration_id);
  requireStatus(reg, ['WAITING_VERIFICATION_APPROVAL']);

  const now = new Date();

  // Cari seluruh dokumen hasil verifikasi pada assignment ini yang SUBMITTED
  const relatedDocs = await tx.verificationDocument.findMany({
    where: {
      assignment_id: doc.assignment_id,
      document_type: { in: ['SURAT_HASIL_VERIFIKASI', 'SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI', 'BERITA_ACARA_VERIFIKASI'] },
      status: 'SUBMITTED',
    },
  });

  const verifierUser = doc.assignment?.verifier_id
    ? await tx.user.findUnique({ where: { id: doc.assignment.verifier_id } })
    : (doc.created_by_id ? await tx.user.findUnique({ where: { id: doc.created_by_id } }) : null);

  const passedResult = relatedDocs.find(item =>
    ['SURAT_HASIL_VERIFIKASI', 'SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI'].includes(item.document_type)
    && item.content_snapshot?.decision === 'PASSED'
  );
  let payment = null;
  if (passedResult) {
    payment = await tx.paymentRecord.findFirst({ where: { registration_id: reg.id }, orderBy: { created_at: 'desc' } });
    if (!payment || !passedResult.content_snapshot?.billing_no || payment.billing_no !== passedResult.content_snapshot.billing_no) {
      fail(409, 'Surat lolos belum dapat disahkan: kode billing PNBP harus dicatat dan ditandatangani Verifikator terlebih dahulu.');
    }
  }
  const updatedDocs = [];
  for (const rDoc of relatedDocs) {
    const verifierSignature = await tx.verificationDocumentSignatory.findFirst({
      where: { document_id: rDoc.id, signer_user_id: verifierUser?.id, status: 'SIGNED' },
    });
    if (!verifierSignature || verifierSignature.document_hash !== computeDocumentHash(rDoc)) {
      fail(409, 'Kepala LPMQ hanya dapat mengesahkan dokumen yang telah ditandatangani Verifikator dan belum berubah isinya.');
    }
    const suppliedNumber = req?.body?.document_numbers?.[rDoc.document_type];
    const documentNo = rDoc.document_no || (typeof suppliedNumber === 'string' ? suppliedNumber.trim() : '');
    if (documentNo.length < 3 || documentNo.length > 191) {
      fail(400, `Nomor resmi ${rDoc.document_type} wajib diisi (3–191 karakter) sebelum persetujuan.`);
    }
    if (await tx.verificationDocument.findFirst({ where: { document_no: documentNo, id: { not: rDoc.id } }, select: { id: true } })) {
      fail(409, `Nomor dokumen ${documentNo} sudah digunakan.`);
    }
    const contentSnapshot = rDoc.content_snapshot;
    const numberedDoc = { ...rDoc, document_no: documentNo, content_snapshot: contentSnapshot };
    const fileId = await archiveVerificationPdf(tx, numberedDoc, user, now, createdFiles);
    const updated = await tx.verificationDocument.update({
      where: { id: rDoc.id },
      data: {
        status: 'SIGNED',
        approved_by_id: user.id,
        approved_at: now,
        file_id: fileId,
        document_no: documentNo,
        content_snapshot: contentSnapshot,
        signature_status: 'SIGNED',
        signed_at: now,
      },
    });
    const archivedFile = await tx.storedFile.findUnique({ where: { id: fileId }, select: { checksum: true } });
    await tx.verificationDocumentSignatory.create({ data: {
      document_id: updated.id,
      signer_user_id: user.id,
      name_position_snapshot: `${user.name} (Kepala LPMQ)`,
      sign_order: 2,
      method: 'INTERNAL_APPROVAL',
      status: 'SIGNED',
      signed_at: now,
      document_hash: archivedFile.checksum,
    } });
    updatedDocs.push(updated);
  }

  const primaryUpdated = updatedDocs.find(d => d.id === documentId) || updatedDocs[0];

  // Verifikator menandatangani saat menyerahkan draf; Kepala mengesahkan sekali.
  if (doc.assignment_id) {
    await tx.verificationAssignment.update({
      where: { id: doc.assignment_id },
      data: { status: 'READY_TO_SEND' },
    });
  }

  await move(tx, reg, 'VERIFICATION_APPROVED', user, `Draf hasil verifikasi disetujui secara internal oleh Kepala LPMQ (${user.name}).`, req);
  await audit(tx, user, 'APPROVE_VERIFICATION_RESULT', 'VerificationDocument', documentId, primaryUpdated, req);

  // Notifikasi ke Verifikator: dokumen telah disahkan dan siap dikirim.
  if (doc.created_by_id) {
    await tx.notification.create({
      data: {
        user_id: doc.created_by_id,
        registration_id: reg.id,
        type: 'DOCUMENT_APPROVED',
        title: `Surat hasil siap dikirim: ${reg.registration_no}`,
        payload: {
          document_id: documentId,
          registration_no: reg.registration_no,
          approver_name: user.name,
          link: `/internal/verifications/${doc.assignment_id}`,
        },
      },
    });
  }

  return primaryUpdated;
}, transactionOptions); }
catch (error) { await cleanupGeneratedFiles(createdFiles); throw error; }
};

export const returnVerificationDocument = (documentId, data, user, req) => prisma.$transaction(async tx => {
  if (!user.roles.includes('KEPALA_LPMQ')) {
    fail(403, 'Pengembalian draf surat hasil verifikasi hanya dapat dilakukan oleh Kepala LPMQ.');
  }

  const doc = await tx.verificationDocument.findUnique({
    where: { id: documentId },
    include: { registration: true, assignment: true },
  });
  if (!doc) fail(404, 'Dokumen verifikasi tidak ditemukan.');
  if (!['SURAT_HASIL_VERIFIKASI', 'SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI', 'BERITA_ACARA_VERIFIKASI'].includes(doc.document_type)) {
    fail(400, 'Hanya dokumen hasil verifikasi yang dapat dikembalikan.');
  }
  if (doc.status !== 'SUBMITTED') {
    fail(409, `Dokumen saat ini berstatus "${doc.status}". Hanya dokumen yang berstatus SUBMITTED yang dapat dikembalikan.`);
  }

  const reg = await registration(tx, doc.registration_id);
  requireStatus(reg, ['WAITING_VERIFICATION_APPROVAL']);

  const updated = await tx.verificationDocument.update({
    where: { id: documentId },
    data: {
      status: 'RETURNED',
    },
  });

  if (doc.assignment_id) {
    // Kembalikan seluruh dokumen hasil verifikasi terkait dalam penugasan ini secara atomik
    await tx.verificationDocument.updateMany({
      where: {
        assignment_id: doc.assignment_id,
        document_type: { in: ['SURAT_HASIL_VERIFIKASI', 'SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI', 'BERITA_ACARA_VERIFIKASI'] },
        status: 'SUBMITTED',
      },
      data: { status: 'RETURNED' },
    });

    // Transisi assignment kembali ke IN_PROGRESS dengan return_reason terstruktur
    await tx.verificationAssignment.update({
      where: { id: doc.assignment_id },
      data: {
        status: 'IN_PROGRESS',
        return_reason: data.reason,
      },
    });
  }

  await move(tx, reg, 'IN_VERIFICATION', user, `Draf surat hasil verifikasi dikembalikan oleh Kepala LPMQ: ${data.reason}`, req);
  await audit(tx, user, 'RETURN_VERIFICATION_RESULT', 'VerificationDocument', documentId, { ...updated, reason: data.reason }, req);

  if (doc.created_by_id) {
    await tx.notification.create({
      data: {
        user_id: doc.created_by_id,
        registration_id: reg.id,
        type: 'DRAFT_RETURNED',
        title: `Draf hasil verifikasi dikembalikan: ${reg.registration_no}`,
        payload: {
          assignment_id: doc.assignment_id,
          document_id: documentId,
          registration_no: reg.registration_no,
          reason: data.reason,
          returned_by: user.name,
          link: doc.assignment_id ? `/internal/verifications/${doc.assignment_id}` : '/internal/verifications',
        },
      },
    });
  }

  return updated;
}, transactionOptions);

// Endpoint Penandatanganan Dokumen Verifikasi (P0-02)
export const signVerificationDocumentHandler = async (documentId, user, req) => {
  return signVerificationDocument(documentId, user, req);
};

// PR-VER-04: Pengiriman Surat Hasil Verifikasi kepada Penerbit via Email Outbox (Epic F & KB-07)
export const sendVerificationResult = async (documentId, data, user, req) => {
  requireRole(user, ['VERIFIKATOR']);

  const doc = await prisma.verificationDocument.findUnique({
    where: { id: documentId },
    include: {
      registration: {
        include: { publisher: { include: { user: true } } },
      },
      assignment: true,
      signatories: true,
    },
  });

  if (!doc) fail(404, 'Dokumen verifikasi tidak ditemukan.');
  if (!['SURAT_HASIL_VERIFIKASI', 'SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI'].includes(doc.document_type)) {
    fail(400, 'Hanya dokumen Surat Hasil Verifikasi yang dapat dikirimkan kepada penerbit.');
  }
  if (doc.assignment && doc.assignment.verifier_id !== user.id) {
    fail(403, 'Anda bukan verifikator yang ditugaskan untuk mengirimkan surat hasil pengajuan ini.');
  }
  if (doc.status === 'SENT') {
    fail(409, 'Surat hasil verifikasi sudah dikirimkan kepada penerbit sebelumnya.');
  }
  if (doc.status !== 'SIGNED') {
    fail(409, `Surat hasil verifikasi belum ditandatangani secara lengkap (status dokumen: ${doc.status}).`);
  }

  // Validasi seluruh penandatangan selesai
  await assertDocumentFullySigned(prisma, doc.id);

  // Periksa Berita Acara terkait (bila ada)
  const relatedBA = await prisma.verificationDocument.findFirst({
    where: {
      assignment_id: doc.assignment_id,
      document_type: 'BERITA_ACARA_VERIFIKASI',
    },
    include: { signatories: true },
  });

  if (relatedBA && relatedBA.status !== 'SIGNED') {
    fail(409, `Berita Acara Verifikasi belum selesai ditandatangani (status: ${relatedBA.status}). Selesaikan penandatanganan Berita Acara terlebih dahulu.`);
  }

  const reg = doc.registration;
  if (reg.status !== 'VERIFICATION_APPROVED') {
    fail(409, `Surat hasil verifikasi belum dapat dikirimkan pada status pengajuan ${reg.status}.`);
  }

  const recipientEmail = reg.publisher?.user?.email || reg.publisher?.email;
  if (!recipientEmail || typeof recipientEmail !== 'string' || !recipientEmail.trim() || !recipientEmail.includes('@')) {
    fail(400, 'Alamat email penerbit tidak ditemukan atau tidak valid pada data pendaftaran. Perbarui kontak akun penerbit terlebih dahulu sebelum mengirimkan surat hasil verifikasi.');
  }
  const recipientName = reg.publisher?.legal_name || 'Penerbit';
  const decision = doc.content_snapshot?.decision || doc.assignment?.decision || 'PASSED';
  const approvedPayment = decision === 'PASSED'
    ? await prisma.paymentRecord.findFirst({ where: { registration_id: reg.id }, orderBy: { created_at: 'desc' } })
    : null;
  if (decision === 'PASSED' && (!approvedPayment || approvedPayment.billing_no !== doc.content_snapshot?.billing_no)) {
    fail(409, 'Surat belum dapat dikirim karena kode billing pada surat tidak cocok dengan tagihan PNBP.');
  }
  const idempotencyKey = `send_verification_${doc.id}_v${doc.version}`;

  const subject = decision === 'PASSED'
    ? `Hasil Verifikasi Mushaf: Naskah Memenuhi Syarat (${reg.registration_no})`
    : `Hasil Verifikasi Mushaf: Perbaikan Diperlukan (${reg.registration_no})`;

  // 1. Eksekusi pengiriman email melalui provider
  try {
    await sendOutboxEmail(prisma, {
      registrationId: reg.id,
      documentId: doc.id,
      idempotencyKey,
      recipientEmail,
      recipientName,
      subject,
      template: decision === 'PASSED' ? 'VERIFICATION_PASSED' : 'VERIFICATION_REVISION',
      payload: {
        registration_no: reg.registration_no,
        title: reg.title,
        decision,
        notes: doc.content_snapshot?.notes || '',
        letter_text: doc.content_snapshot?.letter_text || '',
        billing_no: approvedPayment?.billing_no || null,
        billing_amount: approvedPayment ? String(approvedPayment.amount) : null,
        billing_expires_at: approvedPayment?.expires_at || null,
      },
    });
  } catch (error) {
    // Tandai status dokumen EMAIL_FAILED tanpa memajukan registrasi / assignment
    await prisma.verificationDocument.update({
      where: { id: doc.id },
      data: { status: 'EMAIL_FAILED' },
    });
    await audit(prisma, user, 'SEND_VERIFICATION_EMAIL_FAILED', 'VerificationDocument', doc.id, {
      error: error.message,
      status: 'EMAIL_FAILED',
    }, req);
    fail(502, `Pengiriman email hasil verifikasi gagal: ${error.message}. Status dokumen kini EMAIL_FAILED. Silakan coba kirim ulang.`);
  }

  // 2. Transaksi atomik transisi status berhasil
  return prisma.$transaction(async tx => {
    const now = new Date();
    const updatedDoc = await tx.verificationDocument.update({
      where: { id: doc.id },
      data: {
        status: 'SENT',
        sent_at: now,
        sent_channel: 'EMAIL',
        sent_to: recipientName,
      },
    });

    if (relatedBA) {
      await tx.verificationDocument.update({
        where: { id: relatedBA.id },
        data: {
          status: 'SENT',
          sent_at: now,
          sent_channel: 'INTERNAL',
          sent_to: 'Arsip Internal LPMQ',
        },
      });
    }

    // P0-01: Lifecycle VerificationAssignment -> COMPLETED
    if (doc.assignment_id) {
      await tx.verificationAssignment.update({
        where: { id: doc.assignment_id },
        data: {
          status: 'COMPLETED',
          completed_at: now,
          decision,
        },
      });
    }

    let payment = null;

    if (decision === 'PASSED') {
      await move(tx, reg, 'AWAITING_PAYMENT', user, `Surat hasil telaah disahkan dan dikirimkan kepada penerbit (${recipientName})`, req);

      payment = approvedPayment;

      if (reg.publisher?.user_id) {
        await tx.notification.create({
          data: {
            user_id: reg.publisher.user_id,
            registration_id: reg.id,
            type: 'VERIFICATION_RESULT_SENT',
            title: `Hasil Verifikasi: Naskah Lolos & Tagihan PNBP Diterbitkan (${reg.registration_no})`,
            payload: {
              document_id: doc.id,
              billing_id: payment?.id,
              billing_no: payment?.billing_no,
              amount: payment?.amount,
              expires_at: payment?.expires_at,
            },
          },
        });
      }
    } else {
      await move(tx, reg, 'REVISION_REQUIRED', user, `Surat hasil telaah (Perlu Perbaikan) dikirimkan kepada penerbit (${recipientName})`, req);
      await tx.registration.update({
        where: { id: reg.id },
        data: { revision_source: 'VERIFICATION' },
      });

      if (reg.publisher?.user_id) {
        await tx.notification.create({
          data: {
            user_id: reg.publisher.user_id,
            registration_id: reg.id,
            type: 'VERIFICATION_RESULT_REVISION',
            title: `Hasil Verifikasi: Perbaikan Naskah Diperlukan (${reg.registration_no})`,
            payload: {
              document_id: doc.id,
              notes: doc.content_snapshot?.notes,
            },
          },
        });
      }
    }

    await audit(tx, user, 'SEND_VERIFICATION_RESULT', 'VerificationDocument', doc.id, updatedDoc, req);
    return { document: updatedDoc, payment };
  }, transactionOptions);
};

// Retry pengiriman email hasil verifikasi yang sempat gagal
export const retryVerificationEmail = async (documentId, user, req) => {
  requireRole(user, ['VERIFIKATOR']);

  const doc = await prisma.verificationDocument.findUnique({
    where: { id: documentId },
    include: { assignment: true },
  });

  if (!doc) fail(404, 'Dokumen verifikasi tidak ditemukan.');
  if (doc.status !== 'EMAIL_FAILED') {
    fail(409, `Hanya dokumen yang berstatus EMAIL_FAILED yang dapat dicoba kirim ulang (status saat ini: ${doc.status}).`);
  }
  if (doc.assignment && doc.assignment.verifier_id !== user.id) {
    fail(403, 'Anda bukan verifikator yang ditugaskan untuk naskah ini.');
  }

  // Kembalikan sementara ke status SIGNED agar fungsi sendVerificationResult dapat memproses
  await prisma.verificationDocument.update({
    where: { id: doc.id },
    data: { status: 'SIGNED' },
  });

  return sendVerificationResult(documentId, { channel: 'EMAIL' }, user, req);
};

export const getVerificationDocument = async (documentId, user) => {
  const doc = await prisma.verificationDocument.findUnique({
    where: { id: documentId },
    include: {
      registration: {
        include: {
          publisher: { select: { id: true, legal_name: true, entity_type: true } },
          service_type: true,
          payment_records: { orderBy: { created_at: 'desc' } },
        },
      },
      assignment: {
        select: { id: true, verifier_id: true },
      },
      created_by: { select: { id: true, name: true, nip: true } },
      approved_by: { select: { id: true, name: true, nip: true } },
      signatories: {
        orderBy: { sign_order: 'asc' },
        include: { signer: { select: { id: true, name: true, nip: true } } },
      },
    },
  });
  if (!doc) fail(404, 'Dokumen verifikasi tidak ditemukan.');

  const isHead = user.roles.includes('KEPALA_LPMQ');
  const isAdmin = user.roles.includes('SUPERADMIN') || user.roles.includes('HELPER_ADMIN');
  const isVerifier = user.roles.includes('VERIFIKATOR');
  const isOwnerPublisher = user.roles.includes('ADMIN_PENERBIT') && user.publisherId === doc.registration.publisher_id;

  if (isOwnerPublisher) {
    if (doc.status !== 'SENT') {
      fail(403, 'Surat hasil verifikasi belum dikirimkan kepada Anda.');
    }
  } else if (isVerifier && !isHead && !isAdmin) {
    const isAssigned = doc.assignment?.verifier_id === user.id || doc.created_by_id === user.id;
    if (!isAssigned) {
      fail(403, 'Anda tidak memiliki hak akses untuk memeriksa dokumen penugasan verifikator lain.');
    }
  } else if (!isHead && !isAdmin) {
    fail(403, 'Anda tidak memiliki hak akses untuk membaca dokumen ini.');
  }

  return doc;
};
