import { prisma } from '../config/database.js';
import { logAudit } from './audit.service.js';

// Matriks Kebijakan Transisi Status Resmi Berbasis Peran (TRANSITION_POLICY)
export const TRANSITION_POLICY = {
  DRAFT: {
    READY_FOR_VERIFICATION: {
      allowedRoles: ['ADMIN_PENERBIT', 'SUPERADMIN'],
      ownershipGuard: true,
      description: 'Pengajuan disubmit untuk verifikasi administrasi & dokumen naskah',
    },
    CANCELLED: {
      allowedRoles: ['ADMIN_PENERBIT', 'SUPERADMIN'],
      ownershipGuard: true,
      description: 'Draf pengajuan dibatalkan oleh pemohon',
    },
  },
  READY_FOR_VERIFICATION: {
    IN_VERIFICATION: {
      allowedRoles: ['VERIFIKATOR', 'SUPERADMIN'],
      description: 'Verifikator memulai verifikasi dokumen & naskah',
    },
    CANCELLED: {
      allowedRoles: ['ADMIN_PENERBIT', 'SUPERADMIN'],
      ownershipGuard: true,
      description: 'Pengajuan ditarik kembali oleh pemohon',
    },
  },
  IN_VERIFICATION: {
    REVISION_REQUIRED: {
      allowedRoles: ['VERIFIKATOR', 'SUPERADMIN'],
      description: 'Verifikator meminta revisi kelengkapan dokumen / naskah',
    },
    WAITING_VERIFICATION_APPROVAL: {
      allowedRoles: ['VERIFIKATOR', 'SUPERADMIN'],
      description: 'Verifikasi selesai, menunggu persetujuan verifikasi',
    },
  },
  REVISION_REQUIRED: {
    READY_FOR_VERIFICATION: {
      allowedRoles: ['ADMIN_PENERBIT', 'SUPERADMIN'],
      ownershipGuard: true,
      description: 'Penerbit mengajukan ulang perbaikan dokumen/naskah',
    },
    CANCELLED: {
      allowedRoles: ['ADMIN_PENERBIT', 'SUPERADMIN'],
      ownershipGuard: true,
      description: 'Pengajuan dibatalkan oleh pemohon',
    },
  },
  WAITING_VERIFICATION_APPROVAL: {
    AWAITING_PAYMENT: {
      allowedRoles: ['VERIFIKATOR', 'SUPERADMIN'],
      description: 'Verifikasi disetujui, penerbitan tagihan PNBP',
    },
    REVISION_REQUIRED: {
      allowedRoles: ['VERIFIKATOR', 'SUPERADMIN'],
      description: 'Persetujuan verifikasi ditolak, diperlukan perbaikan ulang',
    },
  },
  AWAITING_PAYMENT: {
    PAYMENT_VERIFICATION: {
      allowedRoles: ['ADMIN_PENERBIT', 'SUPERADMIN'],
      ownershipGuard: true,
      description: 'Penerbit melakukan konfirmasi / unggah bukti bayar PNBP',
    },
  },
  PAYMENT_VERIFICATION: {
    WAITING_DISTRIBUTION: {
      allowedRoles: ['VERIFIKATOR', 'SUPERADMIN'],
      description: 'Pembayaran diverifikasi lunas, naskah masuk antrean distribusi',
    },
  },
  WAITING_DISTRIBUTION: {
    TASHIH_IN_PROGRESS: {
      allowedRoles: ['DISTRIBUTOR', 'SUPERADMIN'],
      description: 'Distributor menetapkan tim pentashih dan memulai sidang pentashihan',
    },
  },
  TASHIH_IN_PROGRESS: {
    READY_FOR_STT: {
      allowedRoles: ['PENTASHIH', 'SUPERADMIN'],
      description: 'Sidang pentashihan selesai dengan rekomendasi penerbitan STT',
    },
    REVISION_REQUIRED: {
      allowedRoles: ['PENTASHIH', 'SUPERADMIN'],
      description: 'Pentashih menemukan koreksi teks mushaf yang harus diperbaiki penerbit',
    },
  },
  READY_FOR_STT: {
    STT_ISSUED: {
      allowedRoles: ['KEPALA_LPMQ', 'SUPERADMIN'],
      description: 'Kepala LPMQ menandatangani dan menerbitkan Surat Tanda Tashih',
    },
  },
  STT_ISSUED: {
    DOCUMENTATION_IN_PROGRESS: {
      allowedRoles: ['DOKUMENTATOR', 'SUPERADMIN'],
      description: 'Dokumentator memulai proses pencatatan dan dokumentasi arsip mushaf',
    },
  },
  DOCUMENTATION_IN_PROGRESS: {
    COMPLETED: {
      allowedRoles: ['DOKUMENTATOR', 'SUPERADMIN'],
      description: 'Pendokumentasian arsip tuntas, pengajuan selesai sepenuhnya',
    },
  },
  COMPLETED: {},
  CANCELLED: {},
};

/**
 * Pembuatan nomor registrasi berurutan per bulan secara deterministik (REG-YYYYMM-XXXX)
 */
const generateRegistrationNo = async (tx) => {
  const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
  const prefix = `REG-${dateStr}-`;

  const lastReg = await tx.registration.findFirst({
    where: { registration_no: { startsWith: prefix } },
    orderBy: { registration_no: 'desc' },
    select: { registration_no: true },
  });

  let nextSequence = 1;
  if (lastReg && lastReg.registration_no) {
    const parts = lastReg.registration_no.split('-');
    if (parts.length >= 3) {
      const lastNum = parseInt(parts[2], 10);
      if (!isNaN(lastNum)) {
        nextSequence = lastNum + 1;
      }
    }
  }

  const sequenceStr = String(nextSequence).padStart(4, '0');
  return `${prefix}${sequenceStr}`;
};

export const createDraft = async (data, user, req) => {
  let publisherId = user.publisherId;
  let submissionSource = 'PUBLISHER_PORTAL';

  // Jika dibuat oleh SUPERADMIN atas nama penerbit tertentu
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

  const registrationType = data.registration_type || 'NEW';

  // Validasi Pengajuan Perpanjangan (EXTENSION)
  if (registrationType === 'EXTENSION') {
    if (!data.previous_registration_id) {
      const error = new Error('Pengajuan perpanjangan (EXTENSION) wajib menyertakan previous_registration_id.');
      error.statusCode = 400;
      throw error;
    }

    const prevReg = await prisma.registration.findUnique({
      where: { id: data.previous_registration_id },
      select: { id: true, publisher_id: true, status: true, registration_no: true },
    });

    if (!prevReg) {
      const error = new Error('Pengajuan sebelumnya tidak ditemukan.');
      error.statusCode = 404;
      throw error;
    }

    // Pastikan milik penerbit yang sama
    if (prevReg.publisher_id !== publisherId && !user.roles.includes('SUPERADMIN')) {
      const error = new Error('Pengajuan sebelumnya bukan milik penerbit ini.');
      error.statusCode = 403;
      throw error;
    }

    // Pastikan pengajuan sebelumnya telah memiliki STT yang sah
    const validPreviousStatuses = ['STT_ISSUED', 'DOCUMENTATION_IN_PROGRESS', 'COMPLETED'];
    if (!validPreviousStatuses.includes(prevReg.status)) {
      const error = new Error(
        `Pengajuan sebelumnya (${prevReg.registration_no}) berstatus "${prevReg.status}" dan belum memiliki Surat Tanda Tashih (STT) yang sah untuk diperpanjang.`
      );
      error.statusCode = 400;
      throw error;
    }
  } else if (registrationType === 'NEW') {
    if (data.previous_registration_id) {
      const error = new Error('Pengajuan baru (NEW) tidak boleh menyertakan previous_registration_id.');
      error.statusCode = 400;
      throw error;
    }
  }

  // Normalisasi daftar addon
  const requestedAddonIds = data.addons || data.addon_ids || [];

  // Mekanisme retry loop untuk menangani kemungkinan tabrakan unik nomor registrasi (P2002)
  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const registration = await prisma.$transaction(async (tx) => {
        const regNo = await generateRegistrationNo(tx);

        const created = await tx.registration.create({
          data: {
            registration_no: regNo,
            publisher_id: publisherId,
            service_type_id: data.service_type_id,
            title: data.title,
            submission_source: submissionSource,
            registration_type: registrationType,
            previous_registration_id: registrationType === 'EXTENSION' ? data.previous_registration_id : null,
            status: 'DRAFT',
          },
        });

        // Simpan relasi addon bila diminta
        if (requestedAddonIds.length > 0) {
          const activeAddons = await tx.serviceAddon.findMany({
            where: { id: { in: requestedAddonIds }, status: 'ACTIVE' },
          });

          if (activeAddons.length !== requestedAddonIds.length) {
            const error = new Error('Satu atau lebih layanan tambahan (add-on) tidak ditemukan atau tidak aktif.');
            error.statusCode = 400;
            throw error;
          }

          for (const add of activeAddons) {
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
    } catch (err) {
      if (err.code === 'P2002' && attempt < maxRetries) {
        lastError = err;
        await new Promise((resolve) => setTimeout(resolve, 25 * attempt));
        continue;
      }
      throw err;
    }
  }

  throw lastError;
};

export const submitRegistration = async (id, user, req) => {
  const reg = await prisma.registration.findUnique({
    where: { id },
    include: {
      service_type: true,
      addons: { include: { addon: true } },
      manuscript_files: true,
      publisher: true,
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

  // Validasi status verifikasi profil penerbit
  if (reg.publisher && reg.publisher.verification_status !== 'VERIFIED') {
    const error = new Error(
      `Pengajuan tidak dapat disubmit karena status penerbit Anda adalah "${reg.publisher.verification_status}". Hanya penerbit terverifikasi (VERIFIED) yang dapat mengajukan pentashihan.`
    );
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

  // Optimistic concurrency update: cegah race condition submit paralel
  const updated = await prisma.$transaction(async (tx) => {
    const updateResult = await tx.registration.updateMany({
      where: {
        id,
        status: reg.status,
      },
      data: {
        status: 'READY_FOR_VERIFICATION',
        fee_sla_snapshot: feeSlaSnapshot,
      },
    });

    if (updateResult.count === 0) {
      const conflictError = new Error(
        'Gagal submit pengajuan: terjadi konflik konkuren atau status pengajuan telah berubah.'
      );
      conflictError.statusCode = 409;
      throw conflictError;
    }

    await tx.statusHistory.create({
      data: {
        registration_id: id,
        from_status: reg.status,
        to_status: 'READY_FOR_VERIFICATION',
        actor_id: user.id,
        notes: 'Pengajuan disubmit untuk verifikasi',
      },
    });

    return tx.registration.findUnique({
      where: { id },
      include: {
        publisher: true,
        service_type: true,
        addons: true,
      },
    });
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
    include: { publisher: true },
  });

  if (!reg) {
    const error = new Error('Pengajuan tidak ditemukan.');
    error.statusCode = 404;
    throw error;
  }

  const fromStatus = reg.status;
  const policyForFrom = TRANSITION_POLICY[fromStatus];
  const rule = policyForFrom ? policyForFrom[toStatus] : null;

  if (!rule) {
    const error = new Error(
      `Transisi status ilegal: tidak diperbolehkan berpindah dari ${fromStatus} ke ${toStatus}.`
    );
    error.statusCode = 400;
    throw error;
  }

  const isSuperadmin = user.roles.includes('SUPERADMIN');

  // Pengecekan Otorisasi Role Spesifik
  const hasAllowedRole = isSuperadmin || user.roles.some((r) => rule.allowedRoles.includes(r));
  if (!hasAllowedRole) {
    const error = new Error(
      `Akses ditolak: role [${user.roles.join(', ')}] tidak memiliki wewenang untuk transisi ${fromStatus} -> ${toStatus}. Diperlukan salah satu dari: [${rule.allowedRoles.join(', ')}].`
    );
    error.statusCode = 403;
    throw error;
  }

  // Pengecekan Kepemilikan Penerbit
  if (rule.ownershipGuard && !isSuperadmin) {
    if (reg.publisher_id !== user.publisherId) {
      const error = new Error('Akses ditolak: Anda tidak memiliki izin untuk pengajuan ini.');
      error.statusCode = 403;
      throw error;
    }
  }

  // Optimistic concurrency update: pastikan status saat ini masih match
  const updated = await prisma.$transaction(async (tx) => {
    const updateResult = await tx.registration.updateMany({
      where: {
        id,
        status: fromStatus,
      },
      data: {
        status: toStatus,
      },
    });

    if (updateResult.count === 0) {
      const conflictError = new Error(
        'Gagal melakukan transisi: status pengajuan telah berubah oleh proses lain (konflik transisi).'
      );
      conflictError.statusCode = 409;
      throw conflictError;
    }

    await tx.statusHistory.create({
      data: {
        registration_id: id,
        from_status: fromStatus,
        to_status: toStatus,
        actor_id: user.id,
        notes: notes || rule.description || null,
      },
    });

    return tx.registration.findUnique({
      where: { id },
      include: {
        publisher: true,
        service_type: true,
      },
    });
  });

  await logAudit({
    actorId: user.id,
    action: 'TRANSITION_REGISTRATION_STATUS',
    subjectType: 'Registration',
    subjectId: id,
    beforeJson: { status: fromStatus },
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

export const addManuscriptFile = async (registrationId, data, user, req) => {
  const reg = await prisma.registration.findUnique({
    where: { id: registrationId },
  });

  if (!reg) {
    const error = new Error('Pengajuan tidak ditemukan.');
    error.statusCode = 404;
    throw error;
  }

  if (
    user.roles.includes('ADMIN_PENERBIT') &&
    !user.roles.includes('SUPERADMIN') &&
    reg.publisher_id !== user.publisherId
  ) {
    const error = new Error('Akses ditolak. Anda tidak memiliki izin untuk pengajuan ini.');
    error.statusCode = 403;
    throw error;
  }

  const manuscript = await prisma.manuscriptFile.create({
    data: {
      registration_id: registrationId,
      type: data.type,
      file_id: data.file_id,
      version: data.version || 1,
      checksum: data.checksum || null,
      file_size: data.file_size || null,
      mime_type: data.mime_type || null,
    },
  });

  await logAudit({
    actorId: user.id,
    action: 'ADD_MANUSCRIPT_FILE',
    subjectType: 'ManuscriptFile',
    subjectId: manuscript.id,
    afterJson: manuscript,
    req,
  });

  return manuscript;
};

export const listManuscriptFiles = async (registrationId, user) => {
  const reg = await prisma.registration.findUnique({
    where: { id: registrationId },
  });

  if (!reg) {
    const error = new Error('Pengajuan tidak ditemukan.');
    error.statusCode = 404;
    throw error;
  }

  if (
    user.roles.includes('ADMIN_PENERBIT') &&
    !user.roles.includes('SUPERADMIN') &&
    reg.publisher_id !== user.publisherId
  ) {
    const error = new Error('Akses ditolak. Anda tidak memiliki izin untuk pengajuan ini.');
    error.statusCode = 403;
    throw error;
  }

  return prisma.manuscriptFile.findMany({
    where: { registration_id: registrationId },
    orderBy: { created_at: 'desc' },
  });
};

export default {
  createDraft,
  submitRegistration,
  transitionStatus,
  listRegistrations,
  getDetail,
  addManuscriptFile,
  listManuscriptFiles,
  TRANSITION_POLICY,
};
