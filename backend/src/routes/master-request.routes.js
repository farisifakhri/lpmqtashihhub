import { Router } from 'express';
import multer from 'multer';
import * as controller from '../controllers/master-request.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { masterRequestRateLimiter } from '../middlewares/rateLimiter.middleware.js';
import {
  createMasterRequestSchema,
  listMasterRequestsSchema,
  masterLetterSchema,
  rejectMasterRequestSchema,
} from '../validators/master-request.validator.js';

const router = Router();

// Berkas ditampung di memori lalu divalidasi ketat (PDF, maks. 500 KB) oleh secure-document service
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024, files: 2, fields: 30 },
});
const uploadDocs = upload.fields([
  { name: 'surat_permohonan', maxCount: 1 },
  { name: 'profil_pemohon', maxCount: 1 },
]);

// ---------------------------------------------------------------------------
// Data referensi (publik, tanpa data pribadi)
// ---------------------------------------------------------------------------
router.get('/regions/provinces', controller.listProvinces);
router.get('/regions/provinces/:kode/regencies', controller.listRegencies);
router.get('/regions/regencies/:kode/districts', controller.listDistricts);
router.get('/master-requests/mushaf-types', controller.listMushafTypes);

// ---------------------------------------------------------------------------
// Penerbit terdaftar
// ---------------------------------------------------------------------------
const publisherAuth = [authenticate, authorize('PENERBIT')];

router.get('/publisher/master-requests', ...publisherAuth, controller.listMine);
router.post(
  '/publisher/master-requests',
  ...publisherAuth,
  masterRequestRateLimiter,
  uploadDocs,
  validate(createMasterRequestSchema),
  controller.createRequest
);
router.get('/publisher/master-requests/:id', ...publisherAuth, controller.getMine);
router.get('/publisher/master-requests/:id/letter', ...publisherAuth, controller.getMyLetter);

// ---------------------------------------------------------------------------
// Admin (ADMIN_INTERNAL, SUPERADMIN)
// ---------------------------------------------------------------------------
const adminAuth = [authenticate, authorize('ADMIN_INTERNAL', 'SUPERADMIN')];

router.get('/admin/master-requests', ...adminAuth, validate(listMasterRequestsSchema), controller.listAdmin);
router.get('/admin/master-requests/:id', ...adminAuth, controller.getAdminDetail);
router.get('/admin/master-requests/:id/documents/:documentId', ...adminAuth, controller.getDocument);
router.get('/admin/master-requests/:id/letter', ...adminAuth, controller.getInternalLetter);
router.post('/admin/master-requests/:id/reject', ...adminAuth, validate(rejectMasterRequestSchema), controller.reject);
router.post('/admin/master-requests/:id/letter', ...adminAuth, validate(masterLetterSchema), controller.submitLetter);
router.post('/admin/master-requests/:id/send', ...adminAuth, controller.sendToPublisher);

// ---------------------------------------------------------------------------
// Kepala LPMQ — Pusat Tanda Tangan (TTE)
// ---------------------------------------------------------------------------
const headAuth = [authenticate, authorize('KEPALA_LPMQ')];

router.get('/signatures/master-letters', ...headAuth, controller.listForSignature);
router.get('/signatures/master-letters/:id/pdf', ...headAuth, controller.getInternalLetter);
router.post('/signatures/master-letters/:id/sign', ...headAuth, controller.sign);

export default router;
