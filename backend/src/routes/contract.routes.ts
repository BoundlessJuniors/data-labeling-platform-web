import { Router } from 'express';
import * as contractController from '../controllers/contract.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { labelerOnly, adminOrClient } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { 
  createContractSchema, 
  idParamSchema,
  rejectContractSchema 
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

// PATCH /api/contracts/:id/submit - Submit contract (labeler)
router.patch(
  '/:id/submit',
  validate(idParamSchema, 'params'),
  contractController.submitContract
);

// PATCH /api/contracts/:id/approve - Approve contract (client)
router.patch(
  '/:id/approve',
  validate(idParamSchema, 'params'),
  contractController.approveContract
);

// PATCH /api/contracts/:id/reject - Reject contract (client)
router.patch(
  '/:id/reject',
  validate(idParamSchema, 'params'),
  validate(rejectContractSchema),
  contractController.rejectContract
);

// PATCH /api/contracts/:id/cancel - Cancel contract
router.patch(
  '/:id/cancel',
  validate(idParamSchema, 'params'),
  contractController.cancelContract
);

export default router;
