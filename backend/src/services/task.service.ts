import { TaskStatus, ContractStatus, Prisma } from '@prisma/client';
import { UserRole } from '@prisma/client';
import prisma from '../lib/db';
import { NotFoundError, ForbiddenError, BadRequestError, ConflictError } from '../utils/errors';
import logger from '../lib/logger';
import crypto from 'crypto';

export class TaskService {
  /**
   * Generate tasks for a listing (create tasks for each asset in the dataset)
   */
  async generateTasks(listingId: string, userId: string, userRole: UserRole) {
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
    if (userRole !== 'admin' && listing.ownerUserId !== userId) {
      throw new ForbiddenError('Only the listing owner can generate tasks');
    }

    // Must have an active contract
    const activeContract = listing.contracts.find((c) => c.status === 'active');
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

    return { count: tasks.count, tasks: createdTasks };
  }

  /**
   * Get all tasks with filtering and pagination
   */
  async getTasks(
    page: number,
    limit: number,
    userId: string,
    userRole: UserRole,
    contractId?: string,
    status?: string
  ) {
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.TaskWhereInput = {};

    if (contractId) {
      where.contractId = contractId;
    }

    if (status) {
      where.status = status as TaskStatus;
    }

    // Filter based on user role
    if (userRole !== 'admin') {
      where.contract = {
        OR: [
          { clientUserId: userId },
          { labelerUserId: userId },
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

    return {
      tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single task by ID with access control
   */
  async getTaskById(taskId: string, userId: string, userRole: UserRole) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
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
      userRole !== 'admin' &&
      task.contract.clientUserId !== userId &&
      task.contract.labelerUserId !== userId
    ) {
      throw new ForbiddenError('You do not have access to this task');
    }

    return task;
  }

  /**
   * Lease a task (lock it for labeling) — uses transaction for race condition safety
   */
  async leaseTask(taskId: string, labelerId: string, labelerRole: UserRole, leaseDurationMinutes: number = 30) {
    // Use transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Get task with lock
      const task = await tx.task.findUnique({
        where: { id: taskId },
        include: {
          contract: true,
          taskLease: true,
        },
      });

      if (!task) {
        throw new NotFoundError('Task');
      }

      // Verify user is the contract's labeler
      if (labelerRole !== 'admin' && task.contract.labelerUserId !== labelerId) {
        throw new ForbiddenError('You are not the labeler for this contract');
      }

      // Check task status — allow leasing ready or rejected tasks
      if (task.status !== TaskStatus.ready && task.status !== TaskStatus.rejected) {
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
          where: { taskId },
          data: {
            labelerUserId: labelerId,
            leaseToken,
            leasedUntil,
          },
        });
      } else {
        await tx.taskLease.create({
          data: {
            taskId,
            labelerUserId: labelerId,
            leaseToken,
            leasedUntil,
          },
        });
      }

      // Update task status
      const updatedTask = await tx.task.update({
        where: { id: taskId },
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

    logger.info(`Task leased: ${taskId} by labeler ${labelerId}`);

    return result;
  }

  /**
   * Submit a task (labeler submits annotation)
   */
  async submitTask(
    taskId: string,
    labelerId: string,
    labelerRole: UserRole,
    leaseToken: string,
    annotationData: unknown
  ) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        contract: true,
        taskLease: true,
      },
    });

    if (!task) {
      throw new NotFoundError('Task');
    }

    // Verify user is the contract's labeler
    if (labelerRole !== 'admin' && task.contract.labelerUserId !== labelerId) {
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

    // Grace period: accept late submissions from the same labeler within 24h of lease expiry.
    // This prevents discarding offline work while still enforcing a reasonable time window.
    const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000; // 24 hours
    const now = new Date();
    if (task.taskLease.leasedUntil < now) {
      const elapsed = now.getTime() - task.taskLease.leasedUntil.getTime();
      if (elapsed > GRACE_PERIOD_MS) {
        throw new ForbiddenError('Lease has expired beyond the 24-hour grace period');
      }
      // Within grace — check that the submitter is the original leasee
      if (task.taskLease.labelerUserId !== labelerId) {
        throw new ForbiddenError('Lease has expired and you are not the original leasee');
      }
      logger.warn(`Task ${taskId} submitted within grace period (lease expired ${elapsed}ms ago)`);
    }

    // Save raw annotation
    await prisma.annotationRaw.create({
      data: {
        taskId,
        labelerUserId: labelerId,
        payloadJson: annotationData as Prisma.InputJsonValue,
      },
    });

    // Update task status
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
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
      where: { taskId },
    });

    logger.info(`Task submitted: ${taskId}`);

    return updatedTask;
  }

  /**
   * Accept a task (QC approval — client only)
   */
  async acceptTask(taskId: string, userId: string, userRole: UserRole) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { contract: true },
    });

    if (!task) {
      throw new NotFoundError('Task');
    }

    // Only client or admin can accept
    if (userRole !== 'admin' && task.contract.clientUserId !== userId) {
      throw new ForbiddenError('Only the client can accept this task');
    }

    // Check task status
    if (task.status !== TaskStatus.submitted) {
      throw new BadRequestError(`Cannot accept task with status: ${task.status}`);
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { status: TaskStatus.accepted },
      include: {
        asset: {
          select: { id: true, objectKey: true },
        },
      },
    });

    logger.info(`Task accepted: ${taskId}`);

    return updatedTask;
  }

  /**
   * Reject a task (QC rejection — client only)
   */
  async rejectTask(taskId: string, userId: string, userRole: UserRole, reason?: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { contract: true },
    });

    if (!task) {
      throw new NotFoundError('Task');
    }

    // Only client or admin can reject
    if (userRole !== 'admin' && task.contract.clientUserId !== userId) {
      throw new ForbiddenError('Only the client can reject this task');
    }

    // Check task status
    if (task.status !== TaskStatus.submitted) {
      throw new BadRequestError(`Cannot reject task with status: ${task.status}`);
    }

    // Reset task to rejected for re-work
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { status: TaskStatus.rejected },
      include: {
        asset: {
          select: { id: true, objectKey: true },
        },
      },
    });

    logger.info(`Task rejected: ${taskId}, reason: ${reason || 'No reason provided'}`);

    return updatedTask;
  }

  /**
   * Release expired leases (admin cleanup job)
   */
  async releaseExpiredLeases() {
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

    return { releasedCount: expiredLeases.length };
  }

  /**
   * Lease multiple tasks at once (for Desktop App bulk download)
   * Uses transaction for atomic bulk locking with retry for race conditions.
   * Prisma does not support SELECT FOR UPDATE SKIP LOCKED, so concurrent
   * callers may pick the same tasks.  If createMany fails on the taskLease
   * unique constraint the whole transaction is retried (max 3 attempts).
   */
  async leaseTaskBatch(
    contractId: string,
    labelerId: string,
    labelerRole: UserRole,
    amount: number = 10
  ) {
    const count = Math.min(amount, 100); // Max 100
    const leaseDurationMinutes = 120; // Desktop app needs more time (2 hours)
    const MAX_RETRIES = 3;

    // Verify contract ownership
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundError('Contract');
    }

    if (labelerRole !== 'admin' && contract.labelerUserId !== labelerId) {
      throw new ForbiddenError('You are not the labeler for this contract');
    }

    if (contract.status !== ContractStatus.active && contract.status !== ContractStatus.revision_requested) {
      throw new BadRequestError('Contract must be active or in revision_requested status');
    }

    // Retry loop for race-condition safety
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await prisma.$transaction(async (tx) => {
          // 1. Find 'count' available tasks (ordered by updatedAt to reduce
          //    collision when concurrent callers hit the same deterministic set)
          const availableTasks = await tx.task.findMany({
            where: {
              contractId,
              status: { in: [TaskStatus.ready, TaskStatus.rejected] },
            },
            orderBy: { updatedAt: 'asc' },
            take: count,
            select: { id: true },
          });

          if (availableTasks.length === 0) {
            return [];
          }

          const taskIds = availableTasks.map((t) => t.id);
          const leasedUntil = new Date(Date.now() + leaseDurationMinutes * 60 * 1000);

          // 2. Bulk update task status
          await tx.task.updateMany({
            where: { id: { in: taskIds } },
            data: { status: TaskStatus.leased },
          });

          // 3. Create lease records with unique tokens per task
          const leases = taskIds.map((taskId) => ({
            taskId,
            labelerUserId: labelerId,
            leaseToken: crypto.randomUUID(),
            leasedUntil,
          }));

          await tx.taskLease.createMany({
            data: leases,
          });

          // 4. Return the tasks with their assets and new tokens
          const finalTasks = await tx.task.findMany({
            where: { id: { in: taskIds } },
            include: {
              asset: {
                select: { id: true, objectKey: true, mimeType: true, width: true, height: true },
              },
              taskLease: {
                select: { leaseToken: true, leasedUntil: true },
              },
            },
          });

          return finalTasks;
        });

        logger.info(`Batch leased ${result.length} tasks for contract ${contractId} by ${labelerId}`);
        return result;
      } catch (err: unknown) {
        const isUniqueViolation =
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002';

        if (isUniqueViolation && attempt < MAX_RETRIES) {
          logger.warn(
            `Lease-batch attempt ${attempt} failed (unique constraint race), retrying...`
          );
          continue;
        }
        throw err; // Non-retryable or max retries reached
      }
    }

    // Fallback (should not reach here)
    return [];
  }
}
