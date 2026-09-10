import { Router } from 'express';
import registrationController from '../controllers/registration.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createRegistrationSchema, transitionStatusSchema } from '../validators/registration.validator.js';

const router = Router();

// Semua endpoint pengajuan memerlukan otentikasi
router.use(authenticate);

// Daftar & Pembuatan Pengajuan
router.get('/', registrationController.listRegistrations);
router.post('/', validate(createRegistrationSchema), registrationController.createDraft);
router.get('/:id', registrationController.getDetail);

// Aksi workflow
router.post('/:id/submit', registrationController.submitRegistration);
router.patch(
  '/:id/status',
  authorize('SUPERADMIN', 'VERIFIKATOR', 'DISTRIBUTOR', 'KEPALA_LPMQ', 'DOKUMENTATOR'),
  validate(transitionStatusSchema),
  registrationController.transitionStatus
);

export default router;
