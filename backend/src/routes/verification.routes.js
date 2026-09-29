import { Router } from 'express';
import { readVerifiedPdf, renderVerificationPdf } from '../services/verification-document-pdf.service.js';
import { renderPhysicalMasterReceiptPdf } from '../services/physical-master-receipt-pdf.service.js';
import { readStoredFile } from '../services/storage.service.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import * as intake from '../services/verification-intake.service.js';
import * as review from '../services/verification-review.service.js';
import {
  registrationIdSchema,
  declarePhysicalMasterSchema,
  receivePhysicalMasterSchema,
  createVerificationAssignmentSchema,
  verificationInboxSchema,
  assignmentIdSchema,
  saveChecklistSchema,
  verificationDraftSchema,
  verificationAttachmentSchema,
  documentIdSchema,
  returnVerificationSchema,
  sendVerificationSchema,
  revokeAssignmentSchema,
  reassignAssignmentSchema,
  latestAssignmentSchema,
} from '../validators/verification.validator.js';

const router = Router();
const action = (fn, status = 200) => async (req, res, next) => {
  try { res.status(status).json({ success: true, data: await fn(req) }); }
  catch (error) { next(error); }
};

router.put('/registrations/:id/physical-master', authenticate, authorize('ADMIN_PENERBIT'), validate(declarePhysicalMasterSchema), action(req => intake.declarePhysicalMaster(req.params.id, req.body, req.user, req)));
router.post('/registrations/:id/physical-master/receive', authenticate, authorize('HELPER_ADMIN', 'SUPERADMIN'), validate(receivePhysicalMasterSchema), action(req => intake.receivePhysicalMaster(req.params.id, req.body, req.user, req)));
router.get('/registrations/:id/receipt', authenticate, validate(registrationIdSchema), action(req => intake.getRegistrationReceipt(req.params.id, req.user)));
router.get('/registrations/:id/physical-master/receipt-pdf', authenticate, validate(registrationIdSchema), async (req, res, next) => {
  try {
    const receipt = await intake.getPhysicalMasterReceipt(req.params.id, req.user);
    const bytes = await renderPhysicalMasterReceiptPdf(receipt);
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `inline; filename="tanda-terima-${receipt.registration_no}.pdf"`);
    res.set('Cache-Control', 'private, no-store');
    res.send(bytes);
  } catch (error) { next(error); }
});
router.get('/registrations/:id/latest-verification-assignment', authenticate, authorize('KEPALA_LPMQ', 'VERIFIKATOR', 'HELPER_ADMIN', 'SUPERADMIN'), validate(latestAssignmentSchema), action(req => review.getLatestVerificationAssignment(req.params.id, req.user)));
router.post('/registrations/:id/verification-assignments', authenticate, authorize('HELPER_ADMIN', 'SUPERADMIN'), validate(createVerificationAssignmentSchema), action(req => intake.createVerificationAssignment(req.params.id, req.body, req.user, req), 201));
router.get('/verification-assignments', authenticate, authorize('KEPALA_LPMQ', 'VERIFIKATOR', 'HELPER_ADMIN', 'SUPERADMIN'), validate(verificationInboxSchema), action(req => intake.listVerificationAssignments(req.query, req.user)));
router.get('/verification/verifiers', authenticate, authorize('HELPER_ADMIN', 'SUPERADMIN'), action(req => intake.listVerifiers(req.query, req.user)));
router.get('/verification-verifiers', authenticate, authorize('HELPER_ADMIN', 'SUPERADMIN'), action(req => intake.listVerifiers(req.query, req.user)));
router.get('/verification/unassigned-registrations', authenticate, authorize('HELPER_ADMIN', 'SUPERADMIN'), action(req => intake.listUnassignedRegistrations(req.query, req.user)));
router.get('/verification-assignment-candidates', authenticate, authorize('HELPER_ADMIN', 'SUPERADMIN'), action(req => intake.listUnassignedRegistrations(req.query, req.user)));

// PR-VER-03: Pemeriksaan berkas & penyusunan draf surat hasil verifikasi (Epic D)
router.patch('/verification-assignments/:id/start', authenticate, authorize('VERIFIKATOR'), validate(assignmentIdSchema), action(req => review.startVerification(req.params.id, req.user, req)));
router.get('/verification-assignments/:id', authenticate, authorize('KEPALA_LPMQ', 'VERIFIKATOR', 'HELPER_ADMIN', 'SUPERADMIN'), validate(assignmentIdSchema), action(req => review.getVerificationAssignmentDetail(req.params.id, req.user)));
router.post('/verification-assignments/:id/revoke', authenticate, authorize('HELPER_ADMIN', 'SUPERADMIN'), validate(revokeAssignmentSchema), action(req => review.revokeVerificationAssignment(req.params.id, req.body, req.user, req)));
router.post('/verification-assignments/:id/reassign', authenticate, authorize('HELPER_ADMIN', 'SUPERADMIN'), validate(reassignAssignmentSchema), action(req => review.reassignVerificationAssignment(req.params.id, req.body, req.user, req)));
router.put('/verification-assignments/:id/checklist', authenticate, authorize('VERIFIKATOR'), validate(saveChecklistSchema), action(req => review.saveVerificationDraft(req.params.id, req.body, req.user, req)));
router.post('/verification-assignments/:id/result-drafts', authenticate, authorize('VERIFIKATOR'), validate(verificationDraftSchema), action(req => review.submitVerificationDraft(req.params.id, req.body, req.user, req), 201));
router.get('/verification-documents/:documentId/attachments/:fileId', authenticate, validate(verificationAttachmentSchema), async (req, res, next) => {
  try {
    const file = await review.getVerificationAttachment(req.params.documentId, req.params.fileId, req.user);
    res.set({ 'Content-Type': file.mime_type, 'Content-Disposition': `inline; filename="lampiran-${file.id}.pdf"`, 'Cache-Control': 'private, no-store' });
    res.send(await readStoredFile(file.id));
  } catch (error) { next(error); }
});

// PR-VER-04: Persetujuan Kepala LPMQ (Epic E) & Pengiriman Hasil Verifikasi (Epic F)
router.post('/verification-documents/:id/sign', authenticate, authorize('VERIFIKATOR', 'KEPALA_LPMQ'), validate(documentIdSchema), action(req => review.signVerificationDocumentHandler(req.params.id, req.user, req)));
router.post('/verification-documents/:id/retry-email', authenticate, authorize('VERIFIKATOR'), validate(documentIdSchema), action(req => review.retryVerificationEmail(req.params.id, req.user, req)));

router.post('/verification-documents/:id/approve', authenticate, authorize('KEPALA_LPMQ'), validate(documentIdSchema), action(req => review.approveVerificationDocument(req.params.id, req.user, req)));
router.post('/verification-results/:id/approve', authenticate, authorize('KEPALA_LPMQ'), validate(documentIdSchema), action(req => review.approveVerificationDocument(req.params.id, req.user, req)));

router.post('/verification-documents/:id/return', authenticate, authorize('KEPALA_LPMQ'), validate(returnVerificationSchema), action(req => review.returnVerificationDocument(req.params.id, req.body, req.user, req)));
router.post('/verification-results/:id/return', authenticate, authorize('KEPALA_LPMQ'), validate(returnVerificationSchema), action(req => review.returnVerificationDocument(req.params.id, req.body, req.user, req)));

router.post('/verification-documents/:id/send', authenticate, authorize('VERIFIKATOR'), validate(sendVerificationSchema), action(req => review.sendVerificationResult(req.params.id, req.body, req.user, req)));
router.post('/verification-results/:id/send', authenticate, authorize('VERIFIKATOR'), validate(sendVerificationSchema), action(req => review.sendVerificationResult(req.params.id, req.body, req.user, req)));

router.get('/verification-documents/:id', authenticate, validate(documentIdSchema), action(req => review.getVerificationDocument(req.params.id, req.user)));
router.get('/verification-documents/:id/pdf', authenticate, validate(documentIdSchema), async (req, res, next) => {
  try {
    const doc = await review.getVerificationDocument(req.params.id, req.user);
    const bytes = doc.file_id ? await readVerifiedPdf(doc) : await renderVerificationPdf(doc, { draft: true });
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `inline; filename="verifikasi-${doc.id}.pdf"`);
    res.set('Cache-Control', 'private, no-store');
    res.send(bytes);
  } catch (error) { next(error); }
});

export default router;
