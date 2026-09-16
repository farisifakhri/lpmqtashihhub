import { fail } from './workflow-utils.js';

/**
 * P0-05: Resource-Level Authorization & Policy Checks
 */

export function isPublisherUser(user) {
  return user?.roles?.includes('ADMIN_PENERBIT') && !user?.roles?.includes('SUPERADMIN');
}

export function isVerifierUser(user) {
  return user?.roles?.includes('VERIFIKATOR') && !user?.roles?.includes('SUPERADMIN') && !user?.roles?.includes('KEPALA_LPMQ');
}

export function isDistributorUser(user) {
  return user?.roles?.includes('DISTRIBUTOR') && !user?.roles?.includes('SUPERADMIN');
}

export function isKepalaUser(user) {
  return user?.roles?.includes('KEPALA_LPMQ');
}

export function isAdminUser(user) {
  return user?.roles?.includes('ADMIN') || user?.roles?.includes('SUPERADMIN');
}

/**
 * Memastikan Verifikator hanya dapat memproses/membaca tugas yang ditugaskan kepada dirinya.
 */
export function assertVerifierAssignment(assignment, user) {
  if (!assignment) fail(404, 'Penugasan verifikasi tidak ditemukan.');
  if (user?.roles?.includes('KEPALA_LPMQ') || user?.roles?.includes('SUPERADMIN')) {
    return; // Kepala & Superadmin memiliki akses baca/pengawasan
  }
  if (!user?.roles?.includes('VERIFIKATOR')) {
    fail(403, 'Akses khusus untuk Verifikator penugasan.');
  }
  if (assignment.verifier_id !== user.id) {
    fail(403, 'Anda bukan verifikator yang ditugaskan untuk pengajuan ini.');
  }
}

/**
 * Memastikan Verifikator hanya dapat memproses/memverifikasi pembayaran untuk naskah yang ditugaskan padanya.
 */
export async function assertVerifierPaymentAccess(payment, user, db, write = false) {
  if (!payment) fail(404, 'Tagihan pembayaran tidak ditemukan.');

  const isOwner = user?.roles?.includes('ADMIN_PENERBIT') && user.publisherId === payment.registration?.publisher_id;
  const isHead = user?.roles?.includes('KEPALA_LPMQ');
  const isSuperadmin = user?.roles?.includes('SUPERADMIN');
  const isVerifier = user?.roles?.includes('VERIFIKATOR');

  if (isOwner) {
    if (write) return; // Publisher can confirm payment
    return;
  }

  if (write) {
    // Aksi substantif verifikasi / penolakan pembayaran: HANYA Verifikator penugasan
    if (!isVerifier) {
      fail(403, 'Verifikasi dan pengembalian bukti pembayaran hanya dapat dilakukan oleh Verifikator penugasan.');
    }
    const assignment = await db.verificationAssignment.findFirst({
      where: { registration_id: payment.registration_id },
      orderBy: { assigned_at: 'desc' },
    });
    if (!assignment || assignment.verifier_id !== user.id) {
      fail(403, 'Anda bukan verifikator yang ditugaskan untuk memverifikasi pembayaran pengajuan ini.');
    }
    return;
  }

  // Akses baca detail pembayaran
  if (isHead || isSuperadmin) return; // Pengawasan
  if (isVerifier) {
    const assignment = await db.verificationAssignment.findFirst({
      where: { registration_id: payment.registration_id },
      orderBy: { assigned_at: 'desc' },
    });
    if (!assignment || assignment.verifier_id !== user.id) {
      fail(403, 'Anda tidak memiliki hak akses untuk memeriksa pembayaran pengajuan verifikator lain.');
    }
    return;
  }

  fail(403, 'Anda tidak memiliki hak akses untuk melihat tagihan ini.');
}

/**
 * Memastikan Distributor hanya dapat memproses handover yang ditujukan kepada dirinya.
 */
export function assertDistributorHandoverAccess(handover, user, write = false) {
  if (!handover) fail(404, 'Catatan serah-terima fisik tidak ditemukan.');
  if (user?.roles?.includes('SUPERADMIN') && !write) return;
  if (!user?.roles?.includes('DISTRIBUTOR')) {
    fail(403, 'Aksi serah-terima ini khusus untuk petugas Distributor.');
  }
  if (handover.to_user_id !== user.id) {
    fail(403, 'Anda bukan petugas Distributor tujuan serah-terima ini.');
  }
}

/**
 * Validasi kepemilikan dan konteks berkas lampiran (P0-06).
 */
export async function assertAttachmentFileOwnership(db, fileIds, user, registrationId) {
  if (!fileIds?.length) return;
  const uniqueIds = [...new Set(fileIds)];
  if (uniqueIds.length !== fileIds.length) {
    fail(400, 'Lampiran yang sama tidak boleh dipilih dua kali.');
  }

  const files = await db.storedFile.findMany({
    where: { id: { in: uniqueIds } },
  });

  if (files.length !== uniqueIds.length) {
    fail(400, 'Satu atau lebih berkas lampiran tidak ditemukan di sistem.');
  }

  for (const f of files) {
    // 1. Pemilik file adalah user yang mengunggah
    const isOwner = f.owner_id === user.id;

    // 2. Atau file secara sah terhubung dengan registrasi/naskah yang sama
    const isRelatedManuscript = await db.manuscriptFile.findFirst({
      where: { file_id: f.id, registration_id: registrationId },
    });

    // 3. Pastikan BUKAN bukti pembayaran dari registrasi lain atau file privat yang tidak berhak
    const isPaymentReceipt = await db.paymentRecord.findFirst({
      where: { receipt_file_id: f.id },
    });

    if (isPaymentReceipt && isPaymentReceipt.registration_id !== registrationId) {
      fail(403, 'Bukti pembayaran dari pengajuan lain tidak dapat dijadikan lampiran dokumen verifikasi.');
    }

    if (!isOwner && !isRelatedManuscript && !user?.roles?.includes('SUPERADMIN')) {
      fail(403, 'Anda tidak memiliki hak untuk melampirkan berkas milik pengguna lain.');
    }
  }
}

