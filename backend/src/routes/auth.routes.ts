import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { registerSchema, loginSchema, inviteRequestSchema } from '../validators/validation.schemas';
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

// POST /api/auth/invite-request - Request an invite code
router.post(
  '/invite-request',
  validate(inviteRequestSchema),
  authController.inviteRequest
);

// POST /api/auth/login - Login and get JWT token
router.post(
  '/login',
  validate(loginSchema),
  authController.login
);

// POST /api/auth/logout - Clear auth cookie
router.post('/logout', authController.logout);

// GET /api/auth/profile - Get current user profile (protected)
router.get(
  '/profile',
  authenticate,
  authController.getProfile
);

export default router;
