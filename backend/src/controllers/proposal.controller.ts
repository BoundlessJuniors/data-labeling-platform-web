import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ProposalService } from '../services/proposal.service';

const proposalService = new ProposalService();

// Create a new proposal (labeler or admin only)
export const createProposal = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { listingId, priceQuote, coverLetter, deliveryDays } = req.body;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const proposal = await proposalService.createProposal(
      listingId,
      userId,
      userRole,
      priceQuote,
      deliveryDays,
      coverLetter
    );

    res.status(201).json({
      success: true,
      data: proposal,
    });
  } catch (error) {
    next(error);
  }
};

// Get all proposals (with filtering)
export const getProposals = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const listingId = req.query.listingId as string | undefined;
    const status = req.query.status as string | undefined;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const result = await proposalService.getProposals(
      page,
      limit,
      userId,
      userRole,
      listingId,
      status
    );

    res.json({
      success: true,
      data: result.proposals,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// Get a single proposal by ID
export const getProposalById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const proposal = await proposalService.getProposalById(id, userId, userRole);

    res.json({
      success: true,
      data: proposal,
    });
  } catch (error) {
    next(error);
  }
};

// Accept a proposal (client only) - Creates a Contract + auto-initializes Payment
export const acceptProposal = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const result = await proposalService.acceptProposal(id, userId);

    res.json({
      success: true,
      message: 'Proposal accepted. Payment is required to activate the contract.',
      data: {
        proposal: result.proposal,
        contract: result.contract,
        payment: result.payment,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Reject a proposal (client only)
export const rejectProposal = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const updatedProposal = await proposalService.rejectProposal(id, userId);

    res.json({
      success: true,
      data: updatedProposal,
    });
  } catch (error) {
    next(error);
  }
};

// Withdraw a proposal (labeler only)
export const withdrawProposal = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const updatedProposal = await proposalService.withdrawProposal(id, userId);

    res.json({
      success: true,
      data: updatedProposal,
    });
  } catch (error) {
    next(error);
  }
};

// Get proposals for a specific listing (for listing detail page)
export const getListingProposals = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { listingId } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const proposals = await proposalService.getListingProposals(
      listingId,
      userId,
      userRole
    );

    res.json({
      success: true,
      data: proposals,
    });
  } catch (error) {
    next(error);
  }
};
