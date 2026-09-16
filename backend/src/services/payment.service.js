import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { ownedFile } from './storage.service.js';
import { fail, requireRole, registration, requireStatus, requireOwner, move, audit } from './workflow-utils.js';
import { queueItems, queuePagination } from './queue-utils.js';

export const createPayment = (id, user, req) => prisma.$transaction(async tx => {
  requireRole(user, ['VERIFIKATOR', 'SUPERADMIN']);
  const reg = await registration(tx, id);
  requireStatus(reg, ['AWAITING_PAYMENT']);
  const existing = await tx.paymentRecord.findFirst({ where: { registration_id: id, status: { in: ['UNPAID', 'PAID', 'VERIFIED'] } } });
  if (existing) fail(409, 'Pengajuan ini sudah memiliki tagihan aktif. Buka tagihan yang tersedia untuk melihat nominal dan status pembayarannya.');
  const total = reg.fee_sla_snapshot?.total_fee;
  if (total === undefined || total === null || !Number.isFinite(Number(total)) || Number(total) < 0) fail(409, 'Tagihan belum dapat dibuat karena rincian tarif saat pengajuan tidak lengkap. Hubungi administrator untuk memeriksa tarif pengajuan ini.');
  
  const cleanRegNo = reg.registration_no.replace(/[^A-Za-z0-9]/g, '');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 hari SLA (Langkah 6 SOP)

  const payment = await tx.paymentRecord.create({ data: {
    registration_id: id,
    billing_no: `BILL-${cleanRegNo}-${randomUUID().slice(0, 6).toUpperCase()}`,
    amount: new Prisma.Decimal(total),
    provider: 'MANUAL',
    status: 'UNPAID',
    expires_at: expiresAt,
  } });
  await audit(tx, user, 'CREATE_BILLING', 'PaymentRecord', payment.id, payment, req);
  return payment;
}, { isolationLevel: 'ReadCommitted' });

export const confirmPayment = (id, data, user, req) => prisma.$transaction(async tx => {
  const initial = await tx.paymentRecord.findUnique({ where: { id } });
  if (!initial) fail(404, 'Tagihan tidak ditemukan.');
  const reg = await registration(tx, initial.registration_id);
  requireOwner(reg, user);
  requireStatus(reg, ['AWAITING_PAYMENT']);
  const payment = await tx.paymentRecord.findUnique({ where: { id } });
  if (payment.status !== 'UNPAID') fail(409, 'Bukti pembayaran untuk tagihan ini sudah dikirim atau telah diproses. Muat ulang detail tagihan untuk melihat status terbarunya.');
  await ownedFile(tx, data.receipt_file_id, user);
  const updated = await tx.paymentRecord.update({ where: { id }, data: {
    status: 'PAID',
    receipt_file_id: data.receipt_file_id,
    external_ref: data.external_ref,
    rejection_reason: null,
    paid_at: new Date(),
  } });
  await move(tx, reg, 'PAYMENT_VERIFICATION', user, 'Bukti pembayaran manual diterima', req);
  await audit(tx, user, 'CONFIRM_PAYMENT', 'PaymentRecord', id, updated, req);

  // Kirim notifikasi ke verifikator naskah
  const assignment = await tx.verificationAssignment.findFirst({
    where: { registration_id: reg.id },
    orderBy: { assigned_at: 'desc' },
  });
  if (assignment?.verifier_id) {
    await tx.notification.create({
      data: {
        user_id: assignment.verifier_id,
        registration_id: reg.id,
        type: 'PAYMENT_SUBMITTED',
        title: `Konfirmasi Pembayaran Diterima: ${reg.registration_no}`,
        payload: { payment_id: id, registration_no: reg.registration_no, external_ref: data.external_ref },
      },
    });
  }

  return updated;
}, { isolationLevel: 'ReadCommitted' });

export const verifyPayment = (id, user, req) => prisma.$transaction(async tx => {
  requireRole(user, ['VERIFIKATOR', 'SUPERADMIN']);
  const initial = await tx.paymentRecord.findUnique({ where: { id } });
  if (!initial) fail(404, 'Tagihan tidak ditemukan.');
  const reg = await registration(tx, initial.registration_id);
  requireStatus(reg, ['PAYMENT_VERIFICATION']);
  const payment = await tx.paymentRecord.findUnique({ where: { id } });
  if (payment.status !== 'PAID' || !payment.receipt_file_id) fail(409, 'Pembayaran belum dapat diverifikasi karena bukti bayar belum dikirim. Minta penerbit mengunggah bukti dan melakukan konfirmasi pembayaran terlebih dahulu.');
  
  const updated = await tx.paymentRecord.update({
    where: { id },
    data: { status: 'VERIFIED', verified_at: new Date() },
  });

  // Sesuai perancangan modul, payment record adalah sumber kebenaran status lunas pembayaran.
  // Penyerahan fisik master mushaf ke distributor akan memindahkan status ke WAITING_DISTRIBUTOR_RECEIPT pada PR-VER-06.
  await audit(tx, user, 'VERIFY_PAYMENT', 'PaymentRecord', id, updated, req);

  const publisher = await tx.publisher.findUnique({ where: { id: reg.publisher_id } });
  if (publisher?.user_id) {
    await tx.notification.create({
      data: {
        user_id: publisher.user_id,
        registration_id: reg.id,
        type: 'PAYMENT_CONFIRMED',
        title: 'Pembayaran PNBP telah diverifikasi sah',
        payload: { payment_id: id, registration_no: reg.registration_no },
      },
    });
  }
  return updated;
}, { isolationLevel: 'ReadCommitted' });

// PR-VER-05: Penolakan / Pengembalian Bukti Bayar Tidak Valid (VER-G06)
export const returnPayment = (id, data, user, req) => prisma.$transaction(async tx => {
  requireRole(user, ['VERIFIKATOR', 'SUPERADMIN']);
  const initial = await tx.paymentRecord.findUnique({ where: { id } });
  if (!initial) fail(404, 'Tagihan tidak ditemukan.');
  const reg = await registration(tx, initial.registration_id);
  requireStatus(reg, ['PAYMENT_VERIFICATION']);
  const payment = await tx.paymentRecord.findUnique({ where: { id } });
  if (payment.status !== 'PAID') {
    fail(409, 'Hanya pembayaran yang menunggu verifikasi (PAID) yang dapat dikembalikan.');
  }

  const updated = await tx.paymentRecord.update({
    where: { id },
    data: {
      status: 'UNPAID',
      rejection_reason: data.reason,
      receipt_file_id: null,
    },
  });

  await move(tx, reg, 'AWAITING_PAYMENT', user, `Bukti pembayaran ditolak: ${data.reason}`, req);
  await audit(tx, user, 'RETURN_PAYMENT_PROOF', 'PaymentRecord', id, { ...updated, reason: data.reason }, req);

  const publisher = await tx.publisher.findUnique({ where: { id: reg.publisher_id } });
  if (publisher?.user_id) {
    await tx.notification.create({
      data: {
        user_id: publisher.user_id,
        registration_id: reg.id,
        type: 'PAYMENT_PROOF_RETURNED',
        title: `Bukti Pembayaran Ditolak: ${reg.registration_no}`,
        payload: { payment_id: id, registration_no: reg.registration_no, reason: data.reason },
      },
    });
  }
  return updated;
}, { isolationLevel: 'ReadCommitted' });

// PR-VER-05: Detail Tagihan & Antrean Pembayaran (VER-G03 & VER-G05)
export const getPaymentDetail = async (id, user) => {
  const payment = await prisma.paymentRecord.findUnique({
    where: { id },
    include: {
      registration: {
        include: {
          publisher: { select: { id: true, legal_name: true, entity_type: true } },
          service_type: { include: { category: true } },
        },
      },
    },
  });
  if (!payment) fail(404, 'Tagihan pembayaran tidak ditemukan.');

  const isHead = user.roles.includes('KEPALA_LPMQ');
  const isAdmin = user.roles.includes('SUPERADMIN');
  const isVerifier = user.roles.includes('VERIFIKATOR');
  const isOwnerPublisher = user.roles.includes('ADMIN_PENERBIT') && user.publisherId === payment.registration.publisher_id;

  if (isOwnerPublisher) {
    // Publisher only sees their own payment
  } else if (!isHead && !isAdmin && !isVerifier) {
    fail(403, 'Anda tidak memiliki hak akses untuk melihat tagihan ini.');
  }

  let receiptFile = null;
  if (payment.receipt_file_id) {
    receiptFile = await prisma.storedFile.findUnique({
      where: { id: payment.receipt_file_id },
      select: { id: true, mime_type: true, file_size: true, created_at: true },
    });
  }

  const now = new Date();
  const expiresAt = payment.expires_at ? new Date(payment.expires_at) : null;
  const isOverdue = expiresAt && now.getTime() > expiresAt.getTime() && payment.status === 'UNPAID';
  const remainingMs = expiresAt ? Math.max(0, expiresAt.getTime() - now.getTime()) : null;

  return {
    ...payment,
    receipt_file: receiptFile,
    sla: {
      expires_at: payment.expires_at,
      is_overdue: Boolean(isOverdue),
      remaining_ms: remainingMs,
      duration_target: '7 hari kalender',
    },
  };
};

export const getRegistrationPayment = async (registrationId, user) => {
  const reg = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: {
      publisher: { select: { id: true, legal_name: true, entity_type: true } },
      service_type: { include: { category: true } },
    },
  });
  if (!reg) fail(404, 'Pengajuan tidak ditemukan.');

  const isHead = user.roles.includes('KEPALA_LPMQ');
  const isAdmin = user.roles.includes('SUPERADMIN');
  const isVerifier = user.roles.includes('VERIFIKATOR');
  const isOwnerPublisher = user.roles.includes('ADMIN_PENERBIT') && user.publisherId === reg.publisher_id;

  if (!isOwnerPublisher && !isHead && !isAdmin && !isVerifier) {
    fail(403, 'Anda tidak memiliki hak akses untuk melihat tagihan naskah ini.');
  }

  const payment = await prisma.paymentRecord.findFirst({
    where: { registration_id: registrationId },
    orderBy: { created_at: 'desc' },
  });

  if (!payment) {
    return {
      payment: null,
      registration: reg,
      fee_sla_snapshot: reg.fee_sla_snapshot,
    };
  }

  return getPaymentDetail(payment.id, user);
};

export const listPayments = async (query, user) => {
  const isHead = user.roles.includes('KEPALA_LPMQ');
  const isAdmin = user.roles.includes('SUPERADMIN');
  const isVerifier = user.roles.includes('VERIFIKATOR');
  const isOwnerPublisher = user.roles.includes('ADMIN_PENERBIT');

  const { page, limit, skip } = queuePagination(query);

  const where = {};
  if (isOwnerPublisher && !isAdmin) {
    where.registration = { publisher_id: user.publisherId };
  } else if (!isHead && !isAdmin && !isVerifier) {
    fail(403, 'Akses antrean pembayaran ditolak.');
  }

  if (query.status) {
    where.status = query.status;
  }

  if (query.search) {
    where.OR = [
      { billing_no: { contains: query.search } },
      { external_ref: { contains: query.search } },
      { registration: { registration_no: { contains: query.search } } },
      { registration: { title: { contains: query.search } } },
      { registration: { publisher: { legal_name: { contains: query.search } } } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.paymentRecord.count({ where }),
    prisma.paymentRecord.findMany({
      where,
      skip,
      take: limit,
      orderBy: query.status === 'PAID'
        ? [{ registration: { stage_entered_at: 'asc' } }, { id: 'asc' }]
        : [{ created_at: isOwnerPublisher || query.status === 'VERIFIED' ? 'desc' : 'asc' }, { id: 'asc' }],
      include: {
        registration: {
          select: {
            id: true,
            registration_no: true,
            title: true,
            status: true,
            stage_entered_at: true,
            publisher: { select: { id: true, legal_name: true } },
            service_type: { select: { id: true, name: true } },
          },
        },
      },
    }),
  ]);

  return {
    items: queueItems(items, item => query.status === 'PAID' ? item.registration.stage_entered_at : item.created_at, skip, !isOwnerPublisher && query.status !== 'VERIFIED'),
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
      totalPages: Math.ceil(total / limit),
    },
  };
};

