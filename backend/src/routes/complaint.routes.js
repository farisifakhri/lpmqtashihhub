import { Router } from 'express';
import multer from 'multer';
import * as controller from '../controllers/complaint.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  captchaRateLimiter,
  complaintSubmitRateLimiter,
  complaintTrackRateLimiter,
} from '../middlewares/rateLimiter.middleware.js';
import {
  COMPLAINT_MAX_ERROR_ITEMS,
  COMPLAINT_MAX_FILE_BYTES,
  acceptComplaintSchema,
  createPrintErrorComplaintSchema,
  createServiceComplaintSchema,
  finalReportSchema,
  listComplaintsSchema,
  rejectComplaintSchema,
  trackComplaintSchema,
  updateComplaintStatusSchema,
} from '../validators/complaint.validator.js';

const router = Router();

// Berkas ditampung di memori lalu divalidasi berdasarkan isinya (JPG/PNG/PDF, maks. 2 MB) oleh complaint service
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: COMPLAINT_MAX_FILE_BYTES, files: COMPLAINT_MAX_ERROR_ITEMS + 2, fields: 40, fieldSize: 200 * 1024 },
});
const uploadPrintErrorFiles = upload.fields([
  { name: 'gambar_surat_tashih', maxCount: 1 },
  { name: 'gambar_cover', maxCount: 1 },
  { name: 'gambar_kesalahan', maxCount: COMPLAINT_MAX_ERROR_ITEMS },
]);

// ---------------------------------------------------------------------------
// Publik (tanpa login): referensi, CAPTCHA, kirim pengaduan, lacak pengaduan
// ---------------------------------------------------------------------------
router.get('/complaints/reference', controller.getReference);
router.get('/complaints/captcha', captchaRateLimiter, controller.getCaptcha);
router.post(
  '/complaints/print-errors',
  complaintSubmitRateLimiter,
  uploadPrintErrorFiles,
  validate(createPrintErrorComplaintSchema),
  controller.createPrintError
);
router.post(
  '/complaints/services',
  complaintSubmitRateLimiter,
  upload.none(),
  validate(createServiceComplaintSchema),
  controller.createService
);
// POST agar kode pengaduan tidak tercatat pada URL/log akses
router.post('/complaints/track', complaintTrackRateLimiter, validate(trackComplaintSchema), controller.track);

// ---------------------------------------------------------------------------
// Admin: Helper Admin (ADMIN_INTERNAL) & SUPERADMIN — menu Kelola Landing Page > Pengaduan
// ---------------------------------------------------------------------------
const adminAuth = [authenticate, authorize('ADMIN_INTERNAL', 'SUPERADMIN')];

router.get('/admin/complaints', ...adminAuth, validate(listComplaintsSchema), controller.listAdmin);
router.get('/admin/complaints/:id', ...adminAuth, controller.getAdminDetail);
router.get('/admin/complaints/:id/attachments/:attachmentId', ...adminAuth, controller.getAttachment);
router.post('/admin/complaints/:id/accept', ...adminAuth, validate(acceptComplaintSchema), controller.accept);
router.post('/admin/complaints/:id/reject', ...adminAuth, validate(rejectComplaintSchema), controller.reject);
router.post('/admin/complaints/:id/status', ...adminAuth, validate(updateComplaintStatusSchema), controller.updateStatus);
router.post('/admin/complaints/:id/final-report', ...adminAuth, validate(finalReportSchema), controller.finalReport);

export default router;
