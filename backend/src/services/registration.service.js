import { prisma } from '../config/database.js';
import { logAudit } from './audit.service.js';
import { assertManuscriptAccess } from './file-access.service.js';
import { ownedFile } from './storage.service.js';
import { fail, registration as lockRegistration, audit } from './workflow-utils.js';
import { statusLabel, roleLabel } from '../utils/user-messages.js';
import { ACTIVE_REGISTRATION_STATUSES, REGISTRATION_SEGMENTS, queuePagination, queueItems } from './queue-utils.js';
import { syncRegistrationToExistingWebsite } from './external-sync.service.js';

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
    VERIFICATION_ASSIGNED: {
      allowedRoles: ['KEPALA_LPMQ'],
      domainAction: true,
      description: 'Kepala LPMQ menugaskan verifikator dan menerbitkan Nota Dinas Verifikasi',
    },
    CANCELLED: {
      allowedRoles: ['ADMIN_PENERBIT', 'SUPERADMIN'],
      ownershipGuard: true,
      description: 'Pengajuan ditarik kembali oleh pemohon',
    },
  },
  VERIFICATION_ASSIGNED: {
    IN_VERIFICATION: {
      allowedRoles: ['VERIFIKATOR'],
      domainAction: true,
      description: 'Verifikator yang ditugaskan memulai pemeriksaan',
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
      description: 'Penerbit mengajukan ulang perbaikan dokumen/naskah verifikasi',
    },
    TASHIH_IN_PROGRESS: {
      allowedRoles: ['ADMIN_PENERBIT', 'PENTASHIH', 'SUPERADMIN'],
      ownershipGuard: true,
      description: 'Penerbit menyerahkan perbaikan naskah kembali ke sidang pentashihan (siklus revisi tashih)',
    },
    CANCELLED: {
      allowedRoles: ['ADMIN_PENERBIT', 'SUPERADMIN'],
      ownershipGuard: true,
      description: 'Pengajuan dibatalkan oleh pemohon',
    },
  },
  WAITING_VERIFICATION_APPROVAL: {
    VERIFICATION_APPROVED: {
      allowedRoles: ['KEPALA_LPMQ'],
      domainAction: true,
      description: 'Kepala LPMQ menyetujui dan menandatangani surat hasil verifikasi',
    },
    IN_VERIFICATION: {
      allowedRoles: ['KEPALA_LPMQ'],
      description: 'Kepala LPMQ mengembalikan draf surat hasil verifikasi kepada verifikator untuk diperbaiki',
    },
  },
  VERIFICATION_APPROVED: {
    AWAITING_PAYMENT: {
      allowedRoles: ['VERIFIKATOR'],
      domainAction: true,
      description: 'Verifikator mengirim surat hasil verifikasi (lolos) kepada penerbit',
    },
    REVISION_REQUIRED: {
      allowedRoles: ['VERIFIKATOR'],
      domainAction: true,
      description: 'Verifikator mengirim surat hasil verifikasi (perlu perbaikan) kepada penerbit',
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
    WAITING_DISTRIBUTOR_RECEIPT: {
      allowedRoles: ['VERIFIKATOR'],
      domainAction: true,
      description: 'Pembayaran terverifikasi dan master fisik diserahkan kepada distributor',
    },
    AWAITING_PAYMENT: {
      allowedRoles: ['VERIFIKATOR'],
      domainAction: true,
      description: 'Verifikator mengembalikan bukti pembayaran yang tidak sesuai kepada penerbit',
    },
  },
  WAITING_DISTRIBUTOR_RECEIPT: {
    WAITING_DISTRIBUTION: {
      allowedRoles: ['DISTRIBUTOR'],
      domainAction: true,
      description: 'Distributor menerima master fisik dan menetapkan tenggat pentashihan',
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

  // Mendukung pendaftaran lebih dari 1 naskah dalam satu kali permohonan
  const manuscriptList =
    Array.isArray(data.manuscripts) && data.manuscripts.length > 0
      ? data.manuscripts.filter((m) => m && m.title && m.title.trim())
      : [{ title: data.title }];

  if (manuscriptList.length === 0) {
    const error = new Error('Minimal satu judul naskah mushaf harus diisi.');
    error.statusCode = 400;
    throw error;
  }

  const regCategory =
    data.registration_category ||
    (registrationType === 'EXTENSION'
      ? 'EXTENSION'
      : serviceType.name.toLowerCase().includes('luar negeri')
      ? 'FOREIGN_MANUSCRIPT'
      : 'NEW');

  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const createdItems = await prisma.$transaction(async (tx) => {
        const items = [];
        const activeAddons =
          requestedAddonIds.length > 0
            ? await tx.serviceAddon.findMany({
                where: { id: { in: requestedAddonIds }, status: 'ACTIVE' },
              })
            : [];

        if (requestedAddonIds.length > 0 && activeAddons.length !== requestedAddonIds.length) {
          const error = new Error('Satu atau lebih layanan tambahan (add-on) tidak ditemukan atau tidak aktif.');
          error.statusCode = 400;
          throw error;
        }

        for (const item of manuscriptList) {
          const regNo = await generateRegistrationNo(tx);

          const created = await tx.registration.create({
            data: {
              registration_no: regNo,
              publisher_id: publisherId,
              service_type_id: data.service_type_id,
              title: item.title,
              submission_source: submissionSource,
              registration_type: registrationType,
              registration_category: regCategory,
              foreign_metadata: data.foreign_metadata || null,
              statement_accepted: Boolean(data.statement_accepted),
              previous_registration_id: registrationType === 'EXTENSION' ? data.previous_registration_id : null,
              status: 'DRAFT',
            },
          });

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

          await tx.statusHistory.create({
            data: {
              registration_id: created.id,
              from_status: 'NONE',
              to_status: 'DRAFT',
              actor_id: user.id,
              notes: 'Draf permohonan dibuat',
            },
          });

          items.push(created);
        }

        return items;
      });

      const primaryRegistration = createdItems[0];
      primaryRegistration.batch = createdItems;

      for (const item of createdItems) {
        await logAudit({
          actorId: user.id,
          action: 'CREATE_REGISTRATION_DRAFT',
          subjectType: 'Registration',
          subjectId: item.id,
          afterJson: item,
          req,
        });

        // Sinkronisasi pendaftaran otomatis dengan website existing
        syncRegistrationToExistingWebsite(item.id).catch(() => {});
      }

      return primaryRegistration;
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

export const dispatchPhysical = async (id, data, user, req) => {
  const reg = await prisma.registration.findUnique({
    where: { id },
  });

  if (!reg) {
    const error = new Error('Permohonan tidak ditemukan.');
    error.statusCode = 404;
    throw error;
  }

  if (!user.roles.includes('SUPERADMIN') && reg.publisher_id !== user.publisherId) {
    const error = new Error('Akses ditolak. Anda tidak memiliki hak atas permohonan ini.');
    error.statusCode = 403;
    throw error;
  }

  const updated = await prisma.registration.update({
    where: { id },
    data: {
      physical_dispatch_status: 'DISPATCHED',
      dispatch_courier: data.courier || 'LOKET_LPMQ',
      dispatch_tracking_no: data.tracking_no || null,
      dispatch_date: data.dispatch_date ? new Date(data.dispatch_date) : new Date(),
    },
  });

  // Catat riwayat status / audit
  await logAudit({
    actorId: user.id,
    action: 'DISPATCH_PHYSICAL_MANUSCRIPT',
    subjectType: 'Registration',
    subjectId: id,
    afterJson: updated,
    req,
  });

  // Sinkronisasi otomatis ke website existing
  syncRegistrationToExistingWebsite(id).catch(() => {});

  return updated;
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
    const error = new Error(`Pengajuan berstatus "${statusLabel(reg.status)}" belum dapat diajukan ulang. Pengajuan hanya dapat dikirim saat masih draf atau setelah petugas meminta perbaikan kepada penerbit.`);
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

  const hasVerifiedPayment = reg.status === 'REVISION_REQUIRED' && await prisma.paymentRecord.findFirst({ where: { registration_id: id, status: 'VERIFIED' } });
  const submitStatus = hasVerifiedPayment ? 'WAITING_DISTRIBUTION' : 'READY_FOR_VERIFICATION';

  // Optimistic concurrency update: cegah race condition submit paralel
  const updated = await prisma.$transaction(async (tx) => {
    const updateResult = await tx.registration.updateMany({
      where: {
        id,
        status: reg.status,
      },
      data: {
        status: submitStatus,
        stage_entered_at: new Date(),
        fee_sla_snapshot: reg.fee_sla_snapshot || feeSlaSnapshot,
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
        to_status: submitStatus,
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

export const transitionStatus = async (id, toStatus, notes, user, req, expectedFromStatus) => {
  if (['READY_FOR_VERIFICATION', 'PAYMENT_VERIFICATION', 'WAITING_DISTRIBUTION', 'TASHIH_IN_PROGRESS', 'READY_FOR_STT', 'STT_ISSUED'].includes(toStatus)) {
    fail(409, 'Gunakan aksi submit, pembayaran, distribusi, sidang, atau dokumen resmi untuk transisi ini.');
  }
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
  if (expectedFromStatus && expectedFromStatus !== fromStatus) fail(409, 'Status pengajuan telah berubah sejak halaman dimuat.');
  if (fromStatus === 'TASHIH_IN_PROGRESS' || (toStatus === 'CANCELLED' && await prisma.paymentRecord.count({ where: { registration_id: id } }))) {
    fail(409, 'Transisi ini memerlukan keputusan domain; pembatalan setelah billing belum tersedia.');
  }
  const policyForFrom = TRANSITION_POLICY[fromStatus];
  const rule = policyForFrom ? policyForFrom[toStatus] : null;

  if (!rule) {
    const error = new Error(
      `Pengajuan tidak dapat diubah dari "${statusLabel(fromStatus)}" ke "${statusLabel(toStatus)}". Ikuti tahapan pada detail pengajuan; muat ulang halaman jika status baru saja berubah.`
    );
    error.statusCode = 409;
    throw error;
  }

  if (rule.domainAction) {
    fail(409, `Perubahan ke "${statusLabel(toStatus)}" memerlukan aksi khusus beserta dokumen dan catatan kewenangan. Gunakan halaman tugas sesuai peran.`);
  }

  const isSuperadmin = user.roles.includes('SUPERADMIN');

  // Pengecekan Otorisasi Role Spesifik
  // Persetujuan Kepala LPMQ tidak diwariskan kepada administrator teknis.
  const hasAllowedRole = user.roles.some((r) => rule.allowedRoles.includes(r));
  if (!hasAllowedRole) {
    const error = new Error(
      `Perubahan dari "${statusLabel(fromStatus)}" ke "${statusLabel(toStatus)}" hanya dapat dilakukan oleh ${rule.allowedRoles.map(roleLabel).join(' atau ')}. Hubungi petugas tersebut untuk melanjutkan pengajuan.`
    );
    error.statusCode = 403;
    throw error;
  }

  if (fromStatus === 'IN_VERIFICATION') {
    const assignment = await prisma.verificationAssignment.findFirst({
      where: { registration_id: id, verifier_id: user.id, status: { in: ['ASSIGNED', 'IN_PROGRESS'] } },
    });
    if (!assignment) fail(403, 'Hanya verifikator yang ditugaskan dapat memproses pemeriksaan ini.');
  }

  if (fromStatus === 'WAITING_VERIFICATION_APPROVAL' && toStatus === 'IN_VERIFICATION' && !notes?.trim()) {
    fail(400, 'Alasan pengembalian draf kepada verifikator wajib diisi.');
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
        stage_entered_at: new Date(),
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

    await tx.auditLog.create({
      data: {
        actor_id: user.id,
        action: 'TRANSITION_REGISTRATION_STATUS',
        subject_type: 'Registration',
        subject_id: id,
        before_json: { status: fromStatus },
        after_json: { status: toStatus, notes: notes || null },
        ip_address: req?.ip || req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || null,
        user_agent: req?.headers?.['user-agent'] || null,
      },
    });

    if (['AWAITING_PAYMENT', 'REVISION_REQUIRED'].includes(toStatus)) {
      await tx.verificationAssignment.updateMany({
        where: { registration_id: id, status: { in: ['ASSIGNED', 'IN_PROGRESS'] } },
        data: { status: 'COMPLETED', completed_at: new Date(), decision: toStatus === 'AWAITING_PAYMENT' ? 'PASSED' : 'REVISION_REQUIRED', notes },
      });
    }

    return tx.registration.findUnique({
      where: { id },
      include: {
        publisher: true,
        service_type: true,
      },
    });
  });

  return updated;
};

export const listRegistrations = async ({
  user,
  myTasks = false,
  status,
  search,
  segment,
  queueOnly = false,
  page = 1,
  limit = 10,
}) => {
  const where = {};

  // Scope filter berdasarkan Role
  const publisherScope = user.roles.includes('ADMIN_PENERBIT') && !user.roles.includes('SUPERADMIN');
  if (publisherScope) {
    if (!user.publisherId) fail(403, 'Akun Anda belum terhubung ke penerbit. Hubungi pengelola layanan.');
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
        some: { assignee_id: user.id, status: { in: ['ASSIGNED', 'IN_PROGRESS', 'OVERDUE'] } },
      };
    }
  }

  const summaryWhere = { ...where };
  if (segment === 'PUBLISHER_DOCUMENTS') {
    where.official_documents = { some: { document_type: 'SURAT_TANDA_TASHIH', status: 'ISSUED' } };
  } else if (status) {
    where.status = status;
  } else if (REGISTRATION_SEGMENTS[segment]) {
    where.status = { in: REGISTRATION_SEGMENTS[segment] };
  } else if (queueOnly === true || queueOnly === 'true') {
    where.status = { in: ACTIVE_REGISTRATION_STATUSES };
  }

  if (search) {
    where.OR = [
      { registration_no: { contains: search } },
      { title: { contains: search } },
      { publisher: { legal_name: { contains: search } } },
    ];
  }

  const paging = queuePagination({ page, limit });
  const { skip, limit: take } = paging;
  const fifo = !user.roles.includes('ADMIN_PENERBIT') || user.roles.includes('SUPERADMIN');

  const [total, items, counts, issuedSTT] = await Promise.all([
    prisma.registration.count({ where }),
    prisma.registration.findMany({
      where,
      skip,
      take,
      include: {
        ...(publisherScope || segment === 'PUBLISHER_DOCUMENTS' ? {
          official_documents: {
            where: { document_type: 'SURAT_TANDA_TASHIH', status: 'ISSUED' },
            select: { id: true, document_no: true, document_type: true, status: true, file_id: true, issued_at: true, valid_until: true },
            orderBy: { version: 'desc' },
          },
        } : {}),
        publisher: { select: { id: true, legal_name: true, entity_type: true } },
        service_type: { select: { id: true, name: true, service_kind: true } },
        verification_assignments: {
          take: 1,
          orderBy: { assigned_at: 'desc' },
          include: { verifier: { select: { id: true, name: true } } },
        },
        physical_master_intake: { select: { status: true, format: true, binding_method: true, volume_count: true, sent_at: true, delivery_method: true, receipt_no: true, received_at: true } },
      },
      orderBy: fifo ? [{ stage_entered_at: 'asc' }, { id: 'asc' }] : [{ created_at: 'desc' }, { id: 'asc' }],
    }),
    prisma.registration.groupBy({ by: ['status'], where: { ...summaryWhere, ...(search ? { OR: where.OR } : {}) }, _count: true }),
    publisherScope ? prisma.registration.count({ where: { ...summaryWhere, ...(search ? { OR: where.OR } : {}), official_documents: { some: { document_type: 'SURAT_TANDA_TASHIH', status: 'ISSUED' } } } }) : Promise.resolve(null),
  ]);

  return {
    items: queueItems(items, item => item.stage_entered_at, skip, fifo),
    summary: { by_status: Object.fromEntries(counts.map(item => [item.status, item._count])), ...(issuedSTT !== null ? { issued_stt: issuedSTT } : {}) },
    pagination: {
      total,
      page: paging.page,
      limit: take,
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
      physical_master_intake: true,
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

  try { await assertManuscriptAccess(reg, user); }
  catch (error) {
    if (error.statusCode !== 403) throw error;
    reg.manuscript_files = [];
  }
  if (user.roles.includes('ADMIN_PENERBIT') && !user.roles.includes('SUPERADMIN')) {
    reg.official_documents = reg.official_documents.filter(document => document.status === 'ISSUED');
  }

  let operational_state = null;
  if (reg.status === 'READY_FOR_VERIFICATION') {
    if (reg.physical_master_intake?.status === 'RECEIVED' && reg.physical_master_intake?.receipt_no) {
      operational_state = 'READY_FOR_ASSIGNMENT';
    } else {
      operational_state = 'WAITING_PHYSICAL_MASTER';
    }
  } else if (reg.status === 'VERIFICATION_ASSIGNED') {
    operational_state = 'VERIFICATION_ASSIGNED';
  }
  reg.operational_state = operational_state;

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

  const manuscript = await prisma.$transaction(async tx => {
    const current = await lockRegistration(tx, registrationId);
    await assertManuscriptAccess(current, user, true, tx);
    const file = await ownedFile(tx, data.file_id, user);
    const last = await tx.manuscriptFile.findFirst({ where: { registration_id: registrationId, type: data.type }, orderBy: { version: 'desc' } });
    const created = await tx.manuscriptFile.create({
    data: {
      registration_id: registrationId,
      type: data.type,
      file_id: data.file_id,
      version: (last?.version || 0) + 1,
      checksum: file.checksum,
      file_size: file.file_size,
      mime_type: file.mime_type,
    },
    });
    await audit(tx, user, 'ADD_MANUSCRIPT_FILE', 'ManuscriptFile', created.id, created);
    return created;
  }, { isolationLevel: 'ReadCommitted' });

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

  await assertManuscriptAccess(reg, user);
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
