import { Router } from 'express';
import multer from 'multer';
import * as informationGuideController from '../controllers/information-guide.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createInformationGuideSchema,
  informationGuideIdSchema,
  informationGuideImageParamsSchema,
  listInformationGuidesSchema,
  updateInformationGuideSchema,
} from '../validators/information-guide.validator.js';

const router = Router();
const adminAuth = [authenticate, authorize('ADMIN_INTERNAL', 'SUPERADMIN')];

const uploadDocument = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (['.pdf', '.doc', '.docx'].includes(file.originalname.slice(file.originalname.lastIndexOf('.')).toLowerCase())) {
      callback(null, true);
      return;
    }
    callback(Object.assign(new Error('Hanya format PDF, DOC, atau DOCX yang dapat diunggah.'), { statusCode: 400 }));
  },
});

const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (['.png', '.jpg', '.jpeg', '.webp'].includes(file.originalname.slice(file.originalname.lastIndexOf('.')).toLowerCase())) {
      callback(null, true);
      return;
    }
    callback(Object.assign(new Error('Hanya format gambar PNG, JPEG, atau WebP yang dapat diunggah.'), { statusCode: 400 }));
  },
});

router.get('/information-guides', validate(listInformationGuidesSchema), informationGuideController.listPublicInformationGuides);
router.get('/information-guides/images/:imageId', validate(informationGuideImageParamsSchema), informationGuideController.getPublicInformationGuideImage);
router.get('/information-guides/:id/file', validate(informationGuideIdSchema), informationGuideController.getPublicInformationGuideFile);
router.get('/information-guides/:id/download', validate(informationGuideIdSchema), informationGuideController.downloadPublicInformationGuideFile);
router.get('/information-guides/:id', validate(informationGuideIdSchema), informationGuideController.getPublicInformationGuide);

router.get('/admin/information-guides', ...adminAuth, validate(listInformationGuidesSchema), informationGuideController.listAdminInformationGuides);
router.get('/admin/information-guides/images/:imageId', ...adminAuth, validate(informationGuideImageParamsSchema), informationGuideController.getAdminInformationGuideImage);
router.get('/admin/information-guides/:id/file', ...adminAuth, validate(informationGuideIdSchema), informationGuideController.getAdminInformationGuideFile);
router.get('/admin/information-guides/:id/download', ...adminAuth, validate(informationGuideIdSchema), informationGuideController.downloadAdminInformationGuideFile);
router.get('/admin/information-guides/:id', ...adminAuth, validate(informationGuideIdSchema), informationGuideController.getAdminInformationGuide);
router.post(
  '/admin/information-guides',
  ...adminAuth,
  uploadDocument.single('file'),
  validate(createInformationGuideSchema),
  informationGuideController.createInformationGuide
);
router.post(
  '/admin/information-guides/:id/images',
  ...adminAuth,
  validate(informationGuideIdSchema),
  uploadImage.single('file'),
  informationGuideController.addInformationGuideImage
);
router.put(
  '/admin/information-guides/:id',
  ...adminAuth,
  validate(informationGuideIdSchema),
  uploadDocument.single('file'),
  validate(updateInformationGuideSchema),
  informationGuideController.updateInformationGuide
);
router.delete(
  '/admin/information-guides/:id',
  ...adminAuth,
  validate(informationGuideIdSchema),
  informationGuideController.deleteInformationGuide
);

export default router;
