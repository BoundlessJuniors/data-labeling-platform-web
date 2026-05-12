import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AuthService } from '../services/auth.service';
import { UserRole } from '@prisma/client';
import {
  getAuthCookieOptions,
  getAuthCookieClearOptions,
  getCsrfCookieOptions,
  getCsrfCookieClearOptions,
  generateCsrfToken,
  signCsrfToken,
} from '../config/security';

const authService = new AuthService();

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password, role, displayName, inviteCode } = req.body;

    const result = await authService.register({
      email,
      password,
      role: role as UserRole,
      displayName,
      inviteCode,
    });

    // Set token as httpOnly cookie instead of returning in body
    res.cookie('token', result.token, getAuthCookieOptions());

    res.status(201).json({
      success: true,
      data: { user: result.user },
    });
  } catch (error) {
    next(error);
  }
};

export const inviteRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email } = req.body;
    await authService.requestInvite(email);
    // Always return safe success
    res.json({
      success: true,
      message: 'Invite request received if the email is eligible.',
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password } = req.body;

    const result = await authService.login({ email, password });

    // Set token as httpOnly cookie instead of returning in body
    res.cookie('token', result.token, getAuthCookieOptions());

    res.json({
      success: true,
      data: { user: result.user },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Clear both the auth token and the CSRF token cookies
    res.clearCookie('token', getAuthCookieClearOptions());
    res.clearCookie('csrf_token', getCsrfCookieClearOptions());

    res.json({ success: true, message: 'Logged out' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/auth/csrf
 *
 * Issues a signed CSRF token:
 * - Generates a random token
 * - Signs it with HMAC-SHA256 and stores token.signature in an httpOnly cookie
 * - Returns the plain token in the response body for the frontend to use as a header
 */
export const getCsrf = (
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const token = generateCsrfToken();
    const signed = signCsrfToken(token); // "token.signature"
    res.cookie('csrf_token', signed, getCsrfCookieOptions());
    res.json({
      success: true,
      data: { csrfToken: token },
    });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;

    const user = await authService.getProfile(userId);

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
