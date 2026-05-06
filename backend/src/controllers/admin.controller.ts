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

// Get dashboard statistics (admin only)
export const getDashboard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    ensureAdmin(req);

    const stats = await adminService.getDashboardStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

// Get upload monitoring data (admin only)
export const getUploadMonitoring = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    ensureAdmin(req);
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const search = (req.query.search as string) || undefined;
    const status = (req.query.status as string) || undefined;

    const result = await adminService.getUploadMonitoring(page, limit, search, status);

    res.json({
      success: true,
      data: result.assets,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// Get queue monitoring data (admin only)
export const getQueueMonitoring = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    ensureAdmin(req);
    const jobLimit = Math.min(parseInt(req.query.jobLimit as string) || 10, 50);

    const result = await adminService.getQueueMonitoring(jobLimit);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Get audit logs
import { auditService } from '../services/audit.service';

export const getAuditLogs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    ensureAdmin(req);
    const params = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50,
      action: req.query.action as string | undefined,
      entityType: req.query.entityType as string | undefined,
      entityId: req.query.entityId as string | undefined,
      actorUserId: req.query.actorUserId as string | undefined,
      actorSearch: req.query.actorSearch as string | undefined,
      sortBy: req.query.sortBy as 'createdAt' | undefined,
      sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined,
    };

    const result = await auditService.getAuditLogs(params);

    res.json({
      success: true,
      data: result.logs,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// Get payment dashboard statistics (admin only)
export const getPaymentDashboardStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    ensureAdmin(req);

    const stats = await adminService.getPaymentDashboardStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

// Get paginated payments (admin only)
export const getPayments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    ensureAdmin(req);
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    
    const filters = {
      status: req.query.status as string | undefined,
      provider: req.query.provider as string | undefined,
      search: req.query.search as string | undefined,
    };

    const result = await adminService.getPayments(page, limit, filters);

    res.json({
      success: true,
      data: result.payments,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// Create a new invite code (admin only)
export const createInviteCode = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    ensureAdmin(req);
    const { email, expiresAt } = req.body;
    const adminUserId = req.user!.id;

    const inviteCode = await adminService.createInviteCode(adminUserId, email, expiresAt);

    res.status(201).json({
      success: true,
      data: inviteCode,
    });
  } catch (error) {
    next(error);
  }
};

// Get paginated invite requests (admin only)
export const getInviteRequests = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    ensureAdmin(req);
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const result = await adminService.getInviteRequests(page, limit);

    res.json({
      success: true,
      data: result.requests,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

