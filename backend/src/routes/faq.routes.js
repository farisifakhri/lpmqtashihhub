import { Router } from 'express';
import * as faqController from '../controllers/faq.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createFaqSchema, faqIdSchema, listFaqsSchema, updateFaqSchema } from '../validators/faq.validator.js';

const router = Router();
const adminAuth = [authenticate, authorize('ADMIN_INTERNAL', 'SUPERADMIN')];

router.get('/faqs', validate(listFaqsSchema), faqController.listPublicFaqs);
router.get('/admin/faqs', ...adminAuth, validate(listFaqsSchema), faqController.listAdminFaqs);
router.post('/admin/faqs', ...adminAuth, validate(createFaqSchema), faqController.createFaq);
router.get('/admin/faqs/:id', ...adminAuth, validate(faqIdSchema), faqController.getAdminFaq);
router.patch('/admin/faqs/:id', ...adminAuth, validate(faqIdSchema), validate(updateFaqSchema), faqController.updateFaq);
router.delete('/admin/faqs/:id', ...adminAuth, validate(faqIdSchema), faqController.deleteFaq);

export default router;
