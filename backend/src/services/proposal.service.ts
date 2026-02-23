import { Prisma } from '@prisma/client';
import { UserRole } from '@prisma/client';
import prisma from '../lib/db';
import { NotFoundError, ForbiddenError, BadRequestError, ConflictError } from '../utils/errors';
import { cacheDelete } from '../lib/redis';
import logger from '../lib/logger';

export class ProposalService {
  /**
   * Create a new proposal (labeler applies to a listing)
   */
  async createProposal(
    listingId: string,
    labelerUserId: string,
    priceQuote: number,
    coverLetter?: string
  ) {
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
    if (listing.ownerUserId === labelerUserId) {
      throw new BadRequestError('Cannot apply to your own listing');
    }

    // Check if user already applied
    const existingProposal = await prisma.proposal.findUnique({
      where: {
        listingId_labelerUserId: {
          listingId,
          labelerUserId,
        },
      },
    });

    if (existingProposal) {
      throw new ConflictError('You have already applied to this listing');
    }

    const proposal = await prisma.proposal.create({
      data: {
        listingId,
        labelerUserId,
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

    logger.info(`Proposal created: ${proposal.id} by user ${labelerUserId} for listing ${listingId}`);

    return proposal;
  }

  /**
   * Get all proposals with filtering and pagination
   */
  async getProposals(
    page: number,
    limit: number,
    userId: string,
    userRole: UserRole,
    listingId?: string,
    status?: string
  ) {
    const skip = (page - 1) * limit;

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

    return {
      proposals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single proposal by ID with access control
   */
  async getProposalById(proposalId: string, userId: string, userRole: UserRole) {
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
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

    return proposal;
  }

  /**
   * Accept a proposal (client only) — Creates a Contract + Tasks inside a transaction
   */
  async acceptProposal(proposalId: string, clientUserId: string) {
    // Use transaction for atomic operations
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get proposal with listing
      const proposal = await tx.proposal.findUnique({
        where: { id: proposalId },
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
      if (proposal.listing.ownerUserId !== clientUserId) {
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
        where: { id: proposalId },
        data: { status: 'accepted' },
      });

      // 6. Create the contract
      const contract = await tx.contract.create({
        data: {
          listingId: proposal.listingId,
          clientUserId,
          labelerUserId: proposal.labelerUserId,
          agreedPriceTotal: proposal.priceQuote,
          currency: proposal.listing.currency,
          status: 'active',
        },
        include: {
          listing: {
            select: { id: true, title: true, datasetId: true },
          },
          labeler: {
            select: { id: true, email: true, displayName: true },
          },
        },
      });

      // 6.1. Find all assets in the dataset
      const assets = await tx.asset.findMany({
        where: { datasetId: contract.listing.datasetId },
        select: { id: true },
      });

      if (assets.length === 0) {
        throw new BadRequestError('Dataset is empty, cannot create tasks.');
      }

      // 6.2. Create a task for each asset (Bulk Insert)
      await tx.task.createMany({
        data: assets.map((asset) => ({
          contractId: contract.id,
          assetId: asset.id,
          status: 'ready',
          attemptCount: 0,
          annotationCount: 0,
        })),
      });

      logger.info(`${assets.length} tasks created for contract ${contract.id}`);

      // 7. Reject all other pending proposals for this listing
      await tx.proposal.updateMany({
        where: {
          listingId: proposal.listingId,
          id: { not: proposalId },
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
    await cacheDelete(`cache:/api/v1/listings/${result.proposal.listingId}`);
    await cacheDelete(`cache:/api/v1/listings`);

    logger.info(`Proposal ${proposalId} accepted, Contract ${result.contract.id} created`);

    return result;
  }

  /**
   * Reject a proposal (client only)
   */
  async rejectProposal(proposalId: string, userId: string) {
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
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
      where: { id: proposalId },
      data: { status: 'rejected' },
      include: {
        labeler: {
          select: { id: true, email: true, displayName: true },
        },
      },
    });

    logger.info(`Proposal ${proposalId} rejected by user ${userId}`);

    return updatedProposal;
  }

  /**
   * Withdraw a proposal (labeler only)
   */
  async withdrawProposal(proposalId: string, userId: string) {
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
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
      where: { id: proposalId },
      data: { status: 'withdrawn' },
    });

    logger.info(`Proposal ${proposalId} withdrawn by user ${userId}`);

    return updatedProposal;
  }

  /**
   * Get proposals for a specific listing (for listing detail page)
   */
  async getListingProposals(listingId: string, userId: string, userRole: UserRole) {
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

    return proposals;
  }
}
