import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ReviewService } from '../services/review.service';
import { ReviewDecision } from '@prisma/client';

const reviewService = new ReviewService();

// Create a review
export const createReview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { taskId, decision, notes } = req.body;
    const reviewerId = req.user!.id;
    const reviewerRole = req.user!.role;

    const review = await reviewService.createReview(reviewerId, reviewerRole, {
      taskId,
      decision: decision as ReviewDecision,
      notes,
    });

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
    const taskId = req.query.taskId as string | undefined;
    const decision = req.query.decision as string | undefined;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const result = await reviewService.getReviews(
      page,
      limit,
      userId,
      userRole,
      { taskId, decision }
    );

    res.json({
      success: true,
      data: result.reviews,
      pagination: result.pagination,
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
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const review = await reviewService.getReviewById(id, userId, userRole);

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
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const updatedReview = await reviewService.resolveReview(id, userId, userRole, {
      decision: decision as ReviewDecision,
      notes,
    });

    res.json({
      success: true,
      data: updatedReview,
    });
  } catch (error) {
    next(error);
  }
};
