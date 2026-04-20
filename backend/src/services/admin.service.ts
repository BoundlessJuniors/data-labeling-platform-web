import { Prisma, UserRole, AssetStatus, ContractStatus, TaskStatus, SubmissionStatus, ListingStatus } from '@prisma/client';
import prisma from '../lib/db';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';
import logger from '../lib/logger';
import { assetQueue, normalizeQueue } from '../lib/queue';
import { auditService } from './audit.service';

export class AdminService {
  /**
   * Get all users (admin only)
   */
  async getUsers(
    page: number,
    limit: number,
    role?: string,
    search?: string
  ) {
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.UserWhereInput = {};

    if (role) {
      where.role = role as UserRole;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          ratingAvg: true,
          createdAt: true,
          _count: {
            select: {
              datasets: true,
              listingsOwned: true,
              contractsAsClient: true,
              contractsAsLabeler: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single user by ID (admin only)
   */
  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        ratingAvg: true,
        createdAt: true,
        _count: {
          select: {
            datasets: true,
            listingsOwned: true,
            contractsAsClient: true,
            contractsAsLabeler: true,
            taskLeases: true,
            reviews: true,
            proposals: true,
          },
        },
        contractsAsClient: { take: 3, orderBy: { startedAt: 'desc' }, select: { id: true, status: true, agreedPriceTotal: true, startedAt: true } },
        contractsAsLabeler: { take: 3, orderBy: { startedAt: 'desc' }, select: { id: true, status: true, agreedPriceTotal: true, startedAt: true } },
        reviews: { take: 3, orderBy: { createdAt: 'desc' }, select: { id: true, decision: true, taskId: true, createdAt: true } },
        proposals: { take: 3, orderBy: { createdAt: 'desc' }, select: { id: true, status: true, priceQuote: true, createdAt: true } },
        auditLogs: { take: 3, orderBy: { createdAt: 'desc' }, select: { id: true, action: true, createdAt: true, entityType: true, entityId: true } },
      },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    return user;
  }

  /**
   * Update user (admin only)
   */
  async updateUser(
    targetUserId: string,
    adminUserId: string,
    data: { role?: string; displayName?: string }
  ) {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!existingUser) {
      throw new NotFoundError('User');
    }

    // Validate role
    if (data.role && !['client', 'labeler', 'admin'].includes(data.role)) {
      throw new BadRequestError('Invalid role. Must be client, labeler, or admin');
    }

    // Prevent admin from demoting themselves if they're the only admin
    if (existingUser.id === adminUserId && data.role && data.role !== 'admin') {
      const adminCount = await prisma.user.count({
        where: { role: 'admin' },
      });

      if (adminCount <= 1) {
        throw new BadRequestError('Cannot demote the only admin user');
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        ...(data.role && { role: data.role as UserRole }),
        ...(data.displayName !== undefined && { displayName: data.displayName }),
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        ratingAvg: true,
        createdAt: true,
      },
    });

    await auditService.logAction(adminUserId, 'user.update', 'user', targetUserId, {
      role: { before: existingUser.role, after: updatedUser.role },
      displayName: { before: existingUser.displayName, after: updatedUser.displayName },
    });

    logger.info(`User updated by admin: ${targetUserId}, new role: ${data.role || 'unchanged'}`);

    return updatedUser;
  }

  /**
   * Delete user (admin only)
   */
  async deleteUser(targetUserId: string, adminUserId: string) {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!existingUser) {
      throw new NotFoundError('User');
    }

    // Prevent admin from deleting themselves
    if (existingUser.id === adminUserId) {
      throw new BadRequestError('Cannot delete your own admin account');
    }

    // Check if user has active contracts
    const activeContracts = await prisma.contract.count({
      where: {
        OR: [
          { clientUserId: targetUserId },
          { labelerUserId: targetUserId },
        ],
        status: { in: ['active', 'submitted'] },
      },
    });

    if (activeContracts > 0) {
      throw new BadRequestError('Cannot delete user with active contracts');
    }

    await prisma.user.delete({
      where: { id: targetUserId },
    });

    await auditService.logAction(adminUserId, 'user.delete', 'user', targetUserId, {
      role: existingUser.role,
      email: existingUser.email,
    });

    logger.info(`User deleted by admin: ${targetUserId}`);
  }

  // ========================================================================
  // Dashboard Stats
  // ========================================================================

  /**
   * Get platform-wide dashboard statistics.
   * All counts use real Prisma enum values from schema.prisma.
   */
  async getDashboardStats() {
    const [
      totalUsers,
      totalClients,
      totalLabelers,
      totalDatasets,
      totalAssets,
      totalListings,
      totalContracts,
      totalTasks,
      // Status breakdowns
      openListings,
      activeContracts,
      submittedContracts,
      revisionRequestedContracts,
      processingAssets,
      errorAssets,
      pendingAssets,
      uploadedAssets,
      readyTasks,
      leasedTasks,
      submittedTasks,
      rejectedTasks,
      failedSubmissions,
      processingSubmissions,
    ] = await Promise.all([
      // Totals
      prisma.user.count(),
      prisma.user.count({ where: { role: 'client' as UserRole } }),
      prisma.user.count({ where: { role: 'labeler' as UserRole } }),
      prisma.dataset.count(),
      prisma.asset.count(),
      prisma.listing.count(),
      prisma.contract.count(),
      prisma.task.count(),
      // Listing status
      prisma.listing.count({ where: { status: 'open' as ListingStatus } }),
      // Contract status
      prisma.contract.count({ where: { status: 'active' as ContractStatus } }),
      prisma.contract.count({ where: { status: 'submitted' as ContractStatus } }),
      prisma.contract.count({ where: { status: 'revision_requested' as ContractStatus } }),
      // Asset status
      prisma.asset.count({ where: { status: 'processing' as AssetStatus } }),
      prisma.asset.count({ where: { status: 'error' as AssetStatus } }),
      prisma.asset.count({ where: { status: 'pending' as AssetStatus } }),
      prisma.asset.count({ where: { status: 'uploaded' as AssetStatus } }),
      // Task status
      prisma.task.count({ where: { status: 'ready' as TaskStatus } }),
      prisma.task.count({ where: { status: 'leased' as TaskStatus } }),
      prisma.task.count({ where: { status: 'submitted' as TaskStatus } }),
      prisma.task.count({ where: { status: 'rejected' as TaskStatus } }),
      // Submission status
      prisma.submission.count({ where: { status: 'failed' as SubmissionStatus } }),
      prisma.submission.count({ where: { status: 'processing' as SubmissionStatus } }),
    ]);

    return {
      totalUsers,
      totalClients,
      totalLabelers,
      totalDatasets,
      totalAssets,
      totalListings,
      totalContracts,
      totalTasks,
      openListings,
      activeContracts,
      submittedContracts,
      revisionRequestedContracts,
      processingAssets,
      errorAssets,
      pendingAssets,
      uploadedAssets,
      readyTasks,
      leasedTasks,
      submittedTasks,
      rejectedTasks,
      failedSubmissions,
      processingSubmissions,
    };
  }

  // ========================================================================
  // Upload Monitoring
  // ========================================================================

  /**
   * Get paginated asset pipeline monitoring data.
   * Includes dataset name and owner info via real Prisma relations.
   */
  async getUploadMonitoring(
    page: number,
    limit: number,
    search?: string,
    status?: string
  ) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const skip = (safePage - 1) * safeLimit;

    const where: Prisma.AssetWhereInput = {};

    // Status filter — whitelist against real AssetStatus enum
    const validStatuses: string[] = ['pending', 'uploaded', 'processing', 'ready', 'error'];
    if (status && validStatuses.includes(status)) {
      where.status = status as AssetStatus;
    }

    // Search — objectKey or dataset name or dataset owner email/displayName
    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { objectKey: { contains: term, mode: 'insensitive' } },
        { dataset: { name: { contains: term, mode: 'insensitive' } } },
        { dataset: { owner: { email: { contains: term, mode: 'insensitive' } } } },
        { dataset: { owner: { displayName: { contains: term, mode: 'insensitive' } } } },
      ];
    }

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          datasetId: true,
          objectKey: true,
          mimeType: true,
          sizeBytes: true,
          width: true,
          height: true,
          status: true,
          processingError: true,
          createdAt: true,
          dataset: {
            select: {
              id: true,
              name: true,
              owner: {
                select: {
                  id: true,
                  email: true,
                  displayName: true,
                },
              },
            },
          },
        },
      }),
      prisma.asset.count({ where }),
    ]);

    return {
      assets,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  // ========================================================================
  // Queue Monitoring
  // ========================================================================

  /**
   * Get BullMQ queue status for asset-processing and normalize-processing.
   * Uses BullMQ API directly — no bull-board dependency.
   * Note: removeOnComplete: true means completed job history may be empty.
   */
  async getQueueMonitoring(jobLimit: number = 10) {
    const safeJobLimit = Math.min(Math.max(1, jobLimit), 50);

    const queues = [
      { name: 'asset-processing', queue: assetQueue },
      { name: 'normalize-processing', queue: normalizeQueue },
    ];

    const results = await Promise.all(
      queues.map(async ({ name, queue }) => {
        // Get counts — single BullMQ call, efficient
        const counts = await queue.getJobCounts(
          'waiting', 'active', 'delayed', 'failed', 'completed', 'paused'
        );

        // Get recent jobs from relevant states
        // Pull from waiting, active, delayed, failed (completed is usually empty due to removeOnComplete)
        const [waitingJobs, activeJobs, delayedJobs, failedJobs, completedJobs] = await Promise.all([
          queue.getJobs(['waiting'], 0, safeJobLimit - 1),
          queue.getJobs(['active'], 0, safeJobLimit - 1),
          queue.getJobs(['delayed'], 0, safeJobLimit - 1),
          queue.getJobs(['failed'], 0, safeJobLimit - 1),
          queue.getJobs(['completed'], 0, Math.min(safeJobLimit - 1, 4)),
        ]);

        const allJobs = [...waitingJobs, ...activeJobs, ...delayedJobs, ...failedJobs, ...completedJobs];

        // Map jobs to a serializable format
        const recentJobs = allJobs.slice(0, safeJobLimit).map((job) => ({
          id: job.id,
          name: job.name,
          queueName: name,
          state: job.failedReason ? 'failed' : (job.finishedOn ? 'completed' : (job.processedOn ? 'active' : 'waiting')),
          attemptsMade: job.attemptsMade,
          timestamp: job.timestamp,
          processedOn: job.processedOn ?? null,
          finishedOn: job.finishedOn ?? null,
          failedReason: job.failedReason ?? null,
          data: job.data ?? null,
        }));

        return {
          name,
          counts,
          recentJobs,
        };
      })
    );

    return { queues: results };
  }
}
