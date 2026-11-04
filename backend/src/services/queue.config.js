import {
  buildAdminPublisherRegistrationWhere,
  buildMasterIntakeQueueWhere,
  buildUnassignedVerificationWhere,
  buildVerificationAssignmentsWhere,
} from './queue-filters.js';

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
];

export const QUEUE_CONFIG = {
  ADMIN_INTERNAL: adminQueues,
  SUPERADMIN: adminQueues,
  VERIFIKATOR: verifierQueues,
};
