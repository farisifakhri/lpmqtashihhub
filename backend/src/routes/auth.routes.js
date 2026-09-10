import { Router } from 'express';
import authController from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { loginSchema, registerPublisherSchema } from '../validators/auth.validator.js';
import { authRateLimiter, registrationRateLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = Router();

router.post('/login', authRateLimiter, validate(loginSchema), authController.login);
router.post(
  '/register-publisher',
  registrationRateLimiter,
  validate(registerPublisherSchema),
  authController.registerPublisher
);
router.get('/me', authenticate, authController.getMe);

export default router;
