import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { TaskService } from '../services/task.service';

const taskService = new TaskService();

// Generate tasks for a listing (create tasks for each asset)
export const generateTasks = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: listingId } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const result = await taskService.generateTasks(listingId, userId, userRole);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Get all tasks (with filters)
export const getTasks = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const contractId = req.query.contractId as string | undefined;
    const status = req.query.status as string | undefined;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const result = await taskService.getTasks(page, limit, userId, userRole, contractId, status);

    res.json({
      success: true,
      data: result.tasks,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// Get a single task by ID
export const getTaskById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const task = await taskService.getTaskById(id, userId, userRole);

    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

// Lease a task (lock it for labeling)
export const leaseTask = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const labelerId = req.user!.id;
    const labelerRole = req.user!.role;
    const leaseDurationMinutes = parseInt(req.body.leaseDurationMinutes as string) || 30;

    const result = await taskService.leaseTask(id, labelerId, labelerRole, leaseDurationMinutes);

    res.json({
      success: true,
      data: {
        ...result.task,
        leaseToken: result.leaseToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Submit task (labeler submits annotation)
export const submitTask = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { leaseToken, annotationData } = req.body;
    const labelerId = req.user!.id;
    const labelerRole = req.user!.role;

    const updatedTask = await taskService.submitTask(id, labelerId, labelerRole, leaseToken, annotationData);

    res.json({
      success: true,
      data: updatedTask,
    });
  } catch (error) {
    next(error);
  }
};

// Accept task (QC approval)
export const acceptTask = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const updatedTask = await taskService.acceptTask(id, userId, userRole);

    res.json({
      success: true,
      data: updatedTask,
    });
  } catch (error) {
    next(error);
  }
};

// Reject task (QC rejection)
export const rejectTask = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const updatedTask = await taskService.rejectTask(id, userId, userRole, reason);

    res.json({
      success: true,
      data: updatedTask,
    });
  } catch (error) {
    next(error);
  }
};

// Release expired leases (cleanup job)
export const releaseExpiredLeases = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Only admin can run this
    if (req.user?.role !== 'admin') {
      return next(new (await import('../utils/errors')).ForbiddenError('Only admin can release expired leases'));
    }

    const result = await taskService.releaseExpiredLeases();

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Lease multiple tasks at once (For Desktop App Bulk Download)
export const leaseTaskBatch = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { contractId, amount } = req.body;
    const labelerId = req.user!.id;
    const labelerRole = req.user!.role;
    const count = typeof amount === 'number' ? amount : 10;

    const result = await taskService.leaseTaskBatch(contractId, labelerId, labelerRole, count);

    res.json({
      success: true,
      data: result,
      count: result.length,
    });
  } catch (error) {
    next(error);
  }
};
