import { Router } from 'express';
import publicController from '../controllers/public.controller.js';

const router = Router();

// Endpoint verifikasi publik tanpa otentikasi
router.get('/verify-document/:token', publicController.verifyDocumentByQrToken);

export default router;
