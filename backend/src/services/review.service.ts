import { Prisma, ReviewDecision, TaskStatus, UserRole } from '@prisma/client';
import prisma from '../lib/db';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors';
import logger from '../lib/logger';
import { auditService } from './audit.service';

export class ReviewService {
  /**
   * Create a review
   */
  async createReview(
    reviewerId: string,
    reviewerRole: UserRole,
    data: {
      taskId: string;
      decision: ReviewDecision;
      notes?: string;
    }
  ) {
    // Verify task exists
    const task = await prisma.task.findUnique({
      where: { id: data.taskId },
      include: { contract: true },
    });

    if (!task) {
      throw new NotFoundError('Task');
    }

    // Only client or admin can review
    if (reviewerRole !== 'admin' && task.contract.clientUserId !== reviewerId) {
      throw new ForbiddenError('Only the client can review this task');
    }

    // Task must be submitted
    if (task.status !== TaskStatus.submitted) {
      throw new BadRequestError(`Cannot review task with status: ${task.status}`);
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        taskId: data.taskId,
        reviewerUserId: reviewerId,
        decision: data.decision,
        notes: data.notes,
      },
      include: {
        task: {
          select: { id: true, status: true },
        },
        reviewer: {
          select: { id: true, email: true, displayName: true },
        },
      },
    });

    // Update task status based on decision
    const newStatus = data.decision === ReviewDecision.accept ? TaskStatus.accepted : TaskStatus.rejected;
    await prisma.task.update({
      where: { id: data.taskId },
      data: { status: newStatus },
    });

    logger.info(`Review created for task ${data.taskId}: ${data.decision}`);

    if (reviewerRole === 'admin') {
      await auditService.logAction(reviewerId, 'review.create', 'review', review.id, {
        taskId: data.taskId,
        decision: data.decision,
      });
    }

    return review;
  }

  /**
   * Get reviews (with filters)
   */
  async getReviews(
    page: number,
    limit: number,
    userId: string,
    userRole: UserRole,
    filters: {
      taskId?: string;
      decision?: string;
    }
  ) {
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.ReviewWhereInput = {};

    if (filters.taskId) {
      where.taskId = filters.taskId;
    }

    if (filters.decision) {
      where.decision = filters.decision as ReviewDecision;
    }

    // Filter based on user role
    if (userRole !== 'admin') {
      where.task = {
        contract: {
          OR: [
            { clientUserId: userId },
            { labelerUserId: userId },
          ],
        },
      };
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          task: {
            select: { id: true, status: true, assetId: true },
          },
          reviewer: {
            select: { id: true, email: true, displayName: true },
          },
        },
      }),
      prisma.review.count({ where }),
    ]);

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single review by ID
   */
  async getReviewById(reviewId: string, userId: string, userRole: UserRole) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        task: {
          include: {
            asset: true,
            contract: {
              select: {
                clientUserId: true,
                labelerUserId: true,
              },
            },
          },
        },
        reviewer: {
          select: { id: true, email: true, displayName: true },
        },
      },
    });

    if (!review) {
      throw new NotFoundError('Review');
    }

    // Check access rights
    if (
      userRole !== 'admin' &&
      review.task.contract.clientUserId !== userId &&
      review.task.contract.labelerUserId !== userId
    ) {
      throw new ForbiddenError('You do not have access to this review');
    }

    return {
      ...review,
      task: {
        ...review.task,
        asset: review.task.asset ? {
          ...review.task.asset,
          sizeBytes: review.task.asset.sizeBytes?.toString() ?? null,
        } : null,
      },
    };
  }

  /**
   * Resolve/update a review
   */
  async resolveReview(
    reviewId: string,
    userId: string,
    userRole: UserRole,
    data: {
      decision: ReviewDecision;
      notes?: string;
    }
  ) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        task: {
          include: { contract: true },
        },
      },
    });

    if (!review) {
      throw new NotFoundError('Review');
    }

    // Only original reviewer or admin can update
    if (userRole !== 'admin' && review.reviewerUserId !== userId) {
      throw new ForbiddenError('Only the original reviewer can update this review');
    }

    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        decision: data.decision,
        notes: data.notes,
      },
      include: {
        task: {
          select: { id: true, status: true },
        },
        reviewer: {
          select: { id: true, email: true, displayName: true },
        },
      },
    });

    // Update task status based on new decision
    const newStatus = data.decision === ReviewDecision.accept ? TaskStatus.accepted : TaskStatus.rejected;
    await prisma.task.update({
      where: { id: review.taskId },
      data: { status: newStatus },
    });

    logger.info(`Review resolved: ${reviewId} with decision ${data.decision}`);

    if (userRole === 'admin') {
      await auditService.logAction(userId, 'review.resolve', 'review', reviewId, {
        taskId: review.taskId,
        decision: data.decision,
      });
    }

    return updatedReview;
  }
}
