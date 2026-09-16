import { prisma } from '../config/database.js';
import { audit, fail, move, registration, requireOwner, requireRole, requireStatus } from './workflow-utils.js';
import { queueItems } from './queue-utils.js';

const transactionOptions = { isolationLevel: 'ReadCommitted' };
const verificationTargetMs = 2 * 24 * 60 * 60 * 1000;

export const declarePhysicalMaster = (id, data, user, req) => prisma.$transaction(async tx => {
  const reg = await registration(tx, id);
  requireOwner(reg, user);
  requireStatus(reg, ['DRAFT', 'READY_FOR_VERIFICATION', 'REVISION_REQUIRED']);
  const previous = await tx.physicalMasterIntake.findUnique({ where: { registration_id: id } });
  if (previous?.status === 'RECEIVED') fail(409, 'Master fisik sudah diterima LPMQ. Hubungi petugas bila data tanda terima perlu diperbaiki.');

  const values = {
    format: data.format,
    binding_method: data.binding_method,
    volume_count: data.volume_count,
    sent_at: data.sent_at ? new Date(data.sent_at) : null,
    delivery_method: data.delivery_method || null,
    notes: data.notes || null,
    status: 'PENDING',
    received_by_id: null,
    received_at: null,
    condition: null,
    receipt_no: null,
  };
  const intake = previous
    ? await tx.physicalMasterIntake.update({ where: { registration_id: id }, data: values })
    : await tx.physicalMasterIntake.create({ data: { registration_id: id, ...values } });
  await audit(tx, user, 'DECLARE_PHYSICAL_MASTER', 'PhysicalMasterIntake', intake.id, intake, req, previous);
  return intake;
}, transactionOptions);

export const receivePhysicalMaster = async (id, data, user, req) => {
  try {
    return await prisma.$transaction(async tx => {
      requireRole(user, ['KEPALA_LPMQ']);
      const reg = await registration(tx, id);
      requireStatus(reg, ['READY_FOR_VERIFICATION']);
      const previous = await tx.physicalMasterIntake.findUnique({ where: { registration_id: id } });
      if (!previous) fail(409, 'Penerbit belum mendeklarasikan master fisik A4 yang dijilid per juz.');
      if (previous.status !== 'PENDING') fail(409, 'Penerimaan master ini sudah diputuskan. Muat ulang status sebelum mencoba lagi.');
      if (data.decision === 'RECEIVED' && data.volume_count !== previous.volume_count) {
        fail(409, 'Jumlah jilid yang diterima berbeda dari deklarasi penerbit. Kembalikan master dengan alasan agar penerbit memperbaiki deklarasi.');
      }
      const intake = await tx.physicalMasterIntake.update({
        where: { registration_id: id },
        data: {
          status: data.decision,
          received_by_id: user.id,
          received_at: data.decision === 'RECEIVED' ? new Date() : null,
          condition: data.condition,
          receipt_no: data.decision === 'RECEIVED' ? data.receipt_no : null,
          notes: data.notes || null,
        },
      });
      await audit(tx, user, data.decision === 'RECEIVED' ? 'RECEIVE_PHYSICAL_MASTER' : 'RETURN_PHYSICAL_MASTER', 'PhysicalMasterIntake', intake.id, intake, req, previous);
      const publisher = await tx.publisher.findUnique({ where: { id: reg.publisher_id }, select: { user_id: true } });
      if (publisher?.user_id) await tx.notification.create({ data: {
        user_id: publisher.user_id,
        registration_id: id,
        type: 'PHYSICAL_MASTER_STATUS',
        title: data.decision === 'RECEIVED' ? 'Master fisik telah diterima LPMQ' : 'Master fisik perlu diperbaiki',
        payload: { status: data.decision, receipt_no: intake.receipt_no, notes: intake.notes },
      } });
      return intake;
    }, transactionOptions);
  } catch (error) {
    if (error.code === 'P2002') fail(409, 'Nomor tanda terima sudah digunakan. Masukkan nomor resmi yang berbeda.');
    throw error;
  }
};

export const createVerificationAssignment = async (id, data, user, req) => {
  try {
    return await prisma.$transaction(async tx => {
      requireRole(user, ['KEPALA_LPMQ']);
      const reg = await registration(tx, id);
      requireStatus(reg, ['READY_FOR_VERIFICATION']);
      const intake = await tx.physicalMasterIntake.findUnique({ where: { registration_id: id } });
      if (intake?.status !== 'RECEIVED' || !intake.receipt_no) {
        fail(409, 'Master fisik belum diterima dan diberi nomor tanda terima. Selesaikan penerimaan sebelum menugaskan verifikator.');
      }
      const active = await tx.verificationAssignment.count({ where: { registration_id: id, status: { in: ['ASSIGNED', 'IN_PROGRESS'] } } });
      if (active) fail(409, 'Pengajuan sudah memiliki verifikator aktif. Muat ulang detail pengajuan.');
      const verifier = await tx.user.findUnique({
        where: { id: data.verifier_id },
        include: { roles: { include: { role: true } } },
      });
      if (!verifier || verifier.status !== 'ACTIVE' || !verifier.roles.some(item => item.role.code === 'VERIFIKATOR')) {
        fail(400, 'Pilih pengguna aktif dengan peran Verifikator.');
      }
      if (await tx.verificationDocument.findUnique({ where: { document_no: data.nota_no } })) {
        fail(409, 'Nomor Nota Dinas sudah digunakan. Masukkan nomor resmi yang berbeda.');
      }

      const assignedAt = new Date();
      const dueAt = new Date(assignedAt.getTime() + verificationTargetMs);
      const previousNota = await tx.verificationDocument.findFirst({
        where: { registration_id: id, document_type: 'NOTA_DINAS_VERIFIKASI' },
        orderBy: { version: 'desc' },
        select: { version: true },
      });
      const assignment = await tx.verificationAssignment.create({ data: {
        registration_id: id,
        verifier_id: verifier.id,
        assigned_by_id: user.id,
        assigned_at: assignedAt,
        due_at: dueAt,
        assignment_notes: data.notes || null,
        status: 'ASSIGNED',
      } });
      const document = await tx.verificationDocument.create({ data: {
        registration_id: id,
        assignment_id: assignment.id,
        document_type: 'NOTA_DINAS_VERIFIKASI',
        document_no: data.nota_no,
        version: (previousNota?.version || 0) + 1,
        status: 'ISSUED',
        created_by_id: user.id,
        content_snapshot: {
          registration_no: reg.registration_no,
          title: reg.title,
          verifier_id: verifier.id,
          verifier_name: verifier.name,
          assigned_by_id: user.id,
          assigned_by_name: user.name,
          physical_receipt_no: intake.receipt_no,
          volume_count: intake.volume_count,
          assigned_at: assignedAt.toISOString(),
          due_at: dueAt.toISOString(),
          notes: data.notes || null,
        },
      } });
      await move(tx, reg, 'VERIFICATION_ASSIGNED', user, `Nota Dinas ${data.nota_no} diterbitkan untuk ${verifier.name}`, req);
      await audit(tx, user, 'CREATE_VERIFICATION_ASSIGNMENT', 'VerificationAssignment', assignment.id, assignment, req);
      await audit(tx, user, 'ISSUE_VERIFICATION_MEMO', 'VerificationDocument', document.id, document, req);
      await tx.notification.create({ data: {
        user_id: verifier.id,
        registration_id: id,
        type: 'ASSIGNMENT',
        title: `Penugasan verifikasi ${reg.registration_no}`,
        payload: { assignment_id: assignment.id, nota_no: data.nota_no, assigned_at: assignedAt.toISOString(), due_at: dueAt.toISOString() },
      } });
      return { assignment, nota_dinas: document };
    }, transactionOptions);
  } catch (error) {
    if (error.code === 'P2002') fail(409, 'Nomor Nota Dinas atau versi dokumen sudah digunakan. Muat ulang data dan coba lagi.');
    throw error;
  }
};

export const getRegistrationReceipt = async (id, user) => {
  const reg = await prisma.registration.findUnique({
    where: { id },
    select: {
      id: true, registration_no: true, publisher_id: true, title: true, status: true, fee_sla_snapshot: true,
      publisher: { select: { legal_name: true } },
      service_type: { select: { name: true } },
      manuscript_files: { select: { type: true, version: true, created_at: true } },
      physical_master_intake: { select: { status: true, format: true, binding_method: true, volume_count: true, receipt_no: true, received_at: true } },
    },
  });
  if (!reg) fail(404, 'Pengajuan tidak ditemukan.');
  if (!user.roles.includes('SUPERADMIN') && !user.roles.includes('KEPALA_LPMQ') && reg.publisher_id !== user.publisherId) {
    fail(403, 'Bukti pendaftaran hanya dapat dilihat oleh penerbit pemilik atau Kepala LPMQ.');
  }
  if (reg.status === 'DRAFT') fail(409, 'Bukti pendaftaran tersedia setelah pengajuan dikirim.');
  return {
    registration_no: reg.registration_no,
    publisher: reg.publisher.legal_name,
    service: reg.service_type.name,
    title: reg.title,
    submitted_at: reg.fee_sla_snapshot?.submitted_at || null,
    status: reg.status,
    digital_documents: reg.manuscript_files,
    physical_master: reg.physical_master_intake || { status: 'NOT_DECLARED' },
  };
};

export const listVerificationAssignments = async (query, user) => {
  requireRole(user, ['KEPALA_LPMQ', 'VERIFIKATOR', 'SUPERADMIN']);
  const where = {};
  const isHead = user.roles.includes('KEPALA_LPMQ');
  const isAdmin = user.roles.includes('SUPERADMIN');
  if (!isHead && !isAdmin) where.verifier_id = user.id;
  if (query.my_tasks === 'true' && (isHead || isAdmin)) where.assigned_by_id = user.id;
  if (query.status) where.status = query.status;
  if (query.registration_status) {
    where.registration = { ...(where.registration || {}), status: query.registration_status };
  }
  if (query.search) {
    where.registration = {
      ...(where.registration || {}),
      OR: [
        { registration_no: { contains: query.search } },
        { title: { contains: query.search } },
        { publisher: { legal_name: { contains: query.search } } },
      ],
    };
  }
  const skip = (query.page - 1) * query.limit;
  const byStage = Boolean(query.registration_status) || query.status === 'IN_PROGRESS';
  const [total, items] = await Promise.all([
    prisma.verificationAssignment.count({ where }),
    prisma.verificationAssignment.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: byStage
        ? [{ registration: { stage_entered_at: 'asc' } }, { id: 'asc' }]
        : [{ assigned_at: query.status === 'COMPLETED' ? 'desc' : 'asc' }, { id: 'asc' }],
      include: {
        verifier: { select: { id: true, name: true } },
        assigned_by: { select: { id: true, name: true } },
        registration: { select: { id: true, registration_no: true, title: true, status: true, stage_entered_at: true, physical_master_intake: { select: { status: true, receipt_no: true } }, publisher: { select: { legal_name: true } } } },
        documents: { where: { document_type: 'NOTA_DINAS_VERIFIKASI' }, select: { id: true, document_no: true, version: true, status: true, created_at: true } },
      },
    }),
  ]);
  return { items: queueItems(items, item => byStage ? item.registration.stage_entered_at : item.assigned_at, skip, query.status !== 'COMPLETED' || Boolean(query.registration_status)), pagination: { total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) } };
};
