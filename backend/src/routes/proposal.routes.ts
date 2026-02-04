import { Router } from 'express';
import * as proposalController from '../controllers/proposal.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createProposalSchema, idParamSchema } from '../validators/validation.schemas';

const router = Router();

// POST /api/proposals - Create a new proposal (labeler applies to listing)
router.post(
  '/',
  authenticate,
  validate(createProposalSchema),
  proposalController.createProposal
);

// GET /api/proposals - Get all proposals (filtered by role)
router.get(
  '/',
  authenticate,
  proposalController.getProposals
);

// GET /api/proposals/:id - Get a single proposal
router.get(
  '/:id',
  authenticate,
  validate(idParamSchema, 'params'),
  proposalController.getProposalById
);

// PATCH /api/proposals/:id/accept - Accept proposal (client only)
router.patch(
  '/:id/accept',
  authenticate,
  validate(idParamSchema, 'params'),
  proposalController.acceptProposal
);

// PATCH /api/proposals/:id/reject - Reject proposal (client only)
router.patch(
  '/:id/reject',
  authenticate,
  validate(idParamSchema, 'params'),
  proposalController.rejectProposal
);

// PATCH /api/proposals/:id/withdraw - Withdraw proposal (labeler only)
router.patch(
  '/:id/withdraw',
  authenticate,
  validate(idParamSchema, 'params'),
  proposalController.withdrawProposal
);

export default router;
