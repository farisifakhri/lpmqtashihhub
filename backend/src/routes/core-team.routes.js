import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { configureCoreTeams, getCoreTeamConfig, listLegacyCoreTeamCases, setNextCoreTeam } from '../services/core-team.service.js';

const router = Router();
const uuid = z.string().uuid();
const team = z.object({
  team_number: z.number().int().min(1).max(9),
  verifier_id: uuid,
  distributor_id: uuid,
  documenter_id: uuid,
}).strict();
const rosterSchema = { body: z.object({
  teams: z.array(team).length(9).refine(items => new Set(items.map(item => item.team_number)).size === 9,
    'Nomor tim 1–9 harus masing-masing muncul satu kali.'),
  reason: z.string().trim().min(5).max(1000),
}).strict() };
const pointerSchema = { body: z.object({
  next_team_number: z.number().int().min(1).max(9),
  reason: z.string().trim().min(5).max(1000),
}).strict() };
const legacyQuerySchema = { query: z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
}).strict() };

function action(handler, status = 200) {
  return async (req, res, next) => {
    try { res.status(status).json({ success: true, data: await handler(req) }); }
    catch (error) { next(error); }
  };
}

router.get('/', authenticate, authorize('HELPER_ADMIN', 'SUPERADMIN'), action(req => getCoreTeamConfig(req.user)));
router.get('/legacy', authenticate, authorize('SUPERADMIN'), validate(legacyQuerySchema), action(req => listLegacyCoreTeamCases(req.user, req.query)));
router.put('/roster', authenticate, authorize('SUPERADMIN'), validate(rosterSchema),
  action(req => configureCoreTeams(req.body.teams, req.body.reason, req.user, req)));
router.put('/next', authenticate, authorize('SUPERADMIN'), validate(pointerSchema),
  action(req => setNextCoreTeam(req.body.next_team_number, req.body.reason, req.user, req)));

export default router;
