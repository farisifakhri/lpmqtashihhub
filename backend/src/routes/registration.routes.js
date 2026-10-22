import { Router } from 'express';
import registrationController from '../controllers/registration.controller.js';
import { listDocumentArchive } from '../services/document-archive.service.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { registrationRateLimiter } from '../middlewares/rateLimiter.middleware.js';
import { printingReportSchema } from '../validators/workflow.validator.js';
import {
  createRegistrationSchema,
  dispatchPhysicalSchema,
  transitionStatusSchema,
  createManuscriptFileSchema,
  registrationIdParamSchema,
} from '../validators/registration.validator.js';

const router = Router();

// Semua endpoint pengajuan memerlukan otentikasi
router.use(authenticate);
router.use(authorize('ADMIN_INTERNAL', 'PENERBIT', 'VERIFIKATOR', 'DISTRIBUTOR', 'PENTASHIH', 'KEPALA_LPMQ', 'DOKUMENTATOR'));

// Daftar & Pembuatan Pengajuan
router.get('/', registrationController.listRegistrations);
router.post('/', authorize('PENERBIT'), registrationRateLimiter, validate(createRegistrationSchema), registrationController.createDraft);
router.get('/:id', registrationController.getDetail);
router.get(
  '/:id/receipt-pdf',
  authorize('PENERBIT', 'SUPERADMIN', 'ADMIN_INTERNAL', 'VERIFIKATOR', 'DOKUMENTATOR'),
  validate(registrationIdParamSchema),
  registrationController.downloadReceiptPdf
);
router.get(
  '/:id/shipping-label-pdf',
  authorize('PENERBIT', 'SUPERADMIN', 'ADMIN_INTERNAL', 'VERIFIKATOR', 'DOKUMENTATOR'),
  validate(registrationIdParamSchema),
  registrationController.downloadShippingLabelPdf
);
router.delete(
  '/:id',
  authorize('PENERBIT', 'SUPERADMIN'),
  validate(registrationIdParamSchema),
  registrationController.deleteRegistration
);
router.get('/:id/document-archive', authorize('PENERBIT', 'ADMIN_INTERNAL', 'DOKUMENTATOR', 'VERIFIKATOR', 'KEPALA_LPMQ', 'DISTRIBUTOR', 'PENTASHIH'), async (req, res, next) => {
  try { res.json({ success: true, data: await listDocumentArchive(req.params.id, req.user) }); }
  catch (error) { next(error); }
});

// Berkas Naskah Mushaf (Manuscript Files)
router.get('/:id/manuscripts', registrationController.listManuscriptFiles);
router.post(
  '/:id/manuscripts',
  authorize('PENERBIT'),
  validate(createManuscriptFileSchema),
  registrationController.addManuscriptFile
);

// Aksi workflow submit & transisi status (didukung PATCH dan POST)
router.post('/:id/submit', authorize('PENERBIT'), registrationController.submitRegistration);
router.post('/:id/dispatch-physical', authorize('PENERBIT'), validate(dispatchPhysicalSchema), registrationController.dispatchPhysical);

const transitionRoles = [
  // ADMIN_INTERNAL is intentionally excluded: team assignment is a separate domain action.
  'SUPERADMIN',
  'VERIFIKATOR',
  'DISTRIBUTOR',
  'PENTASHIH',
  'KEPALA_LPMQ',
  'DOKUMENTATOR',
  'PENERBIT',
];

router.patch(
  '/:id/status',
  authorize(...transitionRoles),
  validate(transitionStatusSchema),
  registrationController.transitionStatus
);


// Laporan Realisasi Pencetakan (U-16 / B-10)
router.get('/:id/printing-reports', registrationController.getPrintingReports);
router.post('/:id/printing-reports', authorize('PENERBIT', 'ADMIN_INTERNAL', 'SUPERADMIN'), validate(printingReportSchema), registrationController.createPrintingReport);

router.post(
  '/:id/transition',
  authorize(...transitionRoles),
  validate(transitionStatusSchema),
  registrationController.transitionStatus
);

export default router;
