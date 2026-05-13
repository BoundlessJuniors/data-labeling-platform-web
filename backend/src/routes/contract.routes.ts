import { Router } from 'express';
import * as contractController from '../controllers/contract.controller';
import { authenticateAny } from '../middlewares/auth.middleware';
import { adminOrLabeler, adminOrClient, adminOnly } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { 
  idParamSchema,
  rejectContractSchema,
  cancelContractSchema,
  resolveDisputeSchema,
  qcSampleQuerySchema,
  exportContractQuerySchema,
  createContractRatingSchema
} from '../validators/validation.schemas';

const router = Router();

// All contract routes require authentication
router.use(authenticateAny);

// ============================================================================
// ARCHITECTURAL NOTE:
//   Contract creation happens exclusively through proposal acceptance:
//   PATCH /api/proposals/:id/accept → creates contract + tasks atomically.
//   There is intentionally NO POST /contracts endpoint.
// ============================================================================

// GET /api/contracts - Get all contracts
router.get(
  '/',
  contractController.getContracts
);

// GET /api/contracts/:id - Get a single contract
router.get(
  '/:id',
  validate(idParamSchema, 'params'),
  contractController.getContractById
);

// GET /api/contracts/:id/labeling-context - Get contract-level labeling metadata
router.get(
  '/:id/labeling-context',
  validate(idParamSchema, 'params'),
  contractController.getLabelingContext
);

// GET /api/contracts/:id/qc-sample - Get QC sample task set (client/admin)
router.get(
  '/:id/qc-sample',
  adminOrClient,
  validate(idParamSchema, 'params'),
  validate(qcSampleQuerySchema, 'query'),
  contractController.getQcSample
);

// GET /api/contracts/:id/export - Export labeled data (client/admin)
router.get(
  '/:id/export',
  adminOrClient,
  validate(idParamSchema, 'params'),
  validate(exportContractQuerySchema, 'query'),
  contractController.exportContract
);

// PATCH /api/contracts/:id/submit - Submit contract (labeler or admin)
router.patch(
  '/:id/submit',
  adminOrLabeler,
  validate(idParamSchema, 'params'),
  contractController.submitContract
);

// PATCH /api/contracts/:id/approve - Approve contract (client)
router.patch(
  '/:id/approve',
  adminOrClient,
  validate(idParamSchema, 'params'),
  contractController.approveContract
);

// PATCH /api/contracts/:id/reject - Reject contract (client)
router.patch(
  '/:id/reject',
  adminOrClient,
  validate(idParamSchema, 'params'),
  validate(rejectContractSchema),
  contractController.rejectContract
);

// PATCH /api/contracts/:id/cancel - Cancel contract
router.patch(
  '/:id/cancel',
  validate(idParamSchema, 'params'),
  validate(cancelContractSchema),
  contractController.cancelContract
);

// PATCH /api/contracts/:id/resolve-dispute - Resolve disputed contract (admin only)
router.patch(
  '/:id/resolve-dispute',
  adminOnly,
  validate(idParamSchema, 'params'),
  validate(resolveDisputeSchema),
  contractController.resolveDispute
);

// POST /api/contracts/:id/normalize-retry - Retry normalize job (admin only)
router.post(
  '/:id/normalize-retry',
  adminOnly,
  validate(idParamSchema, 'params'),
  contractController.retryNormalize
);

// POST /api/contracts/:id/rating - Rate labeler (client)
router.post(
  '/:id/rating',
  validate(idParamSchema, 'params'),
  validate(createContractRatingSchema),
  contractController.createContractRating
);

export default router;
