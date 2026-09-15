import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import * as handoverService from '../services/handover.service.js';
import {
  createHandoverSchema,
  receiveHandoverSchema,
  returnHandoverSchema,
  handoverQuerySchema,
} from '../validators/handover.validator.js';

const router = Router();

const action = (fn, status = 200) => async (req, res, next) => {
  try {
    const data = await fn(req);
    res.status(status).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// 1. Verifikator mencatat penyerahan master fisik kepada Distributor (Langkah 7 SOP)
router.post(
  '/registrations/:id/physical-master/handovers',
  authenticate,
  authorize('VERIFIKATOR', 'SUPERADMIN'),
  validate(createHandoverSchema),
  action((req) => handoverService.createHandover(req.params.id, req.body, req.user, req), 201)
);

// 2. Riwayat serah-terima fisik per registrasi
router.get(
  '/registrations/:id/physical-master/handovers',
  authenticate,
  action((req) => handoverService.getRegistrationHandovers(req.params.id, req.user))
);

// 3. Antrean serah-terima master fisik (Inbox Distributor & Verifikator)
router.get(
  '/physical-master/handovers',
  authenticate,
  authorize('DISTRIBUTOR', 'VERIFIKATOR', 'KEPALA_LPMQ', 'SUPERADMIN'),
  validate(handoverQuerySchema),
  action((req) => handoverService.listHandovers(req.query, req.user))
);

// 4. Detail satu serah-terima fisik
router.get(
  '/physical-master/handovers/:id',
  authenticate,
  action((req) => handoverService.getHandoverDetail(req.params.id, req.user))
);

// 5. Distributor mengonfirmasi penerimaan fisik dan tenggat pentashihan (Langkah 8 SOP)
router.post(
  '/physical-master/handovers/:id/receive',
  authenticate,
  authorize('DISTRIBUTOR'),
  validate(receiveHandoverSchema),
  action((req) => handoverService.receiveHandover(req.params.id, req.body, req.user, req))
);

// 6. Distributor mengembalikan master fisik cacat / tidak sesuai
router.post(
  '/physical-master/handovers/:id/return',
  authenticate,
  authorize('DISTRIBUTOR'),
  validate(returnHandoverSchema),
  action((req) => handoverService.returnHandover(req.params.id, req.body, req.user, req))
);

// 7. Daftar petugas Distributor aktif (untuk dropdown pilihan Verifikator)
router.get(
  '/master/distributors',
  authenticate,
  authorize('VERIFIKATOR', 'KEPALA_LPMQ', 'SUPERADMIN'),
  action(() => handoverService.listDistributors())
);

export default router;

