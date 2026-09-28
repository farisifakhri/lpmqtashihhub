import express, { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { emptyAction, confirmPaymentSchema, returnPaymentSchema, paymentQuerySchema, myTasksQuerySchema, assignmentSchema, reviewSchema, documentSchema, calendarSchema } from '../validators/workflow.validator.js';
import { updateCalendar, syncNationalHolidays } from '../services/calendar.service.js';
import * as documents from '../services/official-document.service.js';
import * as distribution from '../services/distribution.service.js';
import * as payment from '../services/payment.service.js';
import * as notifications from '../services/notification.service.js';
import { upload, MAX_UPLOAD_BYTES } from '../services/storage.service.js';
import { readPrivateFile } from '../services/private-file.service.js';

const router = Router();
const action = (fn, status = 200) => async (req, res, next) => {
  try { res.status(status).json({ success: true, data: await fn(req) }); } catch (error) { next(error); }
};
router.put('/master/working-days', authenticate, authorize('SUPERADMIN'), validate(calendarSchema), action(req => updateCalendar(req.body.days, req.user)));
router.post('/master/working-days/sync-holidays', authenticate, authorize('SUPERADMIN', 'HELPER_ADMIN'), action(req => syncNationalHolidays(req.user, req.body?.year ? Number(req.body.year) : 2026)));
router.get('/notifications', authenticate, authorize('HELPER_ADMIN', 'ADMIN_PENERBIT', 'VERIFIKATOR', 'DISTRIBUTOR', 'PENTASHIH', 'DOKUMENTATOR', 'KEPALA_LPMQ'), action(req => notifications.listMyNotifications(req.user)));
router.patch('/notifications/:id/read', authenticate, authorize('HELPER_ADMIN', 'ADMIN_PENERBIT', 'VERIFIKATOR', 'DISTRIBUTOR', 'PENTASHIH', 'DOKUMENTATOR', 'KEPALA_LPMQ'), validate(emptyAction), action(req => notifications.markNotificationRead(req.params.id, req.user)));

// Pembayaran & Tagihan PNBP (Epic G: PR-VER-05)
router.get('/payments', authenticate, validate(paymentQuerySchema), action(req => payment.listPayments(req.query, req.user)));
router.get('/payments/:id', authenticate, action(req => payment.getPaymentDetail(req.params.id, req.user)));
router.get('/registrations/:id/payment', authenticate, action(req => payment.getRegistrationPayment(req.params.id, req.user)));
router.post('/registrations/:id/payments', authenticate, authorize('VERIFIKATOR'), validate(emptyAction), action(req => payment.createPayment(req.params.id, req.user, req), 201));
router.post('/payments/:id/confirm', authenticate, authorize('ADMIN_PENERBIT'), validate(confirmPaymentSchema), action(req => payment.confirmPayment(req.params.id, req.body, req.user, req)));
router.post('/payments/:id/return', authenticate, authorize('VERIFIKATOR'), validate(returnPaymentSchema), action(req => payment.returnPayment(req.params.id, req.body, req.user, req)));
router.patch('/payments/:id/verify', authenticate, authorize('VERIFIKATOR'), validate(emptyAction), action(req => payment.verifyPayment(req.params.id, req.user, req)));

router.post('/registrations/:id/assignments', authenticate, authorize('HELPER_ADMIN', 'SUPERADMIN', 'DISTRIBUTOR'), validate(assignmentSchema), action(req => distribution.createAssignments(req.params.id, req.body, req.user), 201));
router.get('/assignments/my-tasks', authenticate, authorize('PENTASHIH', 'SUPERADMIN'), validate(myTasksQuerySchema), action(req => distribution.listMyAssignments(req.user, req.query)));
router.get('/distribution-teams/:id/workload', authenticate, authorize('HELPER_ADMIN', 'DISTRIBUTOR'), action(req => distribution.workload(req.params.id, req.user)));
router.post('/assignments/:id/review', authenticate, authorize('PENTASHIH'), validate(reviewSchema), action(req => distribution.recordReview(req.params.id, req.body, req.user), 201));
router.post('/registrations/:id/distribution-review', authenticate, authorize('DISTRIBUTOR'), validate(reviewSchema), action(req => distribution.approveDistribution(req.params.id, req.body, req.user)));
router.post('/registrations/:id/official-documents', authenticate, authorize('DISTRIBUTOR', 'DOKUMENTATOR'), validate(documentSchema), action(req => documents.createDocument(req.params.id, req.body, req.user), 201));
router.post('/official-documents/:id/sign', authenticate, authorize('KEPALA_LPMQ'), validate(emptyAction), action(req => documents.signDocument(req.params.id, req.user)));
router.get('/official-documents/:id/pdf', authenticate, authorize('ADMIN_PENERBIT', 'HELPER_ADMIN', 'DISTRIBUTOR', 'DOKUMENTATOR', 'KEPALA_LPMQ'), async (req, res, next) => {
  try {
    const document = await documents.getDocument(req.params.id, req.user);
    const bytes = await documents.documentPdf(document);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${document.document_no}.pdf"`, 'Cache-Control': 'private, no-store' });
    res.send(bytes);
  } catch (error) { next(error); }
});

router.post('/uploads', authenticate, authorize('ADMIN_PENERBIT', 'VERIFIKATOR', 'DOKUMENTATOR'),
  express.raw({ type: ['application/pdf', 'image/png', 'image/jpeg'], limit: MAX_UPLOAD_BYTES }),
  action(req => upload(req.body, req.get('content-type')?.split(';')[0], req.user), 201));

router.get('/uploads/:id', authenticate, authorize('ADMIN_PENERBIT', 'VERIFIKATOR', 'PENTASHIH', 'DOKUMENTATOR', 'HELPER_ADMIN', 'KEPALA_LPMQ'), async (req, res, next) => {
  try {
    const { file, bytes } = await readPrivateFile(req.params.id, req.user);
    res.set({ 'Content-Type': file.mime_type, 'Content-Disposition': `attachment; filename="${file.id}"`, 'Cache-Control': 'private, no-store' });
    res.send(bytes);
  } catch (error) { next(error); }
});

export default router;
