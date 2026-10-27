import { Router } from 'express';
import multer from 'multer';
import * as regulationController from '../controllers/regulation.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createRegulationSchema,
  updateRegulationSchema,
  listRegulationQuerySchema,
} from '../validators/regulation.validator.js';

const router = Router();

// Konfigurasi Multer untuk berkas PDF regulasi (15 MB in-memory)
const uploadRegulationFile = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Hanya berkas berformat PDF resmi yang diperbolehkan untuk dokumen regulasi.'));
    }
  },
});

// Middleware autentikasi untuk pengelola (Superadmin & Helper Admin)
const adminAuth = [authenticate, authorize('ADMIN_INTERNAL', 'SUPERADMIN')];

// ---------------------------------------------------------------------------
// 1. Endpoint Publik
// ---------------------------------------------------------------------------

// A. Daftar Dokumen Regulasi Publik
router.get(
  '/regulations',
  validate(listRegulationQuerySchema),
  regulationController.getPublicRegulations
);

// B. 7 Master Kategori Dokumen Regulasi
router.get(
  '/regulations/categories',
  regulationController.getCategories
);

// C. Detail Dokumen Regulasi Publik
router.get(
  '/regulations/:id',
  regulationController.getPublicRegulationDetail
);

// D. Pratinjau / Baca Dokumen PDF (Inline)
router.get(
  '/regulations/:id/view',
  regulationController.viewRegulationFile
);

// E. Unduh Dokumen PDF (Attachment)
router.get(
  '/regulations/:id/download',
  regulationController.downloadRegulationFile
);

// ---------------------------------------------------------------------------
// 2. Endpoint Internal Admin (Super Admin & Helper Admin)
// ---------------------------------------------------------------------------

// F. Ringkasan Statistik Regulasi
router.get(
  '/admin/regulations/summary',
  ...adminAuth,
  regulationController.getAdminSummary
);

// G. Daftar Dokumen Regulasi Admin
router.get(
  '/admin/regulations',
  ...adminAuth,
  validate(listRegulationQuerySchema),
  regulationController.getAdminRegulations
);

// H. Tambah Dokumen Regulasi Baru (Multipart: file + metadata)
router.post(
  '/admin/regulations',
  ...adminAuth,
  uploadRegulationFile.single('file'),
  validate(createRegulationSchema),
  regulationController.createRegulation
);

// I. Perbarui Metadata & Berkas Dokumen Regulasi (Multipart / JSON)
router.put(
  '/admin/regulations/:id',
  ...adminAuth,
  uploadRegulationFile.single('file'),
  validate(updateRegulationSchema),
  regulationController.updateRegulation
);

// J. Hapus Dokumen Regulasi
router.delete(
  '/admin/regulations/:id',
  ...adminAuth,
  regulationController.deleteRegulation
);

export default router;

