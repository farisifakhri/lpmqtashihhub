import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { ownedFile } from './storage.service.js';
import { fail, requireRole, registration, requireStatus, requireOwner, move, audit } from './workflow-utils.js';

export const createPayment = (id, user) => prisma.$transaction(async tx => {
  requireRole(user, ['VERIFIKATOR', 'SUPERADMIN']);
  const reg = await registration(tx, id);
  requireStatus(reg, ['AWAITING_PAYMENT']);
  const existing = await tx.paymentRecord.findFirst({ where: { registration_id: id, status: { in: ['UNPAID', 'PAID', 'VERIFIED'] } } });
  if (existing) fail(409, 'Pengajuan ini sudah memiliki tagihan aktif. Buka tagihan yang tersedia untuk melihat nominal dan status pembayarannya.');
  const total = reg.fee_sla_snapshot?.total_fee;
  if (total === undefined || total === null || !Number.isFinite(Number(total)) || Number(total) < 0) fail(409, 'Tagihan belum dapat dibuat karena rincian tarif saat pengajuan tidak lengkap. Hubungi administrator untuk memeriksa tarif pengajuan ini.');
  const payment = await tx.paymentRecord.create({ data: {
    registration_id: id, billing_no: `MANUAL-${randomUUID()}`, amount: new Prisma.Decimal(total), provider: 'MANUAL',
  } });
  await audit(tx, user, 'CREATE_BILLING', 'PaymentRecord', payment.id, payment);
  return payment;
}, { isolationLevel: 'ReadCommitted' });

export const confirmPayment = (id, data, user) => prisma.$transaction(async tx => {
  const initial = await tx.paymentRecord.findUnique({ where: { id } });
  if (!initial) fail(404, 'Tagihan tidak ditemukan.');
  const reg = await registration(tx, initial.registration_id);
  requireOwner(reg, user);
  requireStatus(reg, ['AWAITING_PAYMENT']);
  const payment = await tx.paymentRecord.findUnique({ where: { id } });
  if (payment.status !== 'UNPAID') fail(409, 'Bukti pembayaran untuk tagihan ini sudah dikirim atau telah diproses. Muat ulang detail tagihan untuk melihat status terbarunya.');
  await ownedFile(tx, data.receipt_file_id, user);
  const updated = await tx.paymentRecord.update({ where: { id }, data: {
    status: 'PAID', receipt_file_id: data.receipt_file_id, external_ref: data.external_ref, paid_at: new Date(),
  } });
  await move(tx, reg, 'PAYMENT_VERIFICATION', user, 'Bukti pembayaran manual diterima');
  await audit(tx, user, 'CONFIRM_PAYMENT', 'PaymentRecord', id, updated);
  return updated;
}, { isolationLevel: 'ReadCommitted' });

export const verifyPayment = (id, user) => prisma.$transaction(async tx => {
  requireRole(user, ['VERIFIKATOR', 'SUPERADMIN']);
  const initial = await tx.paymentRecord.findUnique({ where: { id } });
  if (!initial) fail(404, 'Tagihan tidak ditemukan.');
  const reg = await registration(tx, initial.registration_id);
  requireStatus(reg, ['PAYMENT_VERIFICATION']);
  const payment = await tx.paymentRecord.findUnique({ where: { id } });
  if (payment.status !== 'PAID' || !payment.receipt_file_id) fail(409, 'Pembayaran belum dapat diverifikasi karena bukti bayar belum dikirim. Minta penerbit mengunggah bukti dan melakukan konfirmasi pembayaran terlebih dahulu.');
  const updated = await tx.paymentRecord.update({ where: { id }, data: { status: 'VERIFIED', verified_at: new Date() } });
  await move(tx, reg, 'WAITING_DISTRIBUTION', user, 'Pembayaran diverifikasi lunas');
  await audit(tx, user, 'VERIFY_PAYMENT', 'PaymentRecord', id, updated);
  const publisher = await tx.publisher.findUnique({ where: { id: reg.publisher_id } });
  if (publisher.user_id) await tx.notification.create({ data: { user_id: publisher.user_id, registration_id: reg.id, type: 'PAYMENT_CONFIRMED', title: 'Pembayaran PNBP telah diverifikasi' } });
  return updated;
}, { isolationLevel: 'ReadCommitted' });
