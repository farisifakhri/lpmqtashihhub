import express, { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { emptyAction, confirmPaymentSchema, returnPaymentSchema, paymentQuerySchema, myTasksQuerySchema, assignmentSchema, juzChecklistSchema, reviewSchema, documentSchema, calendarSchema } from '../validators/workflow.validator.js';
import { updateCalendar, syncNationalHolidays } from '../services/calendar.service.js';
import * as documents from '../services/official-document.service.js';
import * as documentation from '../services/documentation.service.js';
import * as distribution from '../services/distribution.service.js';
import * as payment from '../services/payment.service.js';
import * as notifications from '../services/notification.service.js';
import { upload, MAX_UPLOAD_BYTES, MAX_DOC_BYTES, MAX_APK_BYTES } from '../services/storage.service.js';
import { readPrivateFile } from '../services/private-file.service.js';
import { uploadRateLimiter } from '../middlewares/rateLimiter.middleware.js';
import { documentationArchiveSchema, printingReportSchema } from '../validators/workflow.validator.js';

const router = Router();
const action = (fn, status = 200) => async (req, res, next) => {
  try { res.status(status).json({ success: true, data: await fn(req) }); } catch (error) { next(error); }
};
router.put('/master/working-days', authenticate, authorize('SUPERADMIN'), validate(calendarSchema), action(req => updateCalendar(req.body.days, req.user)));
router.post('/master/working-days/sync-holidays', authenticate, authorize('SUPERADMIN', 'ADMIN_INTERNAL'), action(req => syncNationalHolidays(req.user, req.body?.year ? Number(req.body.year) : 2026)));
router.get('/notifications', authenticate, authorize('ADMIN_INTERNAL', 'PENERBIT', 'VERIFIKATOR', 'DISTRIBUTOR', 'PENTASHIH', 'DOKUMENTATOR', 'KEPALA_LPMQ'), action(req => notifications.listMyNotifications(req.user)));
router.patch('/notifications/:id/read', authenticate, authorize('ADMIN_INTERNAL', 'PENERBIT', 'VERIFIKATOR', 'DISTRIBUTOR', 'PENTASHIH', 'DOKUMENTATOR', 'KEPALA_LPMQ'), validate(emptyAction), action(req => notifications.markNotificationRead(req.params.id, req.user)));

// Pembayaran & Tagihan PNBP (Epic G: PR-VER-05)
router.get('/payments', authenticate, validate(paymentQuerySchema), action(req => payment.listPayments(req.query, req.user)));
router.get('/payments/:id', authenticate, action(req => payment.getPaymentDetail(req.params.id, req.user)));
router.get('/registrations/:id/payment', authenticate, action(req => payment.getRegistrationPayment(req.params.id, req.user)));
router.post('/registrations/:id/payments', authenticate, authorize('VERIFIKATOR'), validate(emptyAction), action(req => payment.createPayment(req.params.id, req.user, req), 201));
router.post('/payments/:id/confirm', authenticate, authorize('PENERBIT'), validate(confirmPaymentSchema), action(req => payment.confirmPayment(req.params.id, req.body, req.user, req)));
router.post('/payments/:id/return', authenticate, authorize('VERIFIKATOR'), validate(returnPaymentSchema), action(req => payment.returnPayment(req.params.id, req.body, req.user, req)));
router.patch('/payments/:id/verify', authenticate, authorize('VERIFIKATOR'), validate(emptyAction), action(req => payment.verifyPayment(req.params.id, req.user, req)));

router.post('/registrations/:id/assignments', authenticate, authorize('ADMIN_INTERNAL', 'SUPERADMIN', 'DISTRIBUTOR'), validate(assignmentSchema), action(req => distribution.createAssignments(req.params.id, req.body, req.user), 201));
router.get('/assignments/my-tasks', authenticate, authorize('PENTASHIH', 'SUPERADMIN'), validate(myTasksQuerySchema), action(req => distribution.listMyAssignments(req.user, req.query)));
router.get('/distribution-teams/:id/workload', authenticate, authorize('ADMIN_INTERNAL', 'DISTRIBUTOR'), action(req => distribution.workload(req.params.id, req.user)));
router.post('/assignments/:id/review', authenticate, authorize('PENTASHIH'), validate(reviewSchema), action(req => distribution.recordReview(req.params.id, req.body, req.user), 201));
router.patch('/assignments/:id/juz/:juzNumber', authenticate, authorize('PENTASHIH'), validate(juzChecklistSchema), action(req => distribution.recordJuzChecklist(req.params.id, req.params.juzNumber, req.body, req.user)));
router.post('/registrations/:id/distribution-review', authenticate, authorize('DISTRIBUTOR'), validate(reviewSchema), action(req => distribution.approveDistribution(req.params.id, req.body, req.user)));

// Alur Penerbitan STT & Dokumen Resmi
router.post('/registrations/:id/official-documents', authenticate, authorize('ADMIN_INTERNAL', 'DISTRIBUTOR', 'DOKUMENTATOR', 'SUPERADMIN'), validate(documentSchema), action(req => documents.createDocument(req.params.id, req.body, req.user), 201));
router.post('/registrations/:id/request-stt', authenticate, authorize('DISTRIBUTOR', 'SUPERADMIN'), action(req => documents.requestSttFromAdmin(req.params.id, req.body, req.user, req)));
router.post('/official-documents/:id/send-to-distributor', authenticate, authorize('ADMIN_INTERNAL', 'SUPERADMIN'), action(req => documents.sendDraftToDistributor(req.params.id, req.user, req)));
router.post('/official-documents/:id/submit-to-tu', authenticate, authorize('DISTRIBUTOR', 'ADMIN_INTERNAL', 'SUPERADMIN'), action(req => documents.submitToTu(req.params.id, req.body, req.user, req)));
router.post('/official-documents/:id/paraf-1', authenticate, authorize('ADMIN_INTERNAL', 'SUPERADMIN', 'KEPALA_LPMQ'), action(req => documents.parafDocument(req.params.id, 1, req.body, req.user, req)));
router.post('/official-documents/:id/paraf-2', authenticate, authorize('ADMIN_INTERNAL', 'SUPERADMIN', 'KEPALA_LPMQ'), action(req => documents.parafDocument(req.params.id, 2, req.body, req.user, req)));
router.post('/official-documents/:id/sign', authenticate, authorize('KEPALA_LPMQ'), validate(emptyAction), action(req => documents.signDocument(req.params.id, req.user, req)));

// Halaman Dokumentator & Pengarsipan Fisik (5 Eksemplar & Lokasi Arsip)
router.get('/registrations/:id/documentation', authenticate, authorize('DOKUMENTATOR', 'ADMIN_INTERNAL', 'KEPALA_LPMQ', 'SUPERADMIN'), action(req => documentation.getDocumentationDetail(req.params.id, req.user)));
router.post('/registrations/:id/documentation', authenticate, authorize('DOKUMENTATOR', 'ADMIN_INTERNAL', 'SUPERADMIN'), validate(documentationArchiveSchema), action(req => documentation.recordDocumentationArchive(req.params.id, req.body, req.user, req)));

// Laporan Realisasi Pencetakan Al-Qur'an oleh Penerbit (U-16 / B-10)
router.get('/registrations/:id/printing-reports', authenticate, authorize('PENERBIT', 'ADMIN_INTERNAL', 'DOKUMENTATOR', 'KEPALA_LPMQ', 'SUPERADMIN'), action(req => documentation.getPrintingReports(req.params.id, req.user)));
router.post('/registrations/:id/printing-reports', authenticate, authorize('PENERBIT', 'ADMIN_INTERNAL', 'SUPERADMIN'), validate(printingReportSchema), action(req => documentation.createPrintingReport(req.params.id, req.body, req.user, req), 201));
router.get('/official-documents/:id/pdf', authenticate, authorize('PENERBIT', 'ADMIN_INTERNAL', 'DISTRIBUTOR', 'DOKUMENTATOR', 'KEPALA_LPMQ'), async (req, res, next) => {
  try {
    const document = await documents.getDocument(req.params.id, req.user);
    const bytes = await documents.documentPdf(document, req.user);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${document.document_no || document.document_type}.pdf"`, 'Cache-Control': 'private, no-store' });
    res.send(bytes);
  } catch (error) { next(error); }
});

router.post('/uploads', uploadRateLimiter, authenticate, authorize('PENERBIT', 'VERIFIKATOR', 'DOKUMENTATOR', 'PENTASHIH', 'DISTRIBUTOR'),
  (req, res, next) => {
    const ctype = req.get('content-type')?.split(';')[0]?.toLowerCase();
    const clen = Number(req.get('content-length'));
    // Pisahkan batas per tipe di parser sebelum ditampung di memori
    if (['application/pdf', 'image/png', 'image/jpeg'].includes(ctype)) {
      if (clen && clen > MAX_DOC_BYTES) {
        return res.status(400).json({
          success: false,
          message: 'Berkas dokumen/gambar melebihi batas ukuran 10 MB. Harap perkecil ukuran berkas, lalu unggah kembali.',
        });
      }
    } else if (['application/vnd.android.package-archive', 'application/octet-stream', 'application/zip', 'application/x-zip-compressed'].includes(ctype)) {
      if (clen && clen > MAX_APK_BYTES) {
        return res.status(400).json({
          success: false,
          message: 'Berkas APK Android melebihi batas ukuran 10 MB. Harap kompres atau gunakan versi yang lebih kecil.',
        });
      }
    }
    next();
  },
  express.raw({
    type: [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'application/vnd.android.package-archive',
      'application/octet-stream',
      'application/zip',
      'application/x-zip-compressed',
    ],
    limit: MAX_UPLOAD_BYTES,
  }),
  action(req => upload(req.body, req.get('content-type')?.split(';')[0], req.user), 201));

router.get('/uploads/:id', authenticate, authorize('PENERBIT', 'VERIFIKATOR', 'PENTASHIH', 'DISTRIBUTOR', 'DOKUMENTATOR', 'ADMIN_INTERNAL', 'KEPALA_LPMQ', 'SUPERADMIN'), async (req, res, next) => {
  try {
    const { file, bytes } = await readPrivateFile(req.params.id, req.user);
    res.set({
      'Content-Type': file.mime_type,
      'Content-Disposition': `attachment; filename="${file.id}"`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    });
    res.send(bytes);
  } catch (error) { next(error); }
});

export default router;
