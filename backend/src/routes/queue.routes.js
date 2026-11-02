import { Router } from 'express';
import { getQueueCounts } from '../controllers/queue.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireActiveRole } from '../middlewares/active-role.middleware.js';

const router = Router();

router.get('/me/queue-counts', authenticate, requireActiveRole, getQueueCounts);

export default router;
