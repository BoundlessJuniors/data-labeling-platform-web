import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { registerSchema, loginSchema } from '../validators/validation.schemas';
import { authRateLimiter } from '../middlewares/rate-limit.middleware';

const router = Router();

// Apply stricter rate limiting to auth routes
router.use(authRateLimiter);

// POST /api/auth/register - Register a new user
router.post(
  '/register',
  validate(registerSchema),
  authController.register
);

// POST /api/auth/login - Login and get JWT token
router.post(
  '/login',
  validate(loginSchema),
  authController.login
);

// GET /api/auth/profile - Get current user profile (protected)
router.get(
  '/profile',
  authenticate,
  authController.getProfile
);

export default router;
