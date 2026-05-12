import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { registerSchema, loginSchema, inviteRequestSchema } from '../validators/validation.schemas';
import { authRateLimiter } from '../middlewares/rate-limit.middleware';

const router = Router();

// GET /api/v1/auth/csrf — MUST be defined BEFORE authRateLimiter.
// Protected only by the global defaultRateLimiter (applied in index.ts).
// The CSRF endpoint issues tokens and must never be behind the strict auth rate limiter.
router.get('/csrf', authController.getCsrf);

// Apply stricter rate limiting to all remaining auth routes
router.use(authRateLimiter);

// POST /api/v1/auth/register - Register a new user
router.post(
  '/register',
  validate(registerSchema),
  authController.register,
);

// POST /api/v1/auth/invite-request - Request an invite code
router.post(
  '/invite-request',
  validate(inviteRequestSchema),
  authController.inviteRequest,
);

// POST /api/v1/auth/login - Login and get JWT token
router.post(
  '/login',
  validate(loginSchema),
  authController.login,
);

// POST /api/v1/auth/logout - Clear auth cookie
router.post('/logout', authController.logout);

// GET /api/v1/auth/profile - Get current user profile (protected)
router.get(
  '/profile',
  authenticate,
  authController.getProfile,
);

export default router;
