import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
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

// PR-VER-04: Persetujuan dan Tanda Tangan Kepala LPMQ (Epic E)
export const approveVerificationDocument = (documentId, user, req) => prisma.$transaction(async tx => {
  // BR-VER-013: Administrator teknis tidak menggantikan kewenangan penetapan Kepala LPMQ
  if (!user.roles.includes('KEPALA_LPMQ')) {
    fail(403, 'Persetujuan dan pengesahan surat hasil verifikasi hanya dapat dilakukan oleh Kepala LPMQ.');
  }

  const doc = await tx.verificationDocument.findUnique({
    where: { id: documentId },
    include: { registration: true, assignment: true },
  });
  if (!doc) fail(404, 'Dokumen verifikasi tidak ditemukan.');
  if (doc.document_type !== 'SURAT_HASIL_VERIFIKASI') {
    fail(400, 'Hanya dokumen Surat Hasil Verifikasi yang memerlukan persetujuan.');
  }
  if (doc.status !== 'SUBMITTED') {
    fail(409, `Dokumen saat ini berstatus "${doc.status}". Hanya dokumen yang berstatus SUBMITTED yang dapat disetujui.`);
  }

  const reg = await registration(tx, doc.registration_id);
  requireStatus(reg, ['WAITING_VERIFICATION_APPROVAL']);

  const now = new Date();
  const updated = await tx.verificationDocument.update({
    where: { id: documentId },
    data: {
      status: 'APPROVED',
      approved_by_id: user.id,
      approved_at: now,
      signed_at: now,
    },
  });

  await move(tx, reg, 'VERIFICATION_APPROVED', user, `Surat hasil verifikasi disetujui dan disahkan oleh Kepala LPMQ (${user.name})`, req);
  await audit(tx, user, 'APPROVE_VERIFICATION_RESULT', 'VerificationDocument', documentId, updated, req);

  // Notifikasi ke verifikator penugasan
  if (doc.created_by_id) {
    await tx.notification.create({
      data: {
        user_id: doc.created_by_id,
        registration_id: reg.id,
        type: 'DOCUMENT_APPROVED',
        title: `Draf hasil verifikasi disetujui: ${reg.registration_no}`,
        payload: {
          document_id: documentId,
          registration_no: reg.registration_no,
          approver_name: user.name,
        },
      },
    });
  }

  return updated;
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
  if (doc.document_type !== 'SURAT_HASIL_VERIFIKASI') {
    fail(400, 'Hanya dokumen Surat Hasil Verifikasi yang dapat dikembalikan.');
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

  await move(tx, reg, 'IN_VERIFICATION', user, `Draf surat hasil verifikasi dikembalikan oleh Kepala LPMQ: ${data.reason}`, req);
  await audit(tx, user, 'RETURN_VERIFICATION_RESULT', 'VerificationDocument', documentId, { ...updated, reason: data.reason }, req);

  // Notifikasi ke verifikator penugasan
  if (doc.created_by_id) {
    await tx.notification.create({
      data: {
        user_id: doc.created_by_id,
        registration_id: reg.id,
        type: 'DRAFT_RETURNED',
        title: `Draf hasil verifikasi dikembalikan: ${reg.registration_no}`,
        payload: {
          document_id: documentId,
          registration_no: reg.registration_no,
          reason: data.reason,
          returned_by: user.name,
        },
      },
    });
  }

  return updated;
}, transactionOptions);

// PR-VER-04: Pengiriman Surat Hasil Verifikasi kepada Penerbit (Epic F)
export const sendVerificationResult = (documentId, data, user, req) => prisma.$transaction(async tx => {
  requireRole(user, ['VERIFIKATOR']);

  const doc = await tx.verificationDocument.findUnique({
    where: { id: documentId },
    include: {
      registration: {
        include: { publisher: true },
      },
      assignment: true,
    },
  });
  if (!doc) fail(404, 'Dokumen verifikasi tidak ditemukan.');
  if (doc.document_type !== 'SURAT_HASIL_VERIFIKASI') {
    fail(400, 'Hanya dokumen Surat Hasil Verifikasi yang dapat dikirimkan kepada penerbit.');
  }
  if (doc.assignment && doc.assignment.verifier_id !== user.id) {
    fail(403, 'Anda bukan verifikator yang ditugaskan untuk mengirimkan surat hasil pengajuan ini.');
  }
  if (doc.status === 'SENT') {
    fail(409, 'Surat hasil verifikasi sudah dikirimkan kepada penerbit sebelumnya.');
  }
  if (doc.status !== 'APPROVED') {
    fail(409, `Surat hasil verifikasi belum disetujui Kepala LPMQ (status dokumen: ${doc.status}).`);
  }

  const reg = await registration(tx, doc.registration_id);
  requireStatus(reg, ['VERIFICATION_APPROVED']);

  const now = new Date();
  const channel = data?.channel || 'IN_APP';
  const targetName = reg.publisher?.legal_name || 'Penerbit';

  const updatedDoc = await tx.verificationDocument.update({
    where: { id: documentId },
    data: {
      status: 'SENT',
      sent_at: now,
      sent_channel: channel,
      sent_to: targetName,
    },
  });

  const decision = doc.content_snapshot?.decision || doc.assignment?.decision || 'PASSED';
  let payment = null;

  if (decision === 'PASSED') {
    await move(tx, reg, 'AWAITING_PAYMENT', user, `Surat hasil telaah disahkan dan dikirimkan kepada penerbit (${targetName})`, req);

    // Idempoten pembuatan tagihan pembayaran PNBP
    const existingPayment = await tx.paymentRecord.findFirst({
      where: { registration_id: reg.id },
    });

    if (!existingPayment) {
      const total = reg.fee_sla_snapshot?.total_fee;
      if (total === undefined || total === null || !Number.isFinite(Number(total)) || Number(total) < 0) {
        fail(409, 'Tagihan belum dapat dibuat karena rincian tarif saat pendaftaran tidak lengkap. Hubungi administrator.');
      }
      const cleanRegNo = reg.registration_no.replace(/[^A-Za-z0-9]/g, '');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Batas 7 hari

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
            document_id: documentId,
            billing_id: payment?.id,
            billing_no: payment?.billing_no,
            amount: payment?.amount,
            expires_at: payment?.expires_at,
          },
        },
      });
    }
  } else {
    await move(tx, reg, 'REVISION_REQUIRED', user, `Surat hasil telaah (Perlu Perbaikan) dikirimkan kepada penerbit (${targetName})`, req);
    if (reg.publisher?.user_id) {
      await tx.notification.create({
        data: {
          user_id: reg.publisher.user_id,
          registration_id: reg.id,
          type: 'VERIFICATION_RESULT_REVISION',
          title: `Hasil Verifikasi: Perbaikan Naskah Diperlukan (${reg.registration_no})`,
          payload: {
            document_id: documentId,
            notes: doc.content_snapshot?.notes,
          },
        },
      });
    }
  }

  await audit(tx, user, 'SEND_VERIFICATION_RESULT', 'VerificationDocument', documentId, updatedDoc, req);
  return { document: updatedDoc, payment };
}, transactionOptions);

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
      created_by: { select: { id: true, name: true, nip: true } },
      approved_by: { select: { id: true, name: true, nip: true } },
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
  } else if (!isHead && !isAdmin && !isVerifier) {
    fail(403, 'Anda tidak memiliki hak akses untuk membaca dokumen ini.');
  }

  return doc;
};


