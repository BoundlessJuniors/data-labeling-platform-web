// ============================================================================
// Payment Controller — Phase 2
// Thin layer: delegates to PaymentService, formats HTTP responses.
// ============================================================================

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { paymentService } from '../services/payment.service';

// POST /api/v1/payments/contracts/:contractId/init
export const initPaymentForContract = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { contractId } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const payment = await paymentService.initPaymentForContract(contractId, userId, userRole);

    res.status(201).json({
      success: true,
      message: 'Payment initialized',
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/payments/:id
export const getPaymentById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const payment = await paymentService.getPaymentById(id, userId, userRole);

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/payments/contracts/:contractId
export const getPaymentByContract = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { contractId } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const payment = await paymentService.getPaymentByContract(contractId, userId, userRole);

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/payments/:id/mock-success
export const mockSuccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const payment = await paymentService.mockSuccess(id, userId, userRole);

    res.json({
      success: true,
      message: 'Mock payment completed and contract activated',
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/payments/:id/mock-fail
export const mockFail = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const payment = await paymentService.mockFail(id, userId, userRole);

    res.json({
      success: true,
      message: 'Mock payment failed',
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};
