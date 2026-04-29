import { Router } from 'express';
import authRoutes from './auth.routes';
import datasetRoutes from './dataset.routes';
import assetRoutes from './asset.routes';
import labelsetRoutes from './labelset.routes';
import listingRoutes from './listing.routes';
import contractRoutes from './contract.routes';
import paymentRoutes from './payment.routes';
import taskRoutes from './task.routes';
import annotationRoutes from './annotation.routes';
import reviewRoutes from './review.routes';
import adminRoutes from './admin.routes';
import proposalRoutes from './proposal.routes';
import * as proposalController from '../controllers/proposal.controller';
import * as annotationController from '../controllers/annotation.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { idParamSchema } from '../validators/validation.schemas';

const router = Router();

// Mount all route modules
router.use('/auth', authRoutes);
router.use('/datasets', datasetRoutes);
router.use('/assets', assetRoutes);
router.use('/labelsets', labelsetRoutes);
router.use('/listings', listingRoutes);
router.use('/contracts', contractRoutes);
router.use('/payments', paymentRoutes);
router.use('/tasks', taskRoutes);
router.use('/annotations', annotationRoutes);
router.use('/reviews', reviewRoutes);
router.use('/admin', adminRoutes);
router.use('/proposals', proposalRoutes);

// ============================================================================
// Special routes (mounted at top level for cleaner URLs)
// ============================================================================

// ARCHITECTURAL NOTE:
//   Task generation happens exclusively inside ProposalService.acceptProposal.
//   There is intentionally no POST /listings/:id/generate-tasks endpoint.

// GET /api/tasks/:id/annotations (mounted directly for cleaner URL)

router.get(
  '/tasks/:id/annotations',
  authenticate,
  validate(idParamSchema, 'params'),
  annotationController.getTaskAnnotations
);

// GET /api/listings/:id/proposals (get all proposals for a listing)
router.get(
  '/listings/:listingId/proposals',
  authenticate,
  proposalController.getListingProposals
);

export default router;
