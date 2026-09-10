import { Router } from 'express';
import publisherController from '../controllers/publisher.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { updatePublisherProfileSchema, verifyPublisherSchema } from '../validators/publisher.validator.js';

const router = Router();

// Rute khusus portal penerbit
router.get('/me', authenticate, publisherController.getMyProfile);
router.put('/me', authenticate, validate(updatePublisherProfileSchema), publisherController.updateMyProfile);

// Rute internal LPMQ
router.get('/', authenticate, authorize('SUPERADMIN', 'VERIFIKATOR'), publisherController.listPublishers);
router.patch('/:id/verify', authenticate, authorize('SUPERADMIN', 'VERIFIKATOR'), validate(verifyPublisherSchema), publisherController.verifyPublisher);

export default router;
