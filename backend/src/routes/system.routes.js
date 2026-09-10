import { Router } from 'express';
import systemController from '../controllers/system.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// Health check sistem & koneksi database MySQL
router.get('/health', systemController.getHealth);

// Statistik jumlah baris tabel database
router.get('/tables', authenticate, systemController.getTableCounts);

// Diagnostik modul spesifik dan sampel data
router.get('/diagnostics/:module', authenticate, systemController.getModuleDiagnostics);

export default router;
