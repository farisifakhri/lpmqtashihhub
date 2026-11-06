import { Router } from 'express';
import multer from 'multer';
import * as controller from '../controllers/service-document.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createServiceDocumentSchema,
  listServiceDocumentsSchema,
  serviceDocumentIdSchema,
  updateServiceDocumentSchema,
} from '../validators/service-document.validator.js';

const router = Router();
const adminAuth = [authenticate, authorize('ADMIN_INTERNAL', 'SUPERADMIN')];
const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (file.originalname.toLowerCase().endsWith('.pdf')) {
      callback(null, true);
      return;
    }
    callback(Object.assign(new Error('Hanya dokumen PDF yang dapat diunggah.'), { statusCode: 400 }));
  },
});

router.get('/service-documents', validate(listServiceDocumentsSchema), controller.listPublicServiceDocuments);
router.get(
  '/service-documents/:id/download',
  validate(serviceDocumentIdSchema),
  controller.downloadPublicServiceDocument
);
router.get(
  '/admin/service-documents',
  ...adminAuth,
  validate(listServiceDocumentsSchema),
  controller.listAdminServiceDocuments
);
router.get(
  '/admin/service-documents/:id/download',
  ...adminAuth,
  validate(serviceDocumentIdSchema),
  controller.downloadAdminServiceDocument
);
router.post(
  '/admin/service-documents',
  ...adminAuth,
  uploadPdf.single('file'),
  validate(createServiceDocumentSchema),
  controller.createServiceDocument
);
router.put(
  '/admin/service-documents/:id',
  ...adminAuth,
  validate(serviceDocumentIdSchema),
  uploadPdf.single('file'),
  validate(updateServiceDocumentSchema),
  controller.updateServiceDocument
);
router.delete(
  '/admin/service-documents/:id',
  ...adminAuth,
  validate(serviceDocumentIdSchema),
  controller.deleteServiceDocument
);

export default router;
