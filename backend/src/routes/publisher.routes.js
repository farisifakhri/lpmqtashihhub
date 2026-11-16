import { Router } from 'express';
import publisherController from '../controllers/publisher.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { updatePublisherProfileSchema, verifyPublisherSchema, adminEditPublisherSchema } from '../validators/publisher.validator.js';

const router = Router();

// Rute khusus portal penerbit
router.get('/me', authenticate, authorize('PENERBIT'), publisherController.getMyProfile);
router.put('/me', authenticate, authorize('PENERBIT'), validate(updatePublisherProfileSchema), publisherController.updateMyProfile);

// Rute internal LPMQ
router.get('/', authenticate, authorize('SUPERADMIN', 'VERIFIKATOR'), publisherController.listPublishers);
router.patch('/:id/verify', authenticate, authorize('SUPERADMIN', 'VERIFIKATOR'), validate(verifyPublisherSchema), publisherController.verifyPublisher);
router.patch('/:id/permit-edit', authenticate, authorize('SUPERADMIN', 'KEPALA_LPMQ'), publisherController.permitProfileEdit);
router.patch('/:id', authenticate, authorize('SUPERADMIN'), validate(adminEditPublisherSchema), publisherController.adminUpdatePublisher);

export default router;

