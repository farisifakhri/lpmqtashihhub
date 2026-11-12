import {
  buildAdminPublisherRegistrationWhere,
  buildMasterIntakeQueueWhere,
  buildUnassignedVerificationWhere,
  buildVerificationAssignmentsWhere,
  buildMyAssignmentsWhere,
  buildHeadVerificationSignatureWhere,
  buildHeadSttSignatureWhere,
} from './queue-filters.js';
import { buildVerificationAssignmentWhere } from './verification-intake.service.js';

const adminQueues = [
  {
    key: 'publisher_registration_pending',
    model: 'publisherRegistration',
    sidebarItem: '1. Pendaftaran Penerbit',
    tab: 'DIAJUKAN',
    buildWhere: () => buildAdminPublisherRegistrationWhere({ status: 'DIAJUKAN' }),
  },
  {
    key: 'master_intake_pending',
    model: 'registration',
    sidebarItem: '2. Intake Master Fisik',
    tab: 'Belum diterima + revisi fisik awal',
    buildWhere: () => buildMasterIntakeQueueWhere(),
  },
  {
    key: 'verification_assignment_pending',
    model: 'registration',
    sidebarItem: '3. Penugasan Verifikator',
    tab: 'NEED_ASSIGNMENT / UNASSIGNED',
    buildWhere: () => buildUnassignedVerificationWhere(),
  },
];

const verifierQueues = [
  {
    key: 'verification_assigned',
    model: 'verificationAssignment',
    sidebarItem: 'Tugas Verifikasi',
    tab: 'ASSIGNED',
    buildWhere: user => buildVerificationAssignmentsWhere({ status: 'ASSIGNED' }, user, { scopeToVerifier: true }),
  },
  {
    key: 'verification_ready_to_send',
    model: 'verificationAssignment',
    sidebarItem: 'Siap Dikirim',
    tab: 'READY_TO_SEND',
    buildWhere: user => buildVerificationAssignmentsWhere({ status: 'READY_TO_SEND' }, user, { scopeToVerifier: true }),
  },
  {
    key: 'verification_bast_ready',
    model: 'verificationAssignment',
    sidebarItem: 'Siap Serah Terima',
    tab: 'BAST_READY',
    buildWhere: user => buildVerificationAssignmentsWhere({ handover_ready: 'true' }, user, { scopeToVerifier: true }),
  },
  {
    key: 'payment_verification_pending',
    model: 'paymentRecord',
    sidebarItem: 'Verifikasi Pembayaran',
    tab: 'Perlu Verifikasi (PAID)',
    buildWhere: user => ({
      status: 'PAID',
      registration: {
        status: 'PAYMENT_VERIFICATION',
        verification_assignments: {
          some: {
            verifier_id: user.id,
            status: 'COMPLETED',
            decision: 'PASSED',
          },
        },
      },
    }),
  },
];

const getPublisherId = user => {
  if (!user?.publisherId) {
    const error = new Error('Akun penerbit belum terhubung ke profil penerbit.');
    error.statusCode = 403;
    throw error;
  }
  return user.publisherId;
};

const publisherQueues = [
  {
    key: 'publisher_revision_pending',
    model: 'registration',
    sidebarItem: 'Permohonan Saya',
    tab: 'Perlu Tindakan (revisi saja)',
    buildWhere: user => ({
      publisher_id: getPublisherId(user),
      status: { in: ['REVISION_REQUIRED', 'PHYSICAL_HANDOVER_CORRECTION_REQUIRED'] },
    }),
  },
  {
    key: 'publisher_billing_unpaid',
    model: 'paymentRecord',
    sidebarItem: 'Tagihan',
    tab: 'Menunggu Bayar (UNPAID)',
    buildWhere: user => ({
      status: 'UNPAID',
      registration: { publisher_id: getPublisherId(user) },
    }),
  },
];

const pentashihQueues = [
  {
    key: 'tashih_active',
    model: 'assignment',
    sidebarItem: 'Tugas Saya',
    tab: 'Tugas Sidang Awal + Tashih Revisi & Dumi (aktif)',
    buildWhere: user => ({
      ...buildMyAssignmentsWhere(user, { status: 'ACTIVE' }),
      reviews: { none: {} },
    }),
  },
];

const kepalaQueues = [
  {
    key: 'verification_approval_pending',
    model: 'verificationAssignment',
    sidebarItem: 'Persetujuan Verifikasi',
    tab: 'WAITING_APPROVAL',
    buildWhere: user => buildVerificationAssignmentWhere(
      { registration_status: 'WAITING_VERIFICATION_APPROVAL' },
      user,
    ),
  },
  {
    key: 'head_signature_pending',
    sidebarItem: 'Pusat Tanda Tangan (TTE)',
    tab: 'NEED_MY_SIGN',
    count: async (db, user) => {
      const [verificationCount, sttCount] = await Promise.all([
        db.verificationDocument.count({ where: buildHeadVerificationSignatureWhere(user) }),
        db.officialDocument.count({ where: buildHeadSttSignatureWhere(user) }),
      ]);
      return verificationCount + sttCount;
    },
  },
];

export const QUEUE_CONFIG = {
  ADMIN_INTERNAL: adminQueues,
  SUPERADMIN: adminQueues,
  VERIFIKATOR: verifierQueues,
  PENERBIT: publisherQueues,
  PENTASHIH: pentashihQueues,
  KEPALA_LPMQ: kepalaQueues,
};
