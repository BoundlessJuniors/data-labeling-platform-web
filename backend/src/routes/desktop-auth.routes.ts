import { Router } from 'express';
import * as desktopAuthController from '../controllers/desktop-auth.controller';
import { authenticateBearer } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { loginSchema } from '../validators/validation.schemas';
import { authRateLimiter } from '../middlewares/rate-limit.middleware';

const router = Router();

// Apply stricter rate limiting to desktop auth routes
router.use(authRateLimiter);

// POST /api/v1/desktop/auth/login - Login and get desktop JWT token
router.post(
  '/login',
  validate(loginSchema),
  desktopAuthController.login,
);

// POST /api/v1/desktop/auth/logout - Clear desktop token (client-side only for now)
router.post(
  '/logout',
  authenticateBearer,
  desktopAuthController.logout
);

// GET /api/v1/desktop/auth/profile - Get current user profile (protected by bearer token)
router.get(
  '/profile',
  authenticateBearer,
  desktopAuthController.getProfile,
);

export default router;
