import { Router } from 'express';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import publicController from '../controllers/public.controller.js';
import { publicVerification } from '../services/verification-document-pdf.service.js';

const router = Router();

// Endpoint verifikasi publik tanpa otentikasi
router.get('/verify-document/:token', publicController.verifyDocumentByQrToken);
const qrLimit = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false });
router.get('/verify-internal/:token', qrLimit, async (req, res, next) => {
  try { res.json({ success: true, data: await publicVerification(req.params.token) }); }
  catch (error) { next(error); }
});
router.post('/verify-internal/:token/check-file', qrLimit, express.raw({ type: 'application/pdf', limit: '10mb' }), async (req, res, next) => {
  try {
    if (!Buffer.isBuffer(req.body) || req.body.length < 5 || req.body.subarray(0, 5).toString() !== '%PDF-') {
      return res.status(400).json({ success: false, message: 'Unggah berkas PDF untuk dibandingkan dengan arsip.' });
    }
    return res.json({ success: true, data: await publicVerification(req.params.token, req.body) });
  } catch (error) { return next(error); }
});

export default router;
