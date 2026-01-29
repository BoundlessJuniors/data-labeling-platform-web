import { Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { AuthRequest } from './auth.middleware';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

// Middleware factory for role-based access control
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access denied. Required roles: ${allowedRoles.join(', ')}`
        )
      );
    }

    next();
  };
};

// Convenience middleware for admin-only routes
export const adminOnly = requireRole('admin');

// Convenience middleware for client-only routes
export const clientOnly = requireRole('client');

// Convenience middleware for labeler-only routes
export const labelerOnly = requireRole('labeler');

// Convenience middleware for admin or client routes
export const adminOrClient = requireRole('admin', 'client');

// Convenience middleware for admin or labeler routes
export const adminOrLabeler = requireRole('admin', 'labeler');

// Check if user is the resource owner or admin
export const requireOwnerOrAdmin = (
  getOwnerId: (req: AuthRequest) => string | Promise<string>
) => {
  return async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(new UnauthorizedError('Authentication required'));
      }

      // Admin bypasses ownership check
      if (req.user.role === 'admin') {
        return next();
      }

      const ownerId = await getOwnerId(req);

      if (req.user.id !== ownerId) {
        return next(new ForbiddenError('You do not have permission to access this resource'));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
