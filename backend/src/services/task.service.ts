import { TaskStatus, ContractStatus, PaymentStatus, Prisma } from '@prisma/client';
import { UserRole } from '@prisma/client';
import prisma from '../lib/db';
import { NotFoundError, ForbiddenError, BadRequestError, ConflictError } from '../utils/errors';
import logger from '../lib/logger';
import crypto from 'crypto';
import { getSignedUrl } from '../lib/storage';
import stableStringify from 'fast-json-stable-stringify';
import { auditService } from './audit.service';

// ---------------------------------------------------------------------------
// Phase 5 — contract workability helpers
// ---------------------------------------------------------------------------

/**
 * Returns true for the three statuses in which a labeler may work on tasks.
 */
function isContractWorkableStatus(status: ContractStatus): boolean {
  return (
    status === ContractStatus.active ||
    status === ContractStatus.overdue ||
    status === ContractStatus.revision_requested
  );
}

/**
 * Returns true when `date` is defined and is in the past relative to `now`.
 */
function isPast(date: Date | null | undefined, now: Date): boolean {
  return !!date && date <= now;
}

/**
 * Throws a BadRequestError if the contract is not in a workable state
 * or if a relevant deadline (autoCancelAt / revisionDueAt) has passed.
 *
 * @param contract - Minimal contract fields needed for the check.
 * @param context  - 'lease' | 'submit' (used in error messages).
 */
function assertContractWorkable(
  contract: {
    id: string;
    status: ContractStatus;
    autoCancelAt?: Date | null;
    revisionDueAt?: Date | null;
  },
  context: 'lease' | 'submit'
): void {
  const now = new Date();

  if (!isContractWorkableStatus(contract.status)) {
    throw new BadRequestError(
      `Cannot ${context} task because contract status is ${contract.status}`
    );
  }

  if (contract.status === ContractStatus.overdue) {
    if (!contract.autoCancelAt) {
      throw new BadRequestError(
        `Cannot ${context} task because contract is overdue but autoCancelAt is missing`
      );
    }
    if (isPast(contract.autoCancelAt, now)) {
      throw new BadRequestError(
        `Cannot ${context} task because contract auto-cancel deadline has passed`
      );
    }
  }

  if (contract.status === ContractStatus.revision_requested) {
    if (!contract.revisionDueAt) {
      throw new BadRequestError(
        `Cannot ${context} task because revision deadline is missing`
      );
    }
    if (isPast(contract.revisionDueAt, now)) {
      throw new BadRequestError(
        `Cannot ${context} task because revision deadline has passed`
      );
    }
  }
}

/**
 * Service for task lifecycle: leasing, submission, QC, and batch operations.
 *
 * ARCHITECTURAL NOTE:
 *   Task generation happens exclusively inside ProposalService.acceptProposal.
 *   There is intentionally no generateTasks method here.
 *   The canonical flow is: accept proposal → create contract → create tasks.
 */
export class TaskService {

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
          where: { leaseToken: { not: null } },
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

    return {
      ...task,
      asset: task.asset ? {
        ...task.asset,
        sizeBytes: task.asset.sizeBytes?.toString() ?? null,
      } : null,
    };
  }

  /**
   * Lease a task (lock it for labeling) — race-safe via DB unique constraint.
   *
   * Supported lease paths:
   *   - Normal lease: task status is `ready` or `rejected` and there is no active lease.
   *   - Reclaim lease: task status is `leased` but its existing lease is expired.
   *   - Stale-row reclaim: task status is `ready` or `rejected` but an expired stale
   *     `taskLease` row still exists; in this case the lease row is overwritten.
   *
   * Rejected cases:
   *   - Active lease exists → ConflictError
   *   - Task is `leased` but has no lease row → BadRequestError (inconsistent state)
   *   - Any other task status → BadRequestError
   *
   * Concurrency guarantee:
   *   taskLease has a unique constraint on taskId. If two concurrent requests
   *   try to create a lease, one will get P2002. The loser receives ConflictError.
  */
  // -------------------------------------------------------------------------
  // Private payment guard helpers
  // -------------------------------------------------------------------------

  /**
   * Throws if no paid Payment exists for the given contract.
   * Use this outside transactions.
   */
  private async assertContractHasPaidPayment(contractId: string): Promise<void> {
    const paidPayment = await prisma.payment.findFirst({
      where: { contractId, status: PaymentStatus.paid },
      select: { id: true },
    });
    if (!paidPayment) {
      throw new BadRequestError(
        'Cannot work on tasks before contract payment is completed.'
      );
    }
  }

  async leaseTask(taskId: string, labelerId: string, labelerRole: UserRole, leaseDurationMinutes: number = 30) {
    const result = await prisma.$transaction(async (tx) => {
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

      // --- Phase 5: contract lifecycle + payment guard ---
      assertContractWorkable(task.contract, 'lease');

      const paidPaymentCheck = await tx.payment.findFirst({
        where: { contractId: task.contractId, status: PaymentStatus.paid },
        select: { id: true },
      });
      if (!paidPaymentCheck) {
        throw new BadRequestError(
          'Cannot lease task before contract payment is completed.'
        );
      }
      // --- End Phase 5 guard ---

      const now = new Date();
      const leaseToken = crypto.randomUUID();
      const leasedUntil = new Date(now.getTime() + leaseDurationMinutes * 60 * 1000);

      let mode: 'create' | 'reclaim' = 'create';

      // 1. Authoritative decision block for leaseability
      if (task.status === TaskStatus.leased) {
        if (!task.taskLease) {
          throw new BadRequestError('Task is in leased state without an active lease record');
        }
        if (task.taskLease.leasedUntil > now) {
          throw new ConflictError('Task is already leased');
        }
        // Task has an expired lease — we can reclaim it.
        mode = 'reclaim';
      } else if (task.status === TaskStatus.ready || task.status === TaskStatus.rejected) {
        if (task.taskLease) {
          if (task.taskLease.leasedUntil > now) {
            throw new ConflictError('Task has an active lease despite being marked available');
          }
          // Stale lease row exists and is expired — reclaim it.
          mode = 'reclaim';
        } else {
          // Normal lease flow for available task.
          mode = 'create';
        }
      } else {
        throw new BadRequestError(`Cannot lease task with status: ${task.status}`);
      }

      if (mode === 'reclaim') {
        // Expired lease — overwrite it
        await tx.taskLease.update({
          where: { taskId },
          data: {
            labelerUserId: labelerId,
            leaseToken,
            leasedUntil,
          },
        });
      } else {
        // Normal path — no lease record should exist, create it (P2002 = lost race)
        try {
          await tx.taskLease.create({
            data: {
              taskId,
              labelerUserId: labelerId,
              leaseToken,
              leasedUntil,
            },
          });
        } catch (err: unknown) {
          if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === 'P2002'
          ) {
            throw new ConflictError('Task is already leased');
          }
          throw err;
        }
      }

      // 2. Update task status
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
   * Compute a stable SHA-256 hash of annotationData for idempotency.
   * Uses fast-json-stable-stringify so key order doesn't matter.
   */
  computePayloadHash(annotationData: unknown): string {
    const canonical = stableStringify(annotationData);
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }

  /**
   * Submit a task (labeler submits annotation) — fully atomic and idempotent.
   *
   * IMPORTANT — FULL SNAPSHOT SEMANTICS:
   *   annotationData is the FULL FINAL annotation snapshot for this task.
   *   It is NOT a partial patch or incremental append. Each submission
   *   replaces the previous annotation state for this task.
   *   The normalize worker treats the LATEST valid raw row per task as
   *   authoritative (latest = most recent created_at, tie-break by id DESC).
   *
   * All DB mutations (raw insert, task update, lease delete) run inside a
   * single Prisma interactive transaction. On crash/error no partial state.
   *
   * Idempotency:
   *   - Task already submitted/accepted + same payloadHash → 200 OK (pre-tx check)
   *   - P2002 on annotationRaw insert → duplicate, finalize idempotently
   *   - P2025 on lease delete → already deleted, safe to ignore
   *
   *  * No grace period: leasedUntil <= now → hard reject.
   */
  async submitTask(
    taskId: string,
    labelerId: string,
    labelerRole: UserRole,
    leaseToken: string,
    annotationData: unknown
  ) {
    // Compute stable payload hash for idempotency
    const payloadHash = this.computePayloadHash(annotationData);

    // --- Pre-transaction idempotent shortcut ---
    const preCheck = await prisma.task.findUnique({
      where: { id: taskId },
      include: { contract: true },
    });

    if (!preCheck) {
      throw new NotFoundError('Task');
    }

    // ACL (outside transaction — fast fail)
    if (labelerRole !== 'admin' && preCheck.contract.labelerUserId !== labelerId) {
      throw new ForbiddenError('You are not the labeler for this contract');
    }

    // --- Phase 5: terminal contract fast-fail + guarded idempotent shortcut ---
    const terminalStatuses: ContractStatus[] = [
      ContractStatus.cancelled,
      ContractStatus.refunded,
      ContractStatus.disputed,
      ContractStatus.approved,
    ];
    const contractIsTerminal = terminalStatuses.includes(preCheck.contract.status);

    // Idempotent shortcut: if already submitted/accepted with same hash, return directly
    if (preCheck.status === TaskStatus.submitted || preCheck.status === TaskStatus.accepted) {
      const existingRaw = await prisma.annotationRaw.findFirst({
        where: { taskId, payloadHash },
      });
      if (existingRaw) {
        // Allow retry even if contract is in a terminal/submitted state — the
        // work was already recorded before the state changed.
        logger.info(`Idempotent submit for task ${taskId} (already ${preCheck.status}, same hash)`);
        const currentTask = await prisma.task.findUnique({
          where: { id: taskId },
          include: { asset: { select: { id: true, objectKey: true } } },
        });
        return currentTask;
      }
    }

    // Hard block for terminal contracts (no idempotent shortcut matched)
    if (contractIsTerminal) {
      throw new BadRequestError(
        `Cannot submit task because contract status is ${preCheck.contract.status}`
      );
    }

    // Enforce workability for all other cases
    assertContractWorkable(preCheck.contract, 'submit');
    await this.assertContractHasPaidPayment(preCheck.contractId);
    // --- End Phase 5 guard ---

    // --- Atomic transaction: raw insert + task update + lease delete ---
    const updatedTask = await prisma.$transaction(async (tx) => {
      // Re-read task inside transaction for consistency (include contract for double-check)
      const task = await tx.task.findUnique({
        where: { id: taskId },
        include: { taskLease: true, contract: true },
      });

      if (!task) {
        throw new NotFoundError('Task');
      }

      // --- Phase 5 double-check inside transaction (race-condition guard) ---
      assertContractWorkable(task.contract, 'submit');

      const paidPaymentTx = await tx.payment.findFirst({
        where: { contractId: task.contractId, status: PaymentStatus.paid },
        select: { id: true },
      });
      if (!paidPaymentTx) {
        throw new BadRequestError(
          'Cannot submit task before contract payment is completed.'
        );
      }
      // --- End Phase 5 double-check ---

      // Only leased tasks can be submitted (first time)
      if (task.status !== TaskStatus.leased) {
        throw new BadRequestError(`Cannot submit task with status: ${task.status}`);
      }

      // Verify lease token
      if (!task.taskLease || task.taskLease.leaseToken !== leaseToken) {
        throw new ForbiddenError('Invalid or expired lease token');
      }

      // No grace period: lease must be active
      if (task.taskLease.leasedUntil <= new Date()) {
        throw new ForbiddenError('Lease has expired. Cannot submit.');
      }

      // 1. Insert raw annotation (P2002 = duplicate → idempotent)
      let isDuplicate = false;
      try {
        await tx.annotationRaw.create({
          data: {
            taskId,
            labelerUserId: labelerId,
            leaseToken,
            payloadHash,
            payloadJson: annotationData as Prisma.InputJsonValue,
          },
        });
      } catch (err: unknown) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          isDuplicate = true;
          logger.info(`Duplicate annotation detected for task ${taskId} (P2002)`);
        } else {
          throw err;
        }
      }

      // 2. Update task status → submitted
      const result = await tx.task.update({
        where: { id: taskId },
        data: {
          status: TaskStatus.submitted,
          attemptCount: isDuplicate ? undefined : { increment: 1 },
        },
        include: {
          asset: { select: { id: true, objectKey: true } },
        },
      });

      // 3. Delete lease (P2025 = already deleted → safe)
      try {
        await tx.taskLease.delete({ where: { taskId } });
      } catch (err: unknown) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2025'
        ) {
          logger.info(`Lease already deleted for task ${taskId} (idempotent)`);
        } else {
          throw err;
        }
      }

      return result;
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

    if (userRole === 'admin') {
      await auditService.logAction(userId, 'task.accept', 'task', taskId, {
        previousStatus: task.status,
      });
    }

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

    if (userRole === 'admin') {
      await auditService.logAction(userId, 'task.reject', 'task', taskId, {
        reason: reason || null,
        previousStatus: task.status,
      });
    }

    logger.info(`Task rejected: ${taskId}, reason: ${reason || 'No reason provided'}`);

    return updatedTask;
  }

  /**
   * Release expired leases (admin cleanup job)
   */
  async releaseExpiredLeases(adminUserId?: string) {
    const now = new Date();

    // Find expired leases
    const expiredLeases = await prisma.taskLease.findMany({
      where: {
        leasedUntil: { lte: now },
      },
      include: { task: true },
    });

    let releasedCount = 0;
    let staleDeletedCount = 0;

    // Reset tasks and delete leases
    for (const lease of expiredLeases) {
      if (lease.task.status === TaskStatus.leased) {
        await prisma.$transaction([
          prisma.task.update({
            where: { id: lease.taskId },
            data: { status: TaskStatus.ready },
          }),
          prisma.taskLease.delete({
            where: { taskId: lease.taskId },
          }),
        ]);
        releasedCount++;
      } else {
        await prisma.taskLease.delete({
          where: { taskId: lease.taskId },
        });
        staleDeletedCount++;
        logger.warn(`Deleted stale expired lease for task ${lease.taskId} with status ${lease.task.status}`);
      }
    }

    logger.info(`Released ${releasedCount} expired leases, deleted ${staleDeletedCount} stale leases`);

    if (adminUserId && (releasedCount > 0 || staleDeletedCount > 0)) {
      // Use adminUserId as entityId — AuditLog.entityId is @db.Uuid and 'leases' is not a UUID.
      // The actual scope is captured in metaJson.
      await auditService.logAction(adminUserId, 'task.release_expired_leases', 'system', adminUserId, {
        releasedCount,
        staleDeletedCount,
        target: 'expired_task_leases',
      });
    }

    return { releasedCount, staleDeletedCount };
  }

  /**
   * Lease multiple tasks at once (for Desktop App bulk download)
   * Uses transaction for atomic bulk locking with retry for race conditions.
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

    // --- Phase 5: contract lifecycle + payment guard ---
    assertContractWorkable(contract, 'lease');

    await this.assertContractHasPaidPayment(contractId);
    // --- End Phase 5 guard ---

    // Retry loop for race-condition safety
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await prisma.$transaction(async (tx) => {
          // 1. Find 'count' available tasks (ordered by updatedAt to reduce
          //    collision when concurrent callers hit the same deterministic set)
          const now = new Date();
          const availableTasks = await tx.task.findMany({
            where: {
              contractId,
              OR: [
                { status: { in: [TaskStatus.ready, TaskStatus.rejected] } },
                {
                  status: TaskStatus.leased,
                  taskLease: {
                    leasedUntil: { lte: now },
                  },
                },
              ],
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

          // 3. Clean up any stale leases for these tasks before reassigning
          await tx.taskLease.deleteMany({
            where: { taskId: { in: taskIds } },
          });

          // 4. Create lease records with unique tokens per task
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

  /**
   * Get task QC view — detailed task data for client/admin QC inspection.
   * Returns asset metadata + normalized annotation + latest raw annotation.
   */
  async getTaskQcView(taskId: string, userId: string, userRole: UserRole) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        // storageState must be included to guard signed URL generation
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
          },
        },
        annotationsRaw: {
          where: { leaseToken: { not: null } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        annotationNormalized: true,
      },
    });

    if (!task) {
      throw new NotFoundError('Task');
    }

    // Check access rights (client, labeler, or admin)
    if (
      userRole !== 'admin' &&
      task.contract.clientUserId !== userId &&
      task.contract.labelerUserId !== userId
    ) {
      throw new ForbiddenError('You do not have access to this task');
    }

    // Generate signed URL for direct image access.
    // Skip for purged assets — the source image is no longer in storage.
    let imageUrl: string | null = null;
    if (task.asset?.objectKey) {
      if (task.asset.storageState === 'purged') {
        imageUrl = null;
      } else {
        try {
          imageUrl = await getSignedUrl(task.asset.objectKey, 3600);
        } catch (err) {
          logger.warn(`Failed to generate signed URL for asset ${task.asset.id}:`, err);
        }
      }
    }

    return {
      id: task.id,
      status: task.status,
      asset: task.asset ? {
        ...task.asset,
        sizeBytes: task.asset.sizeBytes?.toString() ?? null,
      } : null,
      imageUrl,
      latestRaw: task.annotationsRaw[0] || null,
      normalized: task.annotationNormalized || null,
      normalizeReady: task.annotationNormalized !== null,
      labelSet: task.contract.listing.labelSet,
    };
  }
}
