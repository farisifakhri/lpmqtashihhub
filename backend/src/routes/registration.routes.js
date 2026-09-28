import { Router } from 'express';
import registrationController from '../controllers/registration.controller.js';
import { listDocumentArchive } from '../services/document-archive.service.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { registrationRateLimiter } from '../middlewares/rateLimiter.middleware.js';
import {
  createRegistrationSchema,
  dispatchPhysicalSchema,
  transitionStatusSchema,
  createManuscriptFileSchema,
} from '../validators/registration.validator.js';

const router = Router();

// Semua endpoint pengajuan memerlukan otentikasi
router.use(authenticate);
router.use(authorize('HELPER_ADMIN', 'ADMIN_PENERBIT', 'VERIFIKATOR', 'DISTRIBUTOR', 'PENTASHIH', 'KEPALA_LPMQ', 'DOKUMENTATOR'));

// Daftar & Pembuatan Pengajuan
router.get('/', registrationController.listRegistrations);
router.post('/', authorize('ADMIN_PENERBIT'), registrationRateLimiter, validate(createRegistrationSchema), registrationController.createDraft);
router.get('/:id', registrationController.getDetail);
router.get('/:id/document-archive', authorize('ADMIN_PENERBIT', 'HELPER_ADMIN', 'DOKUMENTATOR'), async (req, res, next) => {
  try { res.json({ success: true, data: await listDocumentArchive(req.params.id, req.user) }); }
  catch (error) { next(error); }
});

// Berkas Naskah Mushaf (Manuscript Files)
router.get('/:id/manuscripts', registrationController.listManuscriptFiles);
router.post(
  '/:id/manuscripts',
  authorize('ADMIN_PENERBIT'),
  validate(createManuscriptFileSchema),
  registrationController.addManuscriptFile
);

// Aksi workflow submit & transisi status (didukung PATCH dan POST)
router.post('/:id/submit', authorize('ADMIN_PENERBIT'), registrationController.submitRegistration);
router.post('/:id/dispatch-physical', authorize('ADMIN_PENERBIT'), validate(dispatchPhysicalSchema), registrationController.dispatchPhysical);

const transitionRoles = [
  // HELPER_ADMIN is intentionally excluded: team assignment is a separate domain action.
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
