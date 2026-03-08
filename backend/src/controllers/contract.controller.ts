import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ContractService } from '../services/contract.service';

const contractService = new ContractService();

// ============================================================================
// ARCHITECTURAL NOTE:
//   Contract creation happens exclusively through proposal acceptance
//   (ProposalService.acceptProposal). There is no direct createContract
//   controller. See proposal.controller.ts → acceptProposal.
// ============================================================================

// Get all contracts (with filters)
export const getContracts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string | undefined;
    const ownOnly = req.query.ownOnly === 'true';
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const result = await contractService.getContracts(
      page,
      limit,
      userId,
      userRole,
      status,
      ownOnly
    );

    res.json({
      success: true,
      data: result.contracts,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// Get a single contract by ID
export const getContractById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const contract = await contractService.getContractById(id, userId, userRole);

    res.json({
      success: true,
      data: contract,
    });
  } catch (error) {
    next(error);
  }
};

// Approve a contract (Client approves labeler's work)
export const approveContract = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const updatedContract = await contractService.approveContract(id, userId, userRole);

    res.json({
      success: true,
      data: updatedContract,
    });
  } catch (error) {
    next(error);
  }
};

// Reject a contract
export const rejectContract = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const updatedContract = await contractService.rejectContract(id, userId, userRole, reason);

    res.json({
      success: true,
      data: updatedContract,
    });
  } catch (error) {
    next(error);
  }
};

// Cancel a contract
export const cancelContract = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const updatedContract = await contractService.cancelContract(id, userId, userRole, reason);

    res.json({
      success: true,
      data: updatedContract,
    });
  } catch (error) {
    next(error);
  }
};

// Submit contract (Labeler submits completed work)
export const submitContract = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const updatedContract = await contractService.submitContract(id, userId, userRole);

    res.json({
      success: true,
      data: updatedContract,
    });
  } catch (error) {
    next(error);
  }
};

// Get QC sample for a contract (Client/Admin)
export const getQcSample = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const size = parseInt(req.query.size as string) || 100;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const result = await contractService.getQcSample(id, userId, userRole, size);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Retry normalize job (Admin only)
export const retryNormalize = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const result = await contractService.retryNormalize(id, userId, userRole);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

