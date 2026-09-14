import { Router } from 'express';
import masterController from '../controllers/master.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// Master data endpoints (publik / terotentikasi)
router.get('/categories', masterController.listCategories);
router.get('/service-types', masterController.listServiceTypes);
router.get('/addons', masterController.listAddons);
router.get('/distribution-teams', authenticate, masterController.listDistributionTeams);

export default router;
