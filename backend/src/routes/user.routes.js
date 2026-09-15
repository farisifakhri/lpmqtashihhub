import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import * as userService from '../services/user-management.service.js';
import {
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
  listUsersQuerySchema,
} from '../validators/user.validator.js';

const router = Router();
const action = (fn, status = 200) => async (req, res, next) => {
  try {
    const result = await fn(req);
    res.status(status).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

router.use(authenticate);
router.use(authorize('SUPERADMIN'));

router.get('/roles', action(() => userService.getAvailableRoles()));
router.get('/', validate(listUsersQuerySchema), action((req) => userService.listUsers(req.query, req.user)));
router.get('/:id', validate(userIdParamSchema), action((req) => userService.getUserDetail(req.params.id, req.user)));
router.post('/', validate(createUserSchema), action((req) => userService.createUser(req.body, req.user, req), 201));
router.put('/:id', validate(updateUserSchema), action((req) => userService.updateUser(req.params.id, req.body, req.user, req)));
router.delete('/:id', validate(userIdParamSchema), action((req) => userService.deleteUser(req.params.id, req.user, req)));
router.post('/:id/grant-all-roles', validate(userIdParamSchema), action((req) => userService.grantAllRolesToSuperadmin(req.params.id, req.user, req)));

export default router;

