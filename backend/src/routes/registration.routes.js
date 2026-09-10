import { Router } from 'express';
import registrationController from '../controllers/registration.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { registrationRateLimiter } from '../middlewares/rateLimiter.middleware.js';
import {
  createRegistrationSchema,
  transitionStatusSchema,
  createManuscriptFileSchema,
} from '../validators/registration.validator.js';

const router = Router();

// Semua endpoint pengajuan memerlukan otentikasi
router.use(authenticate);
router.use(authorize('ADMIN_PENERBIT', 'VERIFIKATOR', 'DISTRIBUTOR', 'PENTASHIH', 'KEPALA_LPMQ', 'DOKUMENTATOR'));

// Daftar & Pembuatan Pengajuan
router.get('/', registrationController.listRegistrations);
router.post('/', authorize('ADMIN_PENERBIT'), registrationRateLimiter, validate(createRegistrationSchema), registrationController.createDraft);
router.get('/:id', registrationController.getDetail);

// Berkas Naskah Mushaf (Manuscript Files)
router.get('/:id/manuscripts', registrationController.listManuscriptFiles);
router.post(
  '/:id/manuscripts',
  validate(createManuscriptFileSchema),
  registrationController.addManuscriptFile
);

// Aksi workflow submit & transisi status (didukung PATCH dan POST)
router.post('/:id/submit', authorize('ADMIN_PENERBIT'), registrationController.submitRegistration);

const transitionRoles = [
  'SUPERADMIN',
  'VERIFIKATOR',
  'DISTRIBUTOR',
  'PENTASHIH',
  'KEPALA_LPMQ',
  'DOKUMENTATOR',
  'ADMIN_PENERBIT',
];

router.patch(
  '/:id/status',
  authorize(...transitionRoles),
  validate(transitionStatusSchema),
  registrationController.transitionStatus
);

router.post(
  '/:id/transition',
  authorize(...transitionRoles),
  validate(transitionStatusSchema),
  registrationController.transitionStatus
);

export default router;
