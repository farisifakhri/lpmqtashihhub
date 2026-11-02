import {
  buildAdminPublisherRegistrationWhere,
  buildMasterIntakeQueueWhere,
  buildUnassignedVerificationWhere,
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

export const QUEUE_CONFIG = {
  ADMIN_INTERNAL: adminQueues,
  SUPERADMIN: adminQueues,
};
