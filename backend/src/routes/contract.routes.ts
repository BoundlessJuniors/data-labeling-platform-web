import { Router } from 'express';
import * as contractController from '../controllers/contract.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { adminOrLabeler, adminOrClient, adminOnly } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { 
  createContractSchema, 
  idParamSchema,
  rejectContractSchema,
  cancelContractSchema,
  qcSampleQuerySchema
} from '../validators/validation.schemas';

const router = Router();

// All contract routes require authentication
router.use(authenticate);

// GET /api/contracts - Get all contracts
router.get(
  '/',
  contractController.getContracts
);

// POST /api/contracts - Create a new contract (labeler applies)
router.post(
  '/',
  validate(createContractSchema),
  contractController.createContract
);

// GET /api/contracts/:id - Get a single contract
router.get(
  '/:id',
  validate(idParamSchema, 'params'),
  contractController.getContractById
);

// GET /api/contracts/:id/qc-sample - Get QC sample task set (client/admin)
router.get(
  '/:id/qc-sample',
  adminOrClient,
  validate(idParamSchema, 'params'),
  validate(qcSampleQuerySchema, 'query'),
  contractController.getQcSample
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

// POST /api/contracts/:id/normalize-retry - Retry normalize job (admin only)
router.post(
  '/:id/normalize-retry',
  adminOnly,
  validate(idParamSchema, 'params'),
  contractController.retryNormalize
);

export default router;

