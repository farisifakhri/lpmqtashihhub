import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import * as intake from '../services/verification-intake.service.js';
import {
  registrationIdSchema,
  declarePhysicalMasterSchema,
  receivePhysicalMasterSchema,
  createVerificationAssignmentSchema,
  verificationInboxSchema,
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

export default router;
