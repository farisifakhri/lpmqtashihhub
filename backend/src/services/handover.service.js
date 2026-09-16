import { randomUUID } from 'node:crypto';
import { prisma } from '../config/database.js';
import { fail, requireRole, registration, requireStatus, move, audit } from './workflow-utils.js';
import { queueItems, queuePagination } from './queue-utils.js';

/**
 * Verifikator mencatat penyerahan master fisik kepada Distributor (Langkah 7 SOP)
 * Prasyarat: Status registrasi PAYMENT_VERIFICATION dan pembayaran PNBP berstatus VERIFIED.
 */
export const createHandover = (registrationId, data, user, req) =>
  prisma.$transaction(async (tx) => {
    requireRole(user, ['VERIFIKATOR', 'SUPERADMIN']);
    const reg = await registration(tx, registrationId);
    requireStatus(reg, ['PAYMENT_VERIFICATION']);

    // Validasi kelunasan PNBP
    const payment = await tx.paymentRecord.findFirst({
      where: { registration_id: reg.id },
      orderBy: { created_at: 'desc' },
    });

    if (!payment || payment.status !== 'VERIFIED') {
      fail(
        409,
        'Master fisik belum dapat diserahkan kepada Distributor karena pembayaran PNBP belum diverifikasi sah (LUNAS).'
      );
    }

    // Cek apakah ada handover yang sedang PENDING
    const existingPending = await tx.physicalManuscriptHandover.findFirst({
      where: { registration_id: reg.id, status: 'PENDING' },
    });

    if (existingPending) {
      fail(
        409,
        'Pengajuan ini sudah memiliki catatan serah-terima fisik yang sedang menunggu konfirmasi penerimaan oleh Distributor.'
      );
    }

    // Validasi petugas penerima (wajib aktif dan berstatus DISTRIBUTOR)
    const receiver = await tx.user.findUnique({
      where: { id: data.to_user_id },
      include: { roles: { include: { role: true } } },
    });

    if (!receiver || receiver.status !== 'ACTIVE') {
      fail(404, 'Petugas Distributor penerima tidak ditemukan atau akun sedang tidak aktif.');
    }

    const receiverRoles = receiver.roles.map((ur) => ur.role.code);
    if (!receiverRoles.includes('DISTRIBUTOR')) {
      fail(400, 'Pengguna penerima yang dipilih bukan petugas dengan kewenangan Distributor.');
    }

    // Nomor Berita Acara Serah Terima (BAST) Fisik
    const cleanRegNo = reg.registration_no.replace(/[^A-Za-z0-9]/g, '');
    const receiptNo = `BAST-VER-DIST-${cleanRegNo}-${randomUUID().slice(0, 6).toUpperCase()}`;

    const handover = await tx.physicalManuscriptHandover.create({
      data: {
        registration_id: reg.id,
        from_user_id: user.id,
        to_user_id: data.to_user_id,
        stage: 'VERIFICATION_TO_DISTRIBUTION',
        receipt_no: receiptNo,
        condition: data.condition || 'BAIK',
        volume_count: Number(data.volume_count) || 30,
        handed_over_at: new Date(),
        notes: data.notes?.trim() || null,
        status: 'PENDING',
      },
    });

    // Pindahkan status registrasi ke WAITING_DISTRIBUTOR_RECEIPT
    await move(
      tx,
      reg,
      'WAITING_DISTRIBUTOR_RECEIPT',
      user,
      `Master fisik print-out naskah diserahkan kepada Distributor (${receiver.name})`,
      req
    );

    // Notifikasi in-app kepada Distributor penerima
    await tx.notification.create({
      data: {
        user_id: data.to_user_id,
        registration_id: reg.id,
        type: 'HANDOVER_PENDING',
        title: 'Master Fisik Menunggu Konfirmasi Diterima',
        payload: {
          message: `Master fisik mushaf untuk pengajuan ${reg.registration_no} telah diserahkan oleh Verifikator. Silakan periksa kelengkapan fisik di loket dan konfirmasi penerimaan.`,
        },
      },
    });

    await audit(tx, user, 'CREATE_PHYSICAL_HANDOVER', 'PhysicalManuscriptHandover', handover.id, handover, req);

    return {
      handover,
      registration: await tx.registration.findUnique({ where: { id: reg.id } }),
    };
  }, { isolationLevel: 'ReadCommitted' });

/**
 * Distributor mengonfirmasi penerimaan master fisik di loket pentashihan (Langkah 8 SOP)
 * Menetapkan tenggat waktu pentashihan dan memindahkan status ke WAITING_DISTRIBUTION.
 */
export const receiveHandover = (handoverId, data, user, req) =>
  prisma.$transaction(async (tx) => {
    requireRole(user, ['DISTRIBUTOR']);

    const handover = await tx.physicalManuscriptHandover.findUnique({
      where: { id: handoverId },
    });

    if (!handover) {
      fail(404, 'Catatan serah-terima fisik tidak ditemukan.');
    }

    if (handover.status !== 'PENDING') {
      fail(
        409,
        `Serah-terima master fisik ini sudah berstatus "${handover.status}". Tidak dapat diproses ulang.`
      );
    }

    // Pastikan hak akses distributor penerima
    if (handover.to_user_id !== user.id) {
      fail(403, 'Anda bukan petugas Distributor tujuan serah-terima ini.');
    }

    const reg = await registration(tx, handover.registration_id);
    requireStatus(reg, ['WAITING_DISTRIBUTOR_RECEIPT']);

    // Tentukan tenggat pentashihan (tashih_due_at) jika diisi eksplisit
    const tashihDueAt = data.tashih_due_at ? new Date(data.tashih_due_at) : null;

    const updatedHandover = await tx.physicalManuscriptHandover.update({
      where: { id: handoverId },
      data: {
        status: 'RECEIVED',
        received_at: new Date(),
        condition: data.condition || handover.condition,
        volume_count: Number(data.volume_count) || handover.volume_count,
        tashih_due_at: tashihDueAt,
        notes: data.notes?.trim()
          ? (handover.notes ? `${handover.notes}\n[Distributor]: ${data.notes.trim()}` : data.notes.trim())
          : handover.notes,
      },
    });

    // Pindahkan status registrasi ke WAITING_DISTRIBUTION
    await move(
      tx,
      reg,
      'WAITING_DISTRIBUTION',
      user,
      'Master fisik resmi diterima oleh Distributor; naskah siap diagendakan untuk sidang tim pentashih',
      req
    );

    // Kirim notifikasi ke Verifikator penyerah
    await tx.notification.create({
      data: {
        user_id: handover.from_user_id,
        registration_id: reg.id,
        type: 'HANDOVER_RECEIVED',
        title: 'Master Fisik Resmi Diterima Distributor',
        payload: {
          message: `Master fisik naskah ${reg.registration_no} telah resmi diterima oleh Distributor. Tahap Verifikasi selesai.`,
        },
      },
    });

    // Kirim notifikasi ke Penerbit pemilik
    const publisher = await tx.publisher.findUnique({
      where: { id: reg.publisher_id },
      include: { user: true },
    });
    if (publisher?.user_id) {
      await tx.notification.create({
        data: {
          user_id: publisher.user_id,
          registration_id: reg.id,
          type: 'HANDOVER_RECEIVED',
          title: 'Master Fisik Diterima di Meja Pentashihan',
          payload: {
            message: `Master fisik mushaf untuk pendaftaran ${reg.registration_no} telah diterima oleh tim Distributor Pentashihan. Naskah Anda kini memasuki tahapan sidang pentashihan.`,
          },
        },
      });
    }

    await audit(tx, user, 'RECEIVE_PHYSICAL_HANDOVER', 'PhysicalManuscriptHandover', handover.id, updatedHandover, req);

    return {
      handover: updatedHandover,
      registration: await tx.registration.findUnique({ where: { id: reg.id } }),
    };
  }, { isolationLevel: 'ReadCommitted' });

/**
 * Distributor mengembalikan master fisik karena cacat/rusak/juz tidak lengkap
 */
export const returnHandover = (handoverId, data, user, req) =>
  prisma.$transaction(async (tx) => {
    requireRole(user, ['DISTRIBUTOR']);

    const handover = await tx.physicalManuscriptHandover.findUnique({
      where: { id: handoverId },
    });

    if (!handover) {
      fail(404, 'Catatan serah-terima fisik tidak ditemukan.');
    }

    if (handover.status !== 'PENDING') {
      fail(409, 'Serah-terima master fisik ini sudah tidak dalam status menunggu konfirmasi.');
    }

    // Pastikan hak akses distributor penerima
    if (handover.to_user_id !== user.id) {
      fail(403, 'Anda bukan petugas Distributor tujuan serah-terima ini.');
    }

    const reg = await registration(tx, handover.registration_id);
    requireStatus(reg, ['WAITING_DISTRIBUTOR_RECEIPT']);

    const updatedHandover = await tx.physicalManuscriptHandover.update({
      where: { id: handoverId },
      data: {
        status: 'RETURNED',
        notes: handover.notes
          ? `${handover.notes}\n[DIKEMBALIKAN DISTRIBUTOR]: ${data.reason.trim()}`
          : `[DIKEMBALIKAN DISTRIBUTOR]: ${data.reason.trim()}`,
      },
    });

    // Pindahkan status registrasi kembali ke REVISION_REQUIRED
    await move(
      tx,
      reg,
      'REVISION_REQUIRED',
      user,
      `Master fisik dikembalikan oleh Distributor: ${data.reason.trim()}`,
      req
    );

    // Notifikasi ke verifikator
    await tx.notification.create({
      data: {
        user_id: handover.from_user_id,
        registration_id: reg.id,
        type: 'HANDOVER_RETURNED',
        title: 'Master Fisik Dikembalikan Distributor',
        payload: {
          message: `Master fisik untuk ${reg.registration_no} dikembalikan oleh Distributor dengan alasan: ${data.reason.trim()}`,
        },
      },
    });

    await audit(tx, user, 'RETURN_PHYSICAL_HANDOVER', 'PhysicalManuscriptHandover', handover.id, updatedHandover, req);

    return {
      handover: updatedHandover,
      registration: await tx.registration.findUnique({ where: { id: reg.id } }),
    };
  }, { isolationLevel: 'ReadCommitted' });

/**
 * Mengambil detail satu record serah-terima fisik
 */
export const getHandoverDetail = async (handoverId, user) => {
  const handover = await prisma.physicalManuscriptHandover.findUnique({
    where: { id: handoverId },
    include: {
      from_user: { select: { id: true, name: true, nip: true, email: true } },
      to_user: { select: { id: true, name: true, nip: true, email: true } },
      registration: {
        include: {
          publisher: { select: { id: true, legal_name: true, entity_type: true } },
          service_type: { include: { category: true } },
        },
      },
    },
  });

  if (!handover) {
    fail(404, 'Catatan serah-terima fisik tidak ditemukan.');
  }

  const isInternal = user.roles.some((r) =>
    ['DISTRIBUTOR', 'VERIFIKATOR', 'KEPALA_LPMQ', 'SUPERADMIN'].includes(r)
  );
  const isOwner = user.roles.includes('ADMIN_PENERBIT') && user.publisherId === handover.registration.publisher_id;

  if (!isInternal && !isOwner) {
    fail(403, 'Akses ditolak.');
  }

  return handover;
};

/**
 * Mengambil daftar riwayat serah-terima fisik untuk satu registrasi
 */
export const getRegistrationHandovers = async (registrationId, user) => {
  const reg = await prisma.registration.findUnique({
    where: { id: registrationId },
  });

  if (!reg) {
    fail(404, 'Pengajuan tidak ditemukan.');
  }

  const isInternal = user.roles.some((r) =>
    ['DISTRIBUTOR', 'VERIFIKATOR', 'KEPALA_LPMQ', 'SUPERADMIN'].includes(r)
  );
  const isOwner = user.roles.includes('ADMIN_PENERBIT') && user.publisherId === reg.publisher_id;

  if (!isInternal && !isOwner) {
    fail(403, 'Akses ditolak.');
  }

  const handovers = await prisma.physicalManuscriptHandover.findMany({
    where: { registration_id: registrationId },
    orderBy: { created_at: 'desc' },
    include: {
      from_user: { select: { id: true, name: true, nip: true } },
      to_user: { select: { id: true, name: true, nip: true } },
    },
  });

  return handovers;
};

/**
 * Antrean serah-terima fisik untuk Distributor dan Verifikator
 */
export const listHandovers = async (query, user) => {
  requireRole(user, ['DISTRIBUTOR', 'VERIFIKATOR', 'KEPALA_LPMQ', 'SUPERADMIN']);

  const { page, limit, skip } = queuePagination(query);

  const where = {};

  if (query.status) {
    where.status = query.status;
  }

  if (query.stage) {
    where.stage = query.stage;
  }

  // Jika my_tasks aktif atau role utama Distributor
  if (query.my_tasks === true || query.my_tasks === 'true') {
    if (user.roles.includes('DISTRIBUTOR')) {
      where.to_user_id = user.id;
    } else if (user.roles.includes('VERIFIKATOR')) {
      where.from_user_id = user.id;
    }
  }

  if (query.search) {
    where.OR = [
      { receipt_no: { contains: query.search } },
      { registration: { registration_no: { contains: query.search } } },
      { registration: { title: { contains: query.search } } },
      { registration: { publisher: { legal_name: { contains: query.search } } } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.physicalManuscriptHandover.count({ where }),
    prisma.physicalManuscriptHandover.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ created_at: query.status === 'RECEIVED' || query.status === 'RETURNED' ? 'desc' : 'asc' }, { id: 'asc' }],
      include: {
        from_user: { select: { id: true, name: true, nip: true } },
        to_user: { select: { id: true, name: true, nip: true } },
        registration: {
          select: {
            id: true,
            registration_no: true,
            title: true,
            status: true,
            publisher: { select: { id: true, legal_name: true } },
            service_type: { select: { id: true, name: true } },
          },
        },
      },
    }),
  ]);

  return {
    items: queueItems(items, item => item.created_at, skip, !['RECEIVED', 'RETURNED'].includes(query.status)),
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Mengambil daftar petugas Distributor aktif (untuk pilihan dropdown Verifikator)
 */
export const listDistributors = async () => {
  const distributors = await prisma.user.findMany({
    where: {
      status: 'ACTIVE',
      roles: {
        some: {
          role: { code: 'DISTRIBUTOR' },
        },
      },
    },
    select: {
      id: true,
      name: true,
      nip: true,
      email: true,
    },
    orderBy: { name: 'asc' },
  });

  return distributors;
};

