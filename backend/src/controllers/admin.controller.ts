import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AdminService } from '../services/admin.service';
import { ForbiddenError } from '../utils/errors';

const adminService = new AdminService();

// Helper to ensure admin access
// (Middleware usually handles this, but extra safety or for specific logic)
const ensureAdmin = (req: AuthRequest) => {
  if (req.user?.role !== 'admin') {
    throw new ForbiddenError('Access denied. Admin only.');
  }
};

// Get all users (admin only)
export const getUsers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    ensureAdmin(req);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const role = req.query.role as string | undefined;
    const search = req.query.search as string | undefined;

    const result = await adminService.getUsers(page, limit, role, search);

    res.json({
      success: true,
      data: result.users,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// Get a single user by ID (admin only)
export const getUserById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    ensureAdmin(req);
    const { id } = req.params;

    const user = await adminService.getUserById(id);

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// Update user (admin only)
export const updateUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    ensureAdmin(req);
    const { id } = req.params;
    const { role, displayName } = req.body;
    const adminId = req.user!.id;

    const updatedUser = await adminService.updateUser(id, adminId, {
      role,
      displayName,
    });

    res.json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

// Delete user (admin only)
export const deleteUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    ensureAdmin(req);
    const { id } = req.params;
    const adminId = req.user!.id;

    await adminService.deleteUser(id, adminId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
