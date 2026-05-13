import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../utils/errors';
import prisma from '../lib/db';
import { UserRole } from '@prisma/client';
import { JWT_EXPIRES_IN, DESKTOP_JWT_EXPIRES_IN } from '../utils/auth.util';
import { getJwtSecret } from '../config/security';

// Extended Express Request with user info
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  clientType?: 'browser' | 'desktop';
}

export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;

    if (decoded.clientType === 'desktop') {
      throw new UnauthorizedError('Desktop tokens cannot be used as browser cookies');
    }

    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token expired'));
    } else {
      next(error);
    }
  }
};

// Optional authentication - doesn't throw if no token
export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return next();
    }
    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;

    if (decoded.clientType === 'desktop') {
      return next(); // Ignore desktop tokens for optional browser auth
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true },
    });

    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
      };
    }

    next();
  } catch {
    // Ignore errors and continue without user
    next();
  }
};

export const authenticateBearer = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No bearer token provided');
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;
    
    if (decoded.clientType !== 'desktop') {
      throw new UnauthorizedError('Token is not a desktop client token');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token expired'));
    } else {
      next(error);
    }
  }
};

export const authenticateAny = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const hasCookie = !!req.cookies?.token;
  const authHeader = req.headers.authorization;
  const hasBearer = authHeader && authHeader.startsWith('Bearer ');

  if (hasCookie && hasBearer) {
    return next(new UnauthorizedError('Ambiguous authentication: both cookie and bearer token provided'));
  }

  if (hasBearer) {
    return authenticateBearer(req, res, next);
  } else if (hasCookie) {
    return authenticate(req, res, next);
  } else {
    return next(new UnauthorizedError('No authentication provided'));
  }
};


export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN as any });
};

export const generateDesktopToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: DESKTOP_JWT_EXPIRES_IN as any });
};
