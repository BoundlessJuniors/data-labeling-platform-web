// ============================================================================
// Payment Routes — Phase 2
// All routes require authentication.
//
// Route order is important:
//   /contracts/:contractId/init  — must come before /:id to avoid shadowing
//   /contracts/:contractId       — same reason
//   /:id                         — then specific payment by ID
//   /:id/mock-success
//   /:id/mock-fail
// ============================================================================

import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  idParamSchema,
  contractIdParamSchema,
} from '../validators/validation.schemas';

const router = Router();

// All payment routes require authentication
router.use(authenticate);

// ── Contract-scoped routes ─────────────────────────────────────────────────

// POST /api/v1/payments/contracts/:contractId/init
// Initialise a pending payment for a contract (client or admin).
router.post(
  '/contracts/:contractId/init',
  validate(contractIdParamSchema, 'params'),
  paymentController.initPaymentForContract
);

// GET /api/v1/payments/contracts/:contractId
// Retrieve the latest payment for a contract (client, labeler, or admin).
router.get(
  '/contracts/:contractId',
  validate(contractIdParamSchema, 'params'),
  paymentController.getPaymentByContract
);

// ── Payment-ID routes ──────────────────────────────────────────────────────

// GET /api/v1/payments/:id
// Retrieve a payment by its own ID.
router.get(
  '/:id',
  validate(idParamSchema, 'params'),
  paymentController.getPaymentById
);

// POST /api/v1/payments/:id/mock-success
// Simulate a successful payment (dev / mock provider only).
router.post(
  '/:id/mock-success',
  validate(idParamSchema, 'params'),
  paymentController.mockSuccess
);

// POST /api/v1/payments/:id/mock-fail
// Simulate a failed payment (dev / mock provider only).
router.post(
  '/:id/mock-fail',
  validate(idParamSchema, 'params'),
  paymentController.mockFail
);

export default router;
