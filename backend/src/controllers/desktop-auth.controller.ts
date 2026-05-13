import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password } = req.body;

    const result = await authService.login({ email, password, clientType: 'desktop' });

    // Desktop auth returns token in JSON payload, NO cookies are set.
    res.json({
      success: true,
      data: { user: result.user, token: result.token },
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
    // TODO: Implement stateful DesktopSession revocation in Prisma.
    // TODO: Implement refresh token rotation & hashed refresh-token storage.
    // For now, desktop logout is purely a client-side token deletion.
    res.json({ success: true, message: 'Logged out from desktop' });
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
