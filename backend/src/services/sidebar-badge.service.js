import { prisma } from '../config/database.js';
import { REGISTRATION_SEGMENTS } from './queue-utils.js';
import { buildVerificationAssignmentWhere } from './verification-intake.service.js';
import { buildUnassignedVerificationWhere } from './queue-filters.js';
import { buildPaymentWhere } from './payment.service.js';
import { buildHandoverWhere } from './handover.service.js';
import { buildRegistrationScopeWhere } from './registration.service.js';

/**
 * Badge notifikasi sidebar: jumlah pekerjaan yang menunggu tindakan pada tiap menu.
 *
 * Setiap antrean memakai filter yang sama dengan halaman tujuan menu (builder dibagi
 * bersama dengan service daftar antrean), sehingga angka badge selalu sama dengan isi
 * halaman yang dibuka. Antrean hanya dihitung untuk peran yang berhak membuka halamannya.
 */

const ACTIVE_TASHIH_STATUSES = ['ASSIGNED', 'IN_PROGRESS', 'OVERDUE'];
const REVISION_RETURN_LETTER = { document_type: 'REVISION_RETURN_LETTER' };
const VERIFICATION_ROLES = ['KEPALA_LPMQ', 'VERIFIKATOR', 'ADMIN_INTERNAL', 'SUPERADMIN'];
const DOCUMENT_ROLES = ['DOKUMENTATOR', 'ADMIN_INTERNAL', 'DISTRIBUTOR', 'KEPALA_LPMQ', 'SUPERADMIN'];

const isPublisherOnly = user => user.roles.includes('PENERBIT') && !user.roles.includes('SUPERADMIN');

const registrationCount = (user, extraWhere) =>
  prisma.registration.count({ where: { ...buildRegistrationScopeWhere(user), ...extraWhere } });

// Tugas sidang pentashih yang belum dikirim hasil telaahnya (sama dengan tab Sidang Awal / Revisi & Dumi).
const tashihWhere = (user, revision) => ({
  assignee_id: user.id,
  status: { in: ACTIVE_TASHIH_STATUSES },
  reviews: { none: {} },
  ...(revision
    ? { OR: [{ stage: { in: ['REVISION', 'DUMMY'] } }, { registration: { official_documents: { some: REVISION_RETURN_LETTER } } }] }
    : { stage: 'INITIAL', registration: { official_documents: { none: REVISION_RETURN_LETTER } } }),
});

// Dokumen verifikasi yang menunggu tanda tangan user ini dan sudah tiba gilirannya (sign_order).
async function countMyPendingSignatures(user) {
  const pending = await prisma.verificationDocumentSignatory.findMany({
    where: { signer_user_id: user.id, status: 'PENDING', document: { status: { in: ['APPROVED', 'SIGNING'] } } },
    select: {
      sign_order: true,
      document: { select: { signatories: { select: { sign_order: true, status: true } } } },
    },
  });
  const verificationCount = pending.filter(mine =>
    !mine.document.signatories.some(other => other.sign_order < mine.sign_order && other.status !== 'SIGNED'),
  ).length;

  // Surat persetujuan permohonan master yang menunggu TTE Kepala (bukan surat yang disusun sendiri)
  let masterLetterCount = 0;
  if (user.roles.includes('KEPALA_LPMQ') || user.roles.includes('SUPERADMIN')) {
    masterLetterCount = await prisma.masterMushafRequest.count({
      where: { status: 'MENUNGGU_TTE', NOT: { letter_drafted_by_id: user.id } },
    });
  }
  return verificationCount + masterLetterCount;
}

export const SIDEBAR_BADGES = [
  // Penerbit
  {
    key: 'publisher_actions',
    roles: ['PENERBIT'],
    when: isPublisherOnly,
    count: user => registrationCount(user, { status: { in: REGISTRATION_SEGMENTS.PUBLISHER_ACTIONS } }),
  },
  {
    key: 'publisher_billing',
    roles: ['PENERBIT'],
    when: isPublisherOnly,
    count: user => prisma.paymentRecord.count({ where: buildPaymentWhere({ status: 'UNPAID' }, user) }),
  },

  // Admin: pendaftaran penerbit & loket master fisik
  {
    key: 'publisher_registrations',
    roles: ['ADMIN_INTERNAL', 'SUPERADMIN'],
    count: () => prisma.publisherRegistration.count({ where: { status: 'DIAJUKAN' } }),
  },
  {
    // Permohonan master: perlu disusun suratnya (DIAJUKAN) atau dikirim ke penerbit (DITANDATANGANI)
    key: 'master_requests_pending',
    roles: ['ADMIN_INTERNAL', 'SUPERADMIN'],
    count: () => prisma.masterMushafRequest.count({ where: { status: { in: ['DIAJUKAN', 'DITANDATANGANI'] } } }),
  },
  {
    key: 'master_intake',
    roles: ['ADMIN_INTERNAL', 'SUPERADMIN'],
    count: user => registrationCount(user, {
      status: { in: ['READY_FOR_VERIFICATION', 'REVISION_REQUIRED'] },
      OR: [{ physical_master_intake: { is: null } }, { physical_master_intake: { is: { status: { not: 'RECEIVED' } } } }],
    }),
  },

  // Verifikasi berkas
  {
    key: 'verification_need_assignment',
    roles: ['ADMIN_INTERNAL', 'SUPERADMIN'],
    count: () => prisma.registration.count({ where: buildUnassignedVerificationWhere() }),
  },
  {
    key: 'verification_assigned',
    roles: VERIFICATION_ROLES,
    count: user => prisma.verificationAssignment.count({
      where: { ...buildVerificationAssignmentWhere({}, user), status: { in: ['ASSIGNED', 'IN_PROGRESS'] } },
    }),
  },
  {
    key: 'verification_waiting_approval',
    roles: VERIFICATION_ROLES,
    count: user => prisma.verificationAssignment.count({
      where: buildVerificationAssignmentWhere({ registration_status: 'WAITING_VERIFICATION_APPROVAL' }, user),
    }),
  },
  {
    key: 'verification_ready_to_send',
    roles: VERIFICATION_ROLES,
    count: user => prisma.verificationAssignment.count({ where: buildVerificationAssignmentWhere({ status: 'READY_TO_SEND' }, user) }),
  },
  {
    key: 'verification_bast_ready',
    roles: VERIFICATION_ROLES,
    count: user => prisma.verificationAssignment.count({ where: buildVerificationAssignmentWhere({ handover_ready: 'true' }, user) }),
  },
  {
    key: 'signatures_pending',
    roles: ['KEPALA_LPMQ', 'VERIFIKATOR', 'SUPERADMIN'],
    count: countMyPendingSignatures,
  },

  // Pembayaran PNBP: bukti bayar sudah diunggah dan menunggu validasi
  {
    key: 'payments_pending_verification',
    roles: ['KEPALA_LPMQ', 'VERIFIKATOR', 'SUPERADMIN'],
    count: user => prisma.paymentRecord.count({ where: buildPaymentWhere({ status: 'PAID' }, user) }),
  },

  // Distribusi sidang
  {
    key: 'handover_pending',
    roles: ['DISTRIBUTOR', 'VERIFIKATOR', 'KEPALA_LPMQ', 'SUPERADMIN'],
    count: user => prisma.physicalManuscriptHandover.count({ where: buildHandoverWhere({ status: 'PENDING' }, user) }),
  },
  {
    key: 'distribution_waiting',
    roles: ['DISTRIBUTOR', 'ADMIN_INTERNAL', 'VERIFIKATOR', 'KEPALA_LPMQ', 'SUPERADMIN'],
    count: user => registrationCount(user, { status: 'WAITING_DISTRIBUTION' }),
  },

  // Sidang pentashihan
  {
    key: 'tashih_initial',
    roles: ['PENTASHIH', 'SUPERADMIN'],
    count: user => prisma.assignment.count({ where: tashihWhere(user, false) }),
  },
  {
    key: 'tashih_revision',
    roles: ['PENTASHIH', 'SUPERADMIN'],
    count: user => prisma.assignment.count({ where: tashihWhere(user, true) }),
  },

  // Pengesahan STT & dokumentasi
  {
    key: 'stt_ready',
    roles: DOCUMENT_ROLES,
    count: user => registrationCount(user, { status: 'READY_FOR_STT' }),
  },
  {
    key: 'documentation_pending',
    roles: DOCUMENT_ROLES,
    count: user => registrationCount(user, { status: { in: ['STT_ISSUED', 'DOCUMENTATION_IN_PROGRESS'] } }),
  },
];

/**
 * Mengembalikan peta { kunci_badge: jumlah } hanya untuk antrean yang boleh diakses user.
 * Antrean yang gagal dihitung dilewati agar satu kesalahan tidak menghilangkan semua badge.
 */
export async function getSidebarBadges(user) {
  const roles = user?.roles || [];
  if (isPublisherOnly(user) && !user.publisherId) return {};

  // Pengguna multi-role (mis. Verifikator+Pentashih): hanya tampilkan badge untuk peran
  // yang sedang aktif agar tidak membingungkan saat berganti peran.
  const activeRole = user?.activeRole && roles.includes(user.activeRole) ? user.activeRole : null;
  const eligibleRoles = activeRole && roles.length > 1 ? [activeRole] : roles;

  const visible = SIDEBAR_BADGES.filter(badge =>
    badge.roles.some(role => eligibleRoles.includes(role)) && (!badge.when || badge.when(user)),
  );
  const results = await Promise.allSettled(visible.map(badge => badge.count(user)));

  const badges = {};
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') badges[visible[index].key] = result.value;
    else console.error(`[sidebar-badge] Gagal menghitung antrean ${visible[index].key}:`, result.reason?.message || result.reason);
  });
  return badges;
}
