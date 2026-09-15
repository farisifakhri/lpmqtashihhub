import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';
import * as reportService from '../services/verification-report.service.js';

const router = Router();

const action = (fn, status = 200) => async (req, res, next) => {
  try {
    const data = await fn(req);
    res.status(status).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// 1. Laporan Kinerja & SLA Verifikasi (Epic I: VER-I06)
router.get(
  '/reports/verification-performance',
  authenticate,
  authorize('SUPERADMIN', 'ADMIN', 'KEPALA_LPMQ', 'VERIFIKATOR'),
  action((req) => reportService.getVerificationPerformanceReport(req.query, req.user))
);

// 2. Timeline Status Lintas Peran dengan Sanitasi Otomatis (Epic I: VER-I05)
router.get(
  '/registrations/:id/timeline',
  authenticate,
  authorize('ADMIN_PENERBIT', 'SUPERADMIN', 'ADMIN', 'VERIFIKATOR', 'DISTRIBUTOR', 'PENTASHIH', 'DOKUMENTATOR', 'KEPALA_LPMQ'),
  action((req) => reportService.getRegistrationTimeline(req.params.id, req.user))
);

export default router;

