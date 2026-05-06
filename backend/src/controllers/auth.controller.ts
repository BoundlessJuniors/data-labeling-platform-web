import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AuthService } from '../services/auth.service';
import { UserRole } from '@prisma/client';
import { JWT_EXPIRES_IN, parseExpirationToMs } from '../utils/auth.util';

const authService = new AuthService();

/** Shared cookie options for the JWT token cookie */
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: parseExpirationToMs(JWT_EXPIRES_IN),
};

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
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
    res.cookie('token', result.token, cookieOptions);

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
  next: NextFunction
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
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    const result = await authService.login({ email, password });

    // Set token as httpOnly cookie instead of returning in body
    res.cookie('token', result.token, cookieOptions);

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
  next: NextFunction
): Promise<void> => {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
    });

    res.json({ success: true, message: 'Logged out' });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
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
