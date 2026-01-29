import { Response, NextFunction } from 'express';
import { TaskStatus, ReviewDecision, Prisma } from '@prisma/client';
import prisma from '../lib/db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors';
import logger from '../lib/logger';

// Create a review
export const createReview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { taskId, decision, notes } = req.body;
    const reviewerId = req.user!.id;

    // Verify task exists
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { contract: true },
    });

    if (!task) {
      throw new NotFoundError('Task');
    }

    // Only client or admin can review
    if (req.user?.role !== 'admin' && task.contract.clientUserId !== reviewerId) {
      throw new ForbiddenError('Only the client can review this task');
    }

    // Task must be submitted
    if (task.status !== TaskStatus.submitted) {
      throw new BadRequestError(`Cannot review task with status: ${task.status}`);
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        taskId,
        reviewerUserId: reviewerId,
        decision: decision as ReviewDecision,
        notes,
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
    const newStatus = decision === 'accept' ? TaskStatus.accepted : TaskStatus.rejected;
    await prisma.task.update({
      where: { id: taskId },
      data: { status: newStatus },
    });

    logger.info(`Review created for task ${taskId}: ${decision}`);

    res.status(201).json({
      success: true,
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

// Get reviews (with filters)
export const getReviews = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const taskId = req.query.taskId as string | undefined;
    const decision = req.query.decision as string | undefined;

    // Build where clause
    const where: Prisma.ReviewWhereInput = {};

    if (taskId) {
      where.taskId = taskId;
    }

    if (decision) {
      where.decision = decision as ReviewDecision;
    }

    // Filter based on user role
    if (req.user?.role !== 'admin') {
      where.task = {
        contract: {
          OR: [
            { clientUserId: req.user!.id },
            { labelerUserId: req.user!.id },
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

    res.json({
      success: true,
      data: reviews,
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

// Get a single review by ID
export const getReviewById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const review = await prisma.review.findUnique({
      where: { id },
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
      req.user?.role !== 'admin' &&
      review.task.contract.clientUserId !== req.user?.id &&
      review.task.contract.labelerUserId !== req.user?.id
    ) {
      throw new ForbiddenError('You do not have access to this review');
    }

    res.json({
      success: true,
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

// Resolve/update a review
export const resolveReview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { decision, notes } = req.body;

    const review = await prisma.review.findUnique({
      where: { id },
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
    if (req.user?.role !== 'admin' && review.reviewerUserId !== req.user?.id) {
      throw new ForbiddenError('Only the original reviewer can update this review');
    }

    const updatedReview = await prisma.review.update({
      where: { id },
      data: {
        decision: decision as ReviewDecision,
        notes,
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
    const newStatus = decision === 'accept' ? TaskStatus.accepted : TaskStatus.rejected;
    await prisma.task.update({
      where: { id: review.taskId },
      data: { status: newStatus },
    });

    logger.info(`Review resolved: ${id} with decision ${decision}`);

    res.json({
      success: true,
      data: updatedReview,
    });
  } catch (error) {
    next(error);
  }
};
