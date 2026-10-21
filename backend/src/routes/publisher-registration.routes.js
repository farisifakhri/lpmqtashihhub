import { Router } from 'express';
import multer from 'multer';
import * as publisherRegistrationController from '../controllers/publisher-registration.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  publisherRegistrationRateLimiter,
  publisherStatusCheckRateLimiter,
} from '../middlewares/rateLimiter.middleware.js';
import {
  createPublisherRegistrationSchema,
  checkPublisherRegistrationStatusSchema,
  decisionPublisherRegistrationSchema,
} from '../validators/publisher-registration.validator.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 3 * 1024 * 1024, // 3 MB max payload per file, detail validation enforced by secure-document service
  },
});

const uploadPublisherDocs = upload.fields([
  { name: 'dokumen_surat_pendaftaran', maxCount: 1 },
  { name: 'dokumen_akta_notaris', maxCount: 1 },
  { name: 'dokumen_profil', maxCount: 1 },
  { name: 'dokumen_npwp', maxCount: 1 },
  { name: 'dokumen_nib', maxCount: 1 },
  { name: 'dokumen_ktp', maxCount: 1 },
]);

// ---------------------------------------------------------------------------
// Endpoint Publik
// ---------------------------------------------------------------------------

// 1. Pendaftaran Baru (Multipart)
router.post(
  '/publisher-registrations',
  publisherRegistrationRateLimiter,
  uploadPublisherDocs,
  validate(createPublisherRegistrationSchema),
  publisherRegistrationController.registerPublisher
);

// 2. Cek Status Pendaftaran (POST dengan body JSON)
router.post(
  '/publisher-registrations/check-status',
  publisherStatusCheckRateLimiter,
  validate(checkPublisherRegistrationStatusSchema),
  publisherRegistrationController.checkStatus
);

// 3. Muat Data Perbaikan (Tautan Sekali Pakai)
router.get(
  '/publisher-registrations/revision/:token',
  publisherRegistrationController.getRevision
);

// 4. Kirim Ulang Perbaikan Data / Berkas (Multipart)
router.put(
  '/publisher-registrations/revision/:token',
  uploadPublisherDocs,
  publisherRegistrationController.submitRevision
);

// ---------------------------------------------------------------------------
// Endpoint Internal Admin (SUPERADMIN, ADMIN_INTERNAL)
// ---------------------------------------------------------------------------

const adminAuth = [authenticate, authorize('ADMIN_INTERNAL', 'SUPERADMIN')];

// 5. Daftar Pendaftaran Penerbit
router.get(
  '/admin/publisher-registrations',
  ...adminAuth,
  publisherRegistrationController.listRegistrations
);

// 6. Detail Pendaftaran Penerbit
router.get(
  '/admin/publisher-registrations/:id',
  ...adminAuth,
  publisherRegistrationController.getRegistrationDetail
);

// 7. Unduh Dokumen Persyaratan
router.get(
  '/admin/publisher-registrations/:id/documents/:documentId',
  ...adminAuth,
  publisherRegistrationController.getDocument
);

// 8. Keputusan Pendaftaran (SETUJUI, PERLU_PERBAIKAN, TOLAK)
router.post(
  '/admin/publisher-registrations/:id/decision',
  ...adminAuth,
  validate(decisionPublisherRegistrationSchema),
  publisherRegistrationController.decideRegistration
);

// 9. Unduh / Lihat Sertifikat Penerbit (U-06)
router.get(
  '/admin/publisher-registrations/:id/certificate',
  ...adminAuth,
  publisherRegistrationController.getCertificate
);

router.get(
  '/publisher-registrations/:id/certificate',
  publisherRegistrationController.getCertificate
);

export default router;
