import express, { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { emptyAction, confirmPaymentSchema, assignmentSchema, reviewSchema, documentSchema, calendarSchema } from '../validators/workflow.validator.js';
import { updateCalendar } from '../services/calendar.service.js';
import * as documents from '../services/official-document.service.js';
import * as distribution from '../services/distribution.service.js';
import * as payment from '../services/payment.service.js';
import { upload, MAX_UPLOAD_BYTES, readStoredFile } from '../services/storage.service.js';
import { prisma } from '../config/database.js';
import { fail } from '../services/workflow-utils.js';
import { assertManuscriptAccess } from '../services/file-access.service.js';

const router = Router();
const action = (fn, status = 200) => async (req, res, next) => {
  try { res.status(status).json({ success: true, data: await fn(req) }); } catch (error) { next(error); }
};
router.put('/master/working-days', authenticate, authorize('SUPERADMIN'), validate(calendarSchema), action(req => updateCalendar(req.body.days, req.user)));
router.get('/notifications', authenticate, authorize('ADMIN_PENERBIT', 'VERIFIKATOR', 'DISTRIBUTOR', 'PENTASHIH', 'DOKUMENTATOR', 'KEPALA_LPMQ'), action(req => prisma.notification.findMany({ where: { user_id: req.user.id }, orderBy: { created_at: 'desc' }, take: 50 })));
router.patch('/notifications/:id/read', authenticate, authorize('ADMIN_PENERBIT', 'VERIFIKATOR', 'DISTRIBUTOR', 'PENTASHIH', 'DOKUMENTATOR', 'KEPALA_LPMQ'), validate(emptyAction), action(async req => {
  const notification = await prisma.notification.findFirst({ where: { id: req.params.id, user_id: req.user.id } });
  if (!notification) fail(404, 'Notifikasi tidak ditemukan.');
  await prisma.notification.updateMany({ where: { id: notification.id, user_id: req.user.id, read_at: null }, data: { read_at: new Date() } });
  return prisma.notification.findUnique({ where: { id: notification.id } });
}));

router.post('/registrations/:id/payments', authenticate, authorize('VERIFIKATOR'), validate(emptyAction), action(req => payment.createPayment(req.params.id, req.user), 201));
router.post('/payments/:id/confirm', authenticate, authorize('ADMIN_PENERBIT'), validate(confirmPaymentSchema), action(req => payment.confirmPayment(req.params.id, req.body, req.user)));
router.patch('/payments/:id/verify', authenticate, authorize('VERIFIKATOR'), validate(emptyAction), action(req => payment.verifyPayment(req.params.id, req.user)));
router.post('/registrations/:id/assignments', authenticate, authorize('DISTRIBUTOR'), validate(assignmentSchema), action(req => distribution.createAssignments(req.params.id, req.body, req.user), 201));
router.get('/distribution-teams/:id/workload', authenticate, authorize('DISTRIBUTOR'), action(req => distribution.workload(req.params.id, req.user)));
router.post('/assignments/:id/review', authenticate, authorize('PENTASHIH'), validate(reviewSchema), action(req => distribution.recordReview(req.params.id, req.body, req.user), 201));
router.post('/registrations/:id/distribution-review', authenticate, authorize('DISTRIBUTOR'), validate(reviewSchema), action(req => distribution.approveDistribution(req.params.id, req.body, req.user)));
router.post('/registrations/:id/official-documents', authenticate, authorize('DISTRIBUTOR', 'DOKUMENTATOR'), validate(documentSchema), action(req => documents.createDocument(req.params.id, req.body, req.user), 201));
router.post('/official-documents/:id/sign', authenticate, authorize('KEPALA_LPMQ'), validate(emptyAction), action(req => documents.signDocument(req.params.id, req.user)));
router.get('/official-documents/:id/pdf', authenticate, authorize('ADMIN_PENERBIT', 'DISTRIBUTOR', 'DOKUMENTATOR', 'KEPALA_LPMQ'), async (req, res, next) => {
  try {
    const document = await documents.getDocument(req.params.id, req.user);
    const bytes = await documents.renderDraft(document);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${document.document_no}.pdf"`, 'Cache-Control': 'private, no-store' });
    res.send(bytes);
  } catch (error) { next(error); }
});

router.post('/uploads', authenticate, authorize('ADMIN_PENERBIT', 'VERIFIKATOR', 'DOKUMENTATOR'),
  express.raw({ type: ['application/pdf', 'image/png', 'image/jpeg'], limit: MAX_UPLOAD_BYTES }),
  action(req => upload(req.body, req.get('content-type')?.split(';')[0], req.user), 201));

router.get('/uploads/:id', authenticate, authorize('ADMIN_PENERBIT', 'VERIFIKATOR', 'PENTASHIH', 'DOKUMENTATOR'), async (req, res, next) => {
  try {
    const file = await prisma.storedFile.findUnique({ where: { id: req.params.id } });
    if (!file) fail(404, 'Berkas tidak ditemukan.');
    if (file.owner_id !== req.user.id && !req.user.roles.includes('SUPERADMIN')) {
      const manuscript = await prisma.manuscriptFile.findFirst({ where: { file_id: file.id }, include: { registration: true } });
      if (manuscript) await assertManuscriptAccess(manuscript.registration, req.user);
      else {
        const receipt = await prisma.paymentRecord.findFirst({ where: { receipt_file_id: file.id, status: 'PAID' } });
        if (!receipt || !req.user.roles.includes('VERIFIKATOR')) fail(403, 'Akses berkas ditolak.');
      }
    }
    res.set({ 'Content-Type': file.mime_type, 'Content-Disposition': `attachment; filename="${file.id}"`, 'Cache-Control': 'private, no-store' });
    res.send(await readStoredFile(file.id));
  } catch (error) { next(error); }
});

export default router;
