import { Router } from 'express';
import * as reviewController from '../controllers/review.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { 
  createReviewSchema,
  resolveReviewSchema,
  idParamSchema
} from '../validators/validation.schemas';

const router = Router();

// All review routes require authentication
router.use(authenticate);

// GET /api/reviews - Get all reviews
router.get(
  '/',
  reviewController.getReviews
);

// POST /api/reviews - Create a new review
router.post(
  '/',
  validate(createReviewSchema),
  reviewController.createReview
);

// GET /api/reviews/:id - Get a single review
router.get(
  '/:id',
  validate(idParamSchema, 'params'),
  reviewController.getReviewById
);

// PATCH /api/reviews/:id/resolve - Resolve/update a review
router.patch(
  '/:id/resolve',
  validate(idParamSchema, 'params'),
  validate(resolveReviewSchema),
  reviewController.resolveReview
);

export default router;
