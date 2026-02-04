import { Response, NextFunction } from 'express';
import { TaskStatus, Prisma } from '@prisma/client';
import prisma from '../lib/db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { NotFoundError, ForbiddenError, BadRequestError, ConflictError } from '../utils/errors';
import logger from '../lib/logger';
import crypto from 'crypto';

// Generate tasks for a listing (create tasks for each asset)
export const generateTasks = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: listingId } = req.params;

    // Verify listing exists
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        contracts: true,
        dataset: {
          include: {
            assets: true,
          },
        },
      },
    });

    if (!listing) {
      throw new NotFoundError('Listing');
    }

    // Only client or admin can generate tasks
    if (req.user?.role !== 'admin' && listing.ownerUserId !== req.user?.id) {
      throw new ForbiddenError('Only the listing owner can generate tasks');
    }

    // Must have an active contract
    const activeContract = listing.contracts.find(c => c.status === 'active');
    if (!activeContract) {
      throw new BadRequestError('Listing must have an active contract before generating tasks');
    }

    // Check if tasks already exist
    const existingTasks = await prisma.task.count({
      where: { contractId: activeContract.id },
    });

    if (existingTasks > 0) {
      throw new ConflictError('Tasks already generated for this contract');
    }

    // Create tasks for each asset
    const assets = listing.dataset.assets;

    if (assets.length === 0) {
      throw new BadRequestError('Dataset has no assets to create tasks for');
    }

    const tasks = await prisma.task.createMany({
      data: assets.map((asset) => ({
        contractId: activeContract.id,
        assetId: asset.id,
        status: TaskStatus.ready,
      })),
    });

    logger.info(`Generated ${tasks.count} tasks for listing ${listingId}`);

    // Fetch created tasks
    const createdTasks = await prisma.task.findMany({
      where: { contractId: activeContract.id },
      include: {
        asset: {
          select: { id: true, objectKey: true, mimeType: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: {
        count: tasks.count,
        tasks: createdTasks,
      },
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
    const skip = (page - 1) * limit;
    const contractId = req.query.contractId as string | undefined;
    const status = req.query.status as string | undefined;

    // Build where clause
    const where: Prisma.TaskWhereInput = {};

    if (contractId) {
      where.contractId = contractId;
    }

    if (status) {
      where.status = status as TaskStatus;
    }

    // Filter based on user role
    if (req.user?.role !== 'admin') {
      where.contract = {
        OR: [
          { clientUserId: req.user!.id },
          { labelerUserId: req.user!.id },
        ],
      };
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          asset: {
            select: { id: true, objectKey: true, mimeType: true, width: true, height: true },
          },
          contract: {
            select: { id: true, listingId: true },
          },
          taskLease: {
            select: { labelerUserId: true, leasedUntil: true },
          },
        },
      }),
      prisma.task.count({ where }),
    ]);

    res.json({
      success: true,
      data: tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
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

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        asset: true,
        contract: {
          include: {
            listing: {
              include: {
                labelSet: {
                  include: { labels: true },
                },
              },
            },
            client: {
              select: { id: true, email: true, displayName: true },
            },
            labeler: {
              select: { id: true, email: true, displayName: true },
            },
          },
        },
        taskLease: true,
        annotationsRaw: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        annotationNormalized: true,
      },
    });

    if (!task) {
      throw new NotFoundError('Task');
    }

    // Check access rights
    if (
      req.user?.role !== 'admin' &&
      task.contract.clientUserId !== req.user?.id &&
      task.contract.labelerUserId !== req.user?.id
    ) {
      throw new ForbiddenError('You do not have access to this task');
    }

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
    const leaseDurationMinutes = parseInt(req.body.leaseDurationMinutes as string) || 30;

    // Use transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Get task with lock
      const task = await tx.task.findUnique({
        where: { id },
        include: {
          contract: true,
          taskLease: true,
        },
      });

      if (!task) {
        throw new NotFoundError('Task');
      }

      // Verify user is the contract's labeler
      if (req.user?.role !== 'admin' && task.contract.labelerUserId !== labelerId) {
        throw new ForbiddenError('You are not the labeler for this contract');
      }

      // Check task status
      if (task.status !== TaskStatus.ready) {
        throw new BadRequestError(`Cannot lease task with status: ${task.status}`);
      }

      // Check if already leased (and not expired)
      if (task.taskLease && task.taskLease.leasedUntil > new Date()) {
        throw new ConflictError('Task is already leased');
      }

      // Generate lease token
      const leaseToken = crypto.randomUUID();
      const leasedUntil = new Date(Date.now() + leaseDurationMinutes * 60 * 1000);

      // Create or update lease
      if (task.taskLease) {
        await tx.taskLease.update({
          where: { taskId: id },
          data: {
            labelerUserId: labelerId,
            leaseToken,
            leasedUntil,
          },
        });
      } else {
        await tx.taskLease.create({
          data: {
            taskId: id,
            labelerUserId: labelerId,
            leaseToken,
            leasedUntil,
          },
        });
      }

      // Update task status
      const updatedTask = await tx.task.update({
        where: { id },
        data: { status: TaskStatus.leased },
        include: {
          asset: {
            select: { id: true, objectKey: true, mimeType: true },
          },
          taskLease: true,
        },
      });

      return { task: updatedTask, leaseToken };
    });

    logger.info(`Task leased: ${id} by labeler ${labelerId}`);

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

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        contract: true,
        taskLease: true,
      },
    });

    if (!task) {
      throw new NotFoundError('Task');
    }

    // Verify user is the contract's labeler
    if (req.user?.role !== 'admin' && task.contract.labelerUserId !== labelerId) {
      throw new ForbiddenError('You are not the labeler for this contract');
    }

    // Check task status
    if (task.status !== TaskStatus.leased) {
      throw new BadRequestError(`Cannot submit task with status: ${task.status}`);
    }

    // Verify lease token
    if (!task.taskLease || task.taskLease.leaseToken !== leaseToken) {
      throw new ForbiddenError('Invalid or expired lease token');
    }

    // Check if lease is expired
    if (task.taskLease.leasedUntil < new Date()) {
      throw new BadRequestError('Task lease has expired');
    }

    // Save raw annotation
    await prisma.annotationRaw.create({
      data: {
        taskId: id,
        labelerUserId: labelerId,
        payloadJson: annotationData,
      },
    });

    // Update task status
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        status: TaskStatus.submitted,
        attemptCount: { increment: 1 },
      },
      include: {
        asset: {
          select: { id: true, objectKey: true },
        },
      },
    });

    // Delete lease
    await prisma.taskLease.delete({
      where: { taskId: id },
    });

    logger.info(`Task submitted: ${id}`);

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

    const task = await prisma.task.findUnique({
      where: { id },
      include: { contract: true },
    });

    if (!task) {
      throw new NotFoundError('Task');
    }

    // Only client or admin can accept
    if (req.user?.role !== 'admin' && task.contract.clientUserId !== req.user?.id) {
      throw new ForbiddenError('Only the client can accept this task');
    }

    // Check task status
    if (task.status !== TaskStatus.submitted) {
      throw new BadRequestError(`Cannot accept task with status: ${task.status}`);
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: { status: TaskStatus.accepted },
      include: {
        asset: {
          select: { id: true, objectKey: true },
        },
      },
    });

    logger.info(`Task accepted: ${id}`);

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

    const task = await prisma.task.findUnique({
      where: { id },
      include: { contract: true },
    });

    if (!task) {
      throw new NotFoundError('Task');
    }

    // Only client or admin can reject
    if (req.user?.role !== 'admin' && task.contract.clientUserId !== req.user?.id) {
      throw new ForbiddenError('Only the client can reject this task');
    }

    // Check task status
    if (task.status !== TaskStatus.submitted) {
      throw new BadRequestError(`Cannot reject task with status: ${task.status}`);
    }

    // Reset task to ready for re-work
    const updatedTask = await prisma.task.update({
      where: { id },
      data: { status: TaskStatus.rejected },
      include: {
        asset: {
          select: { id: true, objectKey: true },
        },
      },
    });

    logger.info(`Task rejected: ${id}, reason: ${reason || 'No reason provided'}`);

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
      throw new ForbiddenError('Only admin can release expired leases');
    }

    const now = new Date();

    // Find expired leases
    const expiredLeases = await prisma.taskLease.findMany({
      where: {
        leasedUntil: { lt: now },
      },
      include: { task: true },
    });

    // Reset tasks and delete leases
    for (const lease of expiredLeases) {
      await prisma.$transaction([
        prisma.task.update({
          where: { id: lease.taskId },
          data: { status: TaskStatus.ready },
        }),
        prisma.taskLease.delete({
          where: { taskId: lease.taskId },
        }),
      ]);
    }

    logger.info(`Released ${expiredLeases.length} expired leases`);

    res.json({
      success: true,
      data: {
        releasedCount: expiredLeases.length,
      },
    });
  } catch (error) {
    next(error);
  }
};
