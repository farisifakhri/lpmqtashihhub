import { Router } from 'express';
import masterController from '../controllers/master.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  idParamSchema,
  createCategorySchema,
  updateCategorySchema,
  createServiceTypeSchema,
  updateServiceTypeSchema,
  createAddonSchema,
  updateAddonSchema,
} from '../validators/master.validator.js';

const router = Router();

// -------------------------------------------------------------
// 1. KATEGORI MUSHAF (MUSHAF CATEGORIES)
// -------------------------------------------------------------
router.get('/categories', masterController.listCategories);
router.get('/categories/:id', validate(idParamSchema), masterController.getCategory);
router.post('/categories', authenticate, authorize('SUPERADMIN'), validate(createCategorySchema), masterController.createCategory);
router.put('/categories/:id', authenticate, authorize('SUPERADMIN'), validate(updateCategorySchema), masterController.updateCategory);
router.delete('/categories/:id', authenticate, authorize('SUPERADMIN'), validate(idParamSchema), masterController.deleteCategory);

// -------------------------------------------------------------
// 2. PROFIL LAYANAN & TARIF (SERVICE TYPES)
// -------------------------------------------------------------
router.get('/service-types', masterController.listServiceTypes);
router.get('/service-types/:id', validate(idParamSchema), masterController.getServiceType);
router.post('/service-types', authenticate, authorize('SUPERADMIN'), validate(createServiceTypeSchema), masterController.createServiceType);
router.put('/service-types/:id', authenticate, authorize('SUPERADMIN'), validate(updateServiceTypeSchema), masterController.updateServiceType);
router.delete('/service-types/:id', authenticate, authorize('SUPERADMIN'), validate(idParamSchema), masterController.deleteServiceType);

// -------------------------------------------------------------
// 3. LAYANAN TAMBAHAN (SERVICE ADDONS)
// -------------------------------------------------------------
router.get('/addons', masterController.listAddons);
router.get('/addons/:id', validate(idParamSchema), masterController.getAddon);
router.post('/addons', authenticate, authorize('SUPERADMIN'), validate(createAddonSchema), masterController.createAddon);
router.put('/addons/:id', authenticate, authorize('SUPERADMIN'), validate(updateAddonSchema), masterController.updateAddon);
router.delete('/addons/:id', authenticate, authorize('SUPERADMIN'), validate(idParamSchema), masterController.deleteAddon);

// -------------------------------------------------------------
// 4. TIM DISTRIBUSI (DISTRIBUTION TEAMS)
// -------------------------------------------------------------
router.get('/distribution-teams', authenticate, masterController.listDistributionTeams);

export default router;
