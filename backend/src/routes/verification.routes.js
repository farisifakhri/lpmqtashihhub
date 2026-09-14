import { Router } from 'express';
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
} from '../validators/verification.validator.js';

const router = Router();
const action = (fn, status = 200) => async (req, res, next) => {
  try { res.status(status).json({ success: true, data: await fn(req) }); }
  catch (error) { next(error); }
};

router.put('/registrations/:id/physical-master', authenticate, authorize('ADMIN_PENERBIT'), validate(declarePhysicalMasterSchema), action(req => intake.declarePhysicalMaster(req.params.id, req.body, req.user, req)));
router.post('/registrations/:id/physical-master/receive', authenticate, authorize('KEPALA_LPMQ'), validate(receivePhysicalMasterSchema), action(req => intake.receivePhysicalMaster(req.params.id, req.body, req.user, req)));
router.get('/registrations/:id/receipt', authenticate, validate(registrationIdSchema), action(req => intake.getRegistrationReceipt(req.params.id, req.user)));
router.post('/registrations/:id/verification-assignments', authenticate, authorize('KEPALA_LPMQ'), validate(createVerificationAssignmentSchema), action(req => intake.createVerificationAssignment(req.params.id, req.body, req.user, req), 201));
router.get('/verification-assignments', authenticate, authorize('KEPALA_LPMQ', 'VERIFIKATOR'), validate(verificationInboxSchema), action(req => intake.listVerificationAssignments(req.query, req.user)));

// PR-VER-03: Pemeriksaan berkas & penyusunan draf surat hasil verifikasi (Epic D)
router.patch('/verification-assignments/:id/start', authenticate, authorize('VERIFIKATOR'), validate(assignmentIdSchema), action(req => review.startVerification(req.params.id, req.user, req)));
router.get('/verification-assignments/:id', authenticate, authorize('KEPALA_LPMQ', 'VERIFIKATOR', 'SUPERADMIN'), validate(assignmentIdSchema), action(req => review.getVerificationAssignmentDetail(req.params.id, req.user)));
router.put('/verification-assignments/:id/checklist', authenticate, authorize('VERIFIKATOR'), validate(saveChecklistSchema), action(req => review.saveVerificationDraft(req.params.id, req.body, req.user, req)));
router.post('/verification-assignments/:id/result-drafts', authenticate, authorize('VERIFIKATOR'), validate(verificationDraftSchema), action(req => review.submitVerificationDraft(req.params.id, req.body, req.user, req), 201));
router.get('/verification-documents/:documentId/attachments/:fileId', authenticate, validate(verificationAttachmentSchema), action(req => review.getVerificationAttachment(req.params.documentId, req.params.fileId, req.user)));

export default router;
