import { prisma } from '../config/database.js';
import { logAudit } from './audit.service.js';

// Matriks transisi status resmi (IMPLEMENTATION.md §4 & SRS v2.2 §6.2)
const ALLOWED_TRANSITIONS = {
  DRAFT: ['READY_FOR_VERIFICATION', 'CANCELLED'],
  READY_FOR_VERIFICATION: ['IN_VERIFICATION', 'CANCELLED'],
  IN_VERIFICATION: ['REVISION_REQUIRED', 'WAITING_VERIFICATION_APPROVAL'],
  REVISION_REQUIRED: ['READY_FOR_VERIFICATION', 'CANCELLED'],
  WAITING_VERIFICATION_APPROVAL: ['AWAITING_PAYMENT', 'REVISION_REQUIRED'],
  AWAITING_PAYMENT: ['PAYMENT_VERIFICATION'],
  PAYMENT_VERIFICATION: ['WAITING_DISTRIBUTION'],
  WAITING_DISTRIBUTION: ['TASHIH_IN_PROGRESS'],
  TASHIH_IN_PROGRESS: ['READY_FOR_STT', 'REVISION_REQUIRED'],
  READY_FOR_STT: ['STT_ISSUED'],
  STT_ISSUED: ['DOCUMENTATION_IN_PROGRESS'],
  DOCUMENTATION_IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

const generateRegistrationNo = async () => {
  const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
  const count = await prisma.registration.count();
  const sequence = String(count + 1).padStart(4, '0');
  return `REG-${dateStr}-${sequence}`;
};

export const createDraft = async (data, user, req) => {
  let publisherId = user.publisherId;
  let submissionSource = 'PUBLISHER_PORTAL';

  // Jika dibuat oleh ADMIN atas nama penerbit
  if (user.roles.includes('SUPERADMIN') && data.publisher_id) {
    publisherId = data.publisher_id;
    submissionSource = 'INTERNAL_ADMIN';
  }

  if (!publisherId) {
    const error = new Error('Penerbit wajib ditentukan untuk membuat pengajuan.');
    error.statusCode = 400;
    throw error;
  }

  // Verifikasi service type aktif
  const serviceType = await prisma.serviceType.findUnique({
    where: { id: data.service_type_id },
    include: { category: true },
  });

  if (!serviceType || serviceType.status !== 'ACTIVE') {
    const error = new Error('Jenis layanan tidak ditemukan atau sedang tidak aktif.');
    error.statusCode = 400;
    throw error;
  }

  const regNo = await generateRegistrationNo();

  const registration = await prisma.$transaction(async (tx) => {
    const created = await tx.registration.create({
      data: {
        registration_no: regNo,
        publisher_id: publisherId,
        service_type_id: data.service_type_id,
        title: data.title,
        submission_source: submissionSource,
        registration_type: data.registration_type || 'NEW',
        previous_registration_id: data.previous_registration_id || null,
        status: 'DRAFT',
      },
    });

    // Simpan relasi addon bila ada
    if (data.addons && data.addons.length > 0) {
      const addons = await tx.serviceAddon.findMany({
        where: { id: { in: data.addons }, status: 'ACTIVE' },
      });

      for (const add of addons) {
        await tx.registrationAddon.create({
          data: {
            registration_id: created.id,
            addon_id: add.id,
            fee_snapshot: add.fee,
            quantity: 1,
          },
        });
      }
    }

    // Catat riwayat status awal
    await tx.statusHistory.create({
      data: {
        registration_id: created.id,
        from_status: 'NONE',
        to_status: 'DRAFT',
        actor_id: user.id,
        notes: 'Draf pengajuan dibuat',
      },
    });

    return created;
  });

  await logAudit({
    actorId: user.id,
    action: 'CREATE_REGISTRATION_DRAFT',
    subjectType: 'Registration',
    subjectId: registration.id,
    afterJson: registration,
    req,
  });

  return registration;
};

export const submitRegistration = async (id, user, req) => {
  const reg = await prisma.registration.findUnique({
    where: { id },
    include: {
      service_type: true,
      addons: { include: { addon: true } },
      manuscript_files: true,
    },
  });

  if (!reg) {
    const error = new Error('Pengajuan tidak ditemukan.');
    error.statusCode = 404;
    throw error;
  }

  // Verifikasi kepemilikan bila aktor adalah penerbit
  if (!user.roles.includes('SUPERADMIN') && reg.publisher_id !== user.publisherId) {
    const error = new Error('Akses ditolak. Anda tidak memiliki izin untuk pengajuan ini.');
    error.statusCode = 403;
    throw error;
  }

  if (reg.status !== 'DRAFT' && reg.status !== 'REVISION_REQUIRED') {
    const error = new Error(`Pengajuan berstatus ${reg.status} tidak dapat disubmit.`);
    error.statusCode = 400;
    throw error;
  }

  // Hitung snapshot tarif dan SLA (BR-04 & BR-05)
  const baseFee = Number(reg.service_type.base_fee);
  const addonsTotal = reg.addons.reduce((sum, item) => sum + Number(item.fee_snapshot), 0);
  const totalFee = baseFee + addonsTotal;

  const feeSlaSnapshot = {
    submitted_at: new Date().toISOString(),
    service_name: reg.service_type.name,
    service_kind: reg.service_type.service_kind,
    base_fee: baseFee,
    addons_fee: addonsTotal,
    total_fee: totalFee,
    sla_initial_days: reg.service_type.duration_initial,
    sla_revision_days: reg.service_type.duration_revision,
    sla_dummy_days: reg.service_type.duration_dummy,
  };

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.registration.update({
      where: { id },
      data: {
        status: 'READY_FOR_VERIFICATION',
        fee_sla_snapshot: feeSlaSnapshot,
      },
    });

    await tx.statusHistory.create({
      data: {
        registration_id: id,
        from_status: reg.status,
        to_status: 'READY_FOR_VERIFICATION',
        actor_id: user.id,
        notes: 'Pengajuan disubmit untuk verifikasi',
      },
    });

    return res;
  });

  await logAudit({
    actorId: user.id,
    action: 'SUBMIT_REGISTRATION',
    subjectType: 'Registration',
    subjectId: id,
    beforeJson: reg,
    afterJson: updated,
    req,
  });

  return updated;
};

export const transitionStatus = async (id, toStatus, notes, user, req) => {
  const reg = await prisma.registration.findUnique({
    where: { id },
  });

  if (!reg) {
    const error = new Error('Pengajuan tidak ditemukan.');
    error.statusCode = 404;
    throw error;
  }

  const allowed = ALLOWED_TRANSITIONS[reg.status] || [];
  if (!allowed.includes(toStatus)) {
    const error = new Error(
      `Transisi status ilegal: tidak diperbolehkan berpindah dari ${reg.status} ke ${toStatus}.`
    );
    error.statusCode = 400;
    throw error;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.registration.update({
      where: { id },
      data: { status: toStatus },
    });

    await tx.statusHistory.create({
      data: {
        registration_id: id,
        from_status: reg.status,
        to_status: toStatus,
        actor_id: user.id,
        notes: notes || null,
      },
    });

    return res;
  });

  await logAudit({
    actorId: user.id,
    action: 'TRANSITION_REGISTRATION_STATUS',
    subjectType: 'Registration',
    subjectId: id,
    beforeJson: { status: reg.status },
    afterJson: { status: toStatus, notes },
    req,
  });

  return updated;
};

export const listRegistrations = async ({
  user,
  myTasks = false,
  status,
  search,
  page = 1,
  limit = 10,
}) => {
  const where = {};

  // Scope filter berdasarkan Role
  if (user.roles.includes('ADMIN_PENERBIT') && !user.roles.includes('SUPERADMIN')) {
    where.publisher_id = user.publisherId;
  }

  // Filter Tugas Saya (Assignment-based, bukan status)
  if (myTasks === 'true' || myTasks === true) {
    if (user.roles.includes('VERIFIKATOR')) {
      where.verification_assignments = {
        some: { verifier_id: user.id, status: { in: ['ASSIGNED', 'IN_PROGRESS'] } },
      };
    } else if (user.roles.includes('PENTASHIH')) {
      where.assignments = {
        some: { assignee_id: user.id, status: { in: ['ASSIGNED', 'IN_PROGRESS'] } },
      };
    }
  }

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { registration_no: { contains: search } },
      { title: { contains: search } },
      { publisher: { legal_name: { contains: search } } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const [total, items] = await Promise.all([
    prisma.registration.count({ where }),
    prisma.registration.findMany({
      where,
      skip,
      take,
      include: {
        publisher: { select: { id: true, legal_name: true, entity_type: true } },
        service_type: { select: { id: true, name: true, service_kind: true } },
        verification_assignments: {
          take: 1,
          orderBy: { assigned_at: 'desc' },
          include: { verifier: { select: { id: true, name: true } } },
        },
      },
      orderBy: { created_at: 'desc' },
    }),
  ]);

  return {
    items,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / take),
    },
  };
};

export const getDetail = async (id, user) => {
  const reg = await prisma.registration.findUnique({
    where: { id },
    include: {
      publisher: true,
      service_type: { include: { category: true } },
      addons: { include: { addon: true } },
      manuscript_files: true,
      status_histories: {
        include: { actor: { select: { id: true, name: true } } },
        orderBy: { changed_at: 'asc' },
      },
      verification_assignments: {
        include: { verifier: { select: { id: true, name: true, nip: true } } },
      },
      payment_records: true,
      assignments: {
        include: {
          assignee: { select: { id: true, name: true } },
          reviews: true,
        },
      },
      documentation_items: true,
      official_documents: {
        include: { signatories: { include: { signer: { select: { id: true, name: true } } } } },
      },
    },
  });

  if (!reg) {
    const error = new Error('Pengajuan tidak ditemukan.');
    error.statusCode = 404;
    throw error;
  }

  // Cross-tenant permission check
  if (
    user.roles.includes('ADMIN_PENERBIT') &&
    !user.roles.includes('SUPERADMIN') &&
    reg.publisher_id !== user.publisherId
  ) {
    const error = new Error('Akses ditolak.');
    error.statusCode = 403;
    throw error;
  }

  return reg;
};

export default {
  createDraft,
  submitRegistration,
  transitionStatus,
  listRegistrations,
  getDetail,
};
