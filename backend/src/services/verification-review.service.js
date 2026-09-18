import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { audit, fail, move, registration, requireRole, requireStatus } from './workflow-utils.js';
import { assertAttachmentFileOwnership } from './resource-policy.service.js';
import { initVerificationSignatories, signVerificationDocument, assertDocumentFullySigned } from './verification-signing.service.js';
import { sendOutboxEmail } from './email-provider.service.js';

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
    await assertAttachmentFileOwnership(tx, data.attachment_file_ids, user, reg.id);
  }

  const existingDraft = await tx.verificationDocument.findFirst({
    where: {
      assignment_id: assignmentId,
      document_type: { in: ['SURAT_HASIL_VERIFIKASI', 'SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI'] },
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
    where: { registration_id: reg.id, document_type: { in: ['SURAT_HASIL_VERIFIKASI', 'SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI'] } },
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
    await assertAttachmentFileOwnership(tx, data.attachment_file_ids, user, reg.id);
  }

  const existingDraft = await tx.verificationDocument.findFirst({
    where: {
      assignment_id: assignmentId,
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
          document_type: docType,
          version,
          status: 'SUBMITTED',
          created_by_id: user.id,
          content_snapshot: content,
        },
      });

  // Buat atau perbarui Berita Acara Verifikasi (KB-03 & §4.1)
  const existingBADraft = await tx.verificationDocument.findFirst({
    where: {
      assignment_id: assignmentId,
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

  if (existingBADraft) {
    await tx.verificationDocument.update({
      where: { id: existingBADraft.id },
      data: {
        status: 'SUBMITTED',
        content_snapshot: baContent,
      },
    });
  } else {
    await tx.verificationDocument.create({
      data: {
        registration_id: reg.id,
        assignment_id: assignmentId,
        document_type: 'BERITA_ACARA_VERIFIKASI',
        version,
        status: 'SUBMITTED',
        created_by_id: user.id,
        content_snapshot: baContent,
      },
    });
  }

  await tx.verificationAssignment.update({
    where: { id: assignmentId },
    data: {
      decision: data.decision,
      notes: data.notes || null,
      status: 'WAITING_APPROVAL',  // Pemilik tindakan berganti ke Kepala LPMQ
      return_reason: null,        // Reset catatan pengembalian setelah perbaikan diajukan
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
          assignment_id: assignmentId,
          document_id: document.id,
          version: document.version,
          decision: data.decision,
          verifier_name: user.name,
          link: `/internal/verifications/${assignmentId}`,
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
  const isAdmin = user.roles.includes('SUPERADMIN');
  if (!isHead && !isAdmin && assignment.verifier_id !== user.id) {
    fail(403, 'Anda tidak memiliki hak akses untuk memeriksa penugasan verifikator lain.');
  }

  const now = new Date();
  const dueAt = assignment.due_at ? new Date(assignment.due_at) : null;
  const isOverdue = dueAt && now.getTime() > dueAt.getTime() && assignment.status !== 'COMPLETED';
  const remainingMs = dueAt ? Math.max(0, dueAt.getTime() - now.getTime()) : null;

  const notaDinas = assignment.documents.find(d => d.document_type === 'NOTA_DINAS_VERIFIKASI') || null;
  const resultDocuments = assignment.documents.filter(d => ['SURAT_HASIL_VERIFIKASI', 'SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI', 'BERITA_ACARA_VERIFIKASI'].includes(d.document_type));
  const latestDraft = resultDocuments.find(d => ['SURAT_HASIL_VERIFIKASI', 'SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI'].includes(d.document_type)) || resultDocuments[0] || null;
  const beritaAcara = assignment.documents.find(d => d.document_type === 'BERITA_ACARA_VERIFIKASI') || null;

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
      return_reason: assignment.return_reason,
      assignment_notes: assignment.assignment_notes,
      verifier: assignment.verifier,
      assigned_by: assignment.assigned_by,
      sla: {
        due_at: assignment.due_at,
        is_overdue: Boolean(isOverdue),
        remaining_ms: remainingMs,
        duration_target: '2 hari kerja',
      },
    },
    registration: assignment.registration,
    nota_dinas: notaDinas,
    latest_result_document: latestDraft,
    berita_acara: beritaAcara,
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

// PR-VER-04: Persetujuan Kepala LPMQ (Epic E)
export const approveVerificationDocument = (documentId, user, req) => prisma.$transaction(async tx => {
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

  const updatedDocs = [];
  for (const rDoc of relatedDocs) {
    const updated = await tx.verificationDocument.update({
      where: { id: rDoc.id },
      data: {
        status: 'APPROVED',
        approved_by_id: user.id,
        approved_at: now,
        signature_status: 'PENDING',
      },
    });
    // Inisialisasi signatories untuk dokumen ini
    await initVerificationSignatories(tx, updated, verifierUser, user);
    updatedDocs.push(updated);
  }

  const primaryUpdated = updatedDocs.find(d => d.id === documentId) || updatedDocs[0];

  // Transisi assignment ke WAITING_SIGNATURE
  if (doc.assignment_id) {
    await tx.verificationAssignment.update({
      where: { id: doc.assignment_id },
      data: { status: 'WAITING_SIGNATURE' },
    });
  }

  await move(tx, reg, 'VERIFICATION_APPROVED', user, `Draf hasil verifikasi disetujui oleh Kepala LPMQ (${user.name}). Proses penandatanganan dimulai.`, req);
  await audit(tx, user, 'APPROVE_VERIFICATION_RESULT', 'VerificationDocument', documentId, primaryUpdated, req);

  // Notifikasi ke Verifikator: draft disetujui, mulai tanda tangan
  if (doc.created_by_id) {
    await tx.notification.create({
      data: {
        user_id: doc.created_by_id,
        registration_id: reg.id,
        type: 'DOCUMENT_APPROVED',
        title: `Draf disetujui — mulai penandatanganan: ${reg.registration_no}`,
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
}, transactionOptions);

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

  const recipientEmail = reg.publisher?.user?.email || reg.publisher?.email || 'penerbit@gmail.com';
  const recipientName = reg.publisher?.legal_name || 'Penerbit';
  const decision = doc.content_snapshot?.decision || doc.assignment?.decision || 'PASSED';
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

      const existingPayment = await tx.paymentRecord.findFirst({
        where: { registration_id: reg.id },
      });

      if (!existingPayment) {
        const total = reg.fee_sla_snapshot?.total_fee;
        if (total === undefined || total === null || !Number.isFinite(Number(total)) || Number(total) < 0) {
          fail(409, 'Tagihan belum dapat dibuat karena rincian tarif saat pendaftaran tidak lengkap. Hubungi administrator.');
        }
        const cleanRegNo = reg.registration_no.replace(/[^A-Za-z0-9]/g, '');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        payment = await tx.paymentRecord.create({
          data: {
            registration_id: reg.id,
            billing_no: `BILL-${cleanRegNo}-${randomUUID().slice(0, 6).toUpperCase()}`,
            amount: new Prisma.Decimal(total),
            provider: 'MANUAL',
            status: 'UNPAID',
            expires_at: expiresAt,
          },
        });
        await audit(tx, user, 'CREATE_BILLING', 'PaymentRecord', payment.id, payment, req);
      } else {
        payment = existingPayment;
      }

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
  const isAdmin = user.roles.includes('SUPERADMIN');
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
