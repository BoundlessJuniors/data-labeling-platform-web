import { Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { NotFoundError, ForbiddenError, BadRequestError, ConflictError } from '../utils/errors';
import { cacheDelete } from '../lib/redis';
import logger from '../lib/logger';

// Create a new proposal (labeler applies to a listing)
export const createProposal = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { listingId, priceQuote, coverLetter } = req.body;
    const userId = req.user!.id;

    // Verify listing exists and is open
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundError('Listing');
    }

    if (listing.status !== 'open') {
      throw new BadRequestError('Cannot apply to a listing that is not open');
    }

    // Users cannot apply to their own listings
    if (listing.ownerUserId === userId) {
      throw new BadRequestError('Cannot apply to your own listing');
    }

    // Check if user already applied
    const existingProposal = await prisma.proposal.findUnique({
      where: {
        listingId_labelerUserId: {
          listingId,
          labelerUserId: userId,
        },
      },
    });

    if (existingProposal) {
      throw new ConflictError('You have already applied to this listing');
    }

    const proposal = await prisma.proposal.create({
      data: {
        listingId,
        labelerUserId: userId,
        priceQuote,
        coverLetter,
        status: 'pending',
      },
      include: {
        listing: {
          select: { id: true, title: true, priceTotal: true, currency: true },
        },
        labeler: {
          select: { id: true, email: true, displayName: true, ratingAvg: true },
        },
      },
    });

    logger.info(`Proposal created: ${proposal.id} by user ${userId} for listing ${listingId}`);

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
    const skip = (page - 1) * limit;
    const listingId = req.query.listingId as string | undefined;
    const status = req.query.status as string | undefined;

    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Build where clause
    const where: Prisma.ProposalWhereInput = {};

    if (status) {
      where.status = status as 'pending' | 'accepted' | 'rejected' | 'withdrawn';
    }

    if (listingId) {
      where.listingId = listingId;
    }

    // Role-based filtering:
    // - Labelers see their own proposals
    // - Clients see proposals on their listings
    // - Admins see all
    if (userRole === 'labeler') {
      where.labelerUserId = userId;
    } else if (userRole === 'client') {
      where.listing = { ownerUserId: userId };
    }
    // admin sees all

    const [proposals, total] = await Promise.all([
      prisma.proposal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          listing: {
            select: { id: true, title: true, priceTotal: true, currency: true, status: true },
          },
          labeler: {
            select: { id: true, email: true, displayName: true, ratingAvg: true },
          },
        },
      }),
      prisma.proposal.count({ where }),
    ]);

    res.json({
      success: true,
      data: proposals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
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

    const proposal = await prisma.proposal.findUnique({
      where: { id },
      include: {
        listing: {
          select: { 
            id: true, 
            title: true, 
            description: true,
            priceTotal: true, 
            currency: true, 
            status: true,
            ownerUserId: true,
          },
        },
        labeler: {
          select: { id: true, email: true, displayName: true, ratingAvg: true },
        },
      },
    });

    if (!proposal) {
      throw new NotFoundError('Proposal');
    }

    // Check access: labeler who applied, listing owner, or admin
    const isLabeler = proposal.labelerUserId === userId;
    const isListingOwner = proposal.listing.ownerUserId === userId;
    const isAdmin = userRole === 'admin';

    if (!isLabeler && !isListingOwner && !isAdmin) {
      throw new ForbiddenError('You do not have permission to view this proposal');
    }

    res.json({
      success: true,
      data: proposal,
    });
  } catch (error) {
    next(error);
  }
};

// Accept a proposal (client only) - Creates a Contract
export const acceptProposal = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Use transaction for atomic operations
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get proposal with listing
      const proposal = await tx.proposal.findUnique({
        where: { id },
        include: {
          listing: true,
          labeler: {
            select: { id: true, email: true, displayName: true },
          },
        },
      });

      if (!proposal) {
        throw new NotFoundError('Proposal');
      }

      // 2. Validate ownership
      if (proposal.listing.ownerUserId !== userId) {
        throw new ForbiddenError('Only the listing owner can accept proposals');
      }

      // 3. Check proposal status
      if (proposal.status !== 'pending') {
        throw new BadRequestError(`Cannot accept a proposal that is ${proposal.status}`);
      }

      // 4. Check listing status
      if (proposal.listing.status !== 'open') {
        throw new BadRequestError('Cannot accept proposals for a listing that is not open');
      }

      // 5. Update proposal to accepted
      await tx.proposal.update({
        where: { id },
        data: { status: 'accepted' },
      });

      // 6. Create the contract
      const contract = await tx.contract.create({
        data: {
          listingId: proposal.listingId,
          clientUserId: userId,
          labelerUserId: proposal.labelerUserId,
          agreedPriceTotal: proposal.priceQuote,
          currency: proposal.listing.currency,
          status: 'active',
        },
        include: {
          listing: {
            select: { id: true, title: true },
          },
          labeler: {
            select: { id: true, email: true, displayName: true },
          },
        },
      });

      // 7. Reject all other pending proposals for this listing
      await tx.proposal.updateMany({
        where: {
          listingId: proposal.listingId,
          id: { not: id },
          status: 'pending',
        },
        data: { status: 'rejected' },
      });

      // 8. Update listing status to in_progress
      await tx.listing.update({
        where: { id: proposal.listingId },
        data: { status: 'in_progress' },
      });

      return { proposal, contract };
    });

    // Invalidate cache
    await cacheDelete(`cache:/api/listings/${result.proposal.listingId}`);
    await cacheDelete(`cache:/api/listings`);

    logger.info(`Proposal ${id} accepted, Contract ${result.contract.id} created`);

    res.json({
      success: true,
      message: 'Proposal accepted and contract created',
      data: {
        proposal: { id, status: 'accepted' },
        contract: result.contract,
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

    const proposal = await prisma.proposal.findUnique({
      where: { id },
      include: {
        listing: {
          select: { ownerUserId: true },
        },
      },
    });

    if (!proposal) {
      throw new NotFoundError('Proposal');
    }

    // Only listing owner can reject
    if (proposal.listing.ownerUserId !== userId) {
      throw new ForbiddenError('Only the listing owner can reject proposals');
    }

    if (proposal.status !== 'pending') {
      throw new BadRequestError(`Cannot reject a proposal that is ${proposal.status}`);
    }

    const updatedProposal = await prisma.proposal.update({
      where: { id },
      data: { status: 'rejected' },
      include: {
        labeler: {
          select: { id: true, email: true, displayName: true },
        },
      },
    });

    logger.info(`Proposal ${id} rejected by user ${userId}`);

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

    const proposal = await prisma.proposal.findUnique({
      where: { id },
    });

    if (!proposal) {
      throw new NotFoundError('Proposal');
    }

    // Only the labeler who created the proposal can withdraw
    if (proposal.labelerUserId !== userId) {
      throw new ForbiddenError('Only the proposer can withdraw their proposal');
    }

    if (proposal.status !== 'pending') {
      throw new BadRequestError(`Cannot withdraw a proposal that is ${proposal.status}`);
    }

    const updatedProposal = await prisma.proposal.update({
      where: { id },
      data: { status: 'withdrawn' },
    });

    logger.info(`Proposal ${id} withdrawn by user ${userId}`);

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

    // Verify listing exists and user has access
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundError('Listing');
    }

    // Only listing owner or admin can see all proposals for a listing
    if (listing.ownerUserId !== userId && userRole !== 'admin') {
      throw new ForbiddenError('You do not have permission to view these proposals');
    }

    const proposals = await prisma.proposal.findMany({
      where: { listingId },
      orderBy: { createdAt: 'desc' },
      include: {
        labeler: {
          select: { id: true, email: true, displayName: true, ratingAvg: true },
        },
      },
    });

    res.json({
      success: true,
      data: proposals,
    });
  } catch (error) {
    next(error);
  }
};
