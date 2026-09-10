import { Router } from 'express';
import systemController from '../controllers/system.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';

const router = Router();

// Health check sistem & koneksi database MySQL (publik / load-balancer monitoring)
router.get('/health', systemController.getHealth);

// Statistik jumlah baris tabel database (khusus SUPERADMIN)
router.get('/tables', authenticate, authorize('SUPERADMIN'), systemController.getTableCounts);

// Diagnostik modul spesifik dan sampel data (khusus SUPERADMIN untuk mencegah data leak)
router.get('/diagnostics/:module', authenticate, authorize('SUPERADMIN'), systemController.getModuleDiagnostics);

export default router;
