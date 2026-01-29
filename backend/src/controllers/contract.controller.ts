import { Response, NextFunction } from 'express';
import { ContractStatus, ListingStatus, Prisma } from '@prisma/client';
import prisma from '../lib/db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { NotFoundError, ForbiddenError, BadRequestError, ConflictError } from '../utils/errors';
import logger from '../lib/logger';

// Create a new contract (Labeler applies to a listing)
export const createContract = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { listingId } = req.body;
    const labelerId = req.user!.id;

    // Verify user is a labeler
    if (req.user!.role !== 'labeler' && req.user!.role !== 'admin') {
      throw new ForbiddenError('Only labelers can apply to listings');
    }

    // Verify listing exists and is open
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { contract: true },
    });

    if (!listing) {
      throw new NotFoundError('Listing');
    }

    if (listing.status !== ListingStatus.open) {
      throw new BadRequestError('Listing is not open for applications');
    }

    // Check if listing already has a contract
    if (listing.contract) {
      throw new ConflictError('Listing already has an active contract');
    }

    // Check if labeler already applied to this listing
    // (This shouldn't happen since listing can have only one contract, but good to check)

    // Create contract
    const contract = await prisma.contract.create({
      data: {
        listingId,
        clientUserId: listing.ownerUserId,
        labelerUserId: labelerId,
        agreedPriceTotal: listing.priceTotal,
        currency: listing.currency,
        status: ContractStatus.active,
      },
      include: {
        listing: {
          select: { id: true, title: true },
        },
        client: {
          select: { id: true, email: true, displayName: true },
        },
        labeler: {
          select: { id: true, email: true, displayName: true },
        },
      },
    });

    // Update listing status to in_progress
    await prisma.listing.update({
      where: { id: listingId },
      data: { status: ListingStatus.in_progress },
    });

    logger.info(`Contract created: ${contract.id} by labeler ${labelerId}`);

    res.status(201).json({
      success: true,
      data: contract,
    });
  } catch (error) {
    next(error);
  }
};

// Get all contracts (with filters)
export const getContracts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status as string | undefined;
    const ownOnly = req.query.ownOnly === 'true';

    // Build where clause
    const where: Prisma.ContractWhereInput = {};

    if (status) {
      where.status = status as ContractStatus;
    }

    // Filter by user role
    if (req.user?.role === 'admin' && !ownOnly) {
      // Admin sees all
    } else if (req.user?.role === 'client' || ownOnly) {
      where.OR = [
        { clientUserId: req.user!.id },
        { labelerUserId: req.user!.id },
      ];
    } else if (req.user?.role === 'labeler') {
      where.labelerUserId = req.user!.id;
    }

    const [contracts, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startedAt: 'desc' },
        include: {
          listing: {
            select: { id: true, title: true },
          },
          client: {
            select: { id: true, email: true, displayName: true },
          },
          labeler: {
            select: { id: true, email: true, displayName: true },
          },
          _count: {
            select: { tasks: true },
          },
        },
      }),
      prisma.contract.count({ where }),
    ]);

    res.json({
      success: true,
      data: contracts,
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

// Get a single contract by ID
export const getContractById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        listing: {
          include: {
            dataset: {
              select: { id: true, name: true },
            },
            labelSet: {
              include: { labels: true },
            },
          },
        },
        client: {
          select: { id: true, email: true, displayName: true, ratingAvg: true },
        },
        labeler: {
          select: { id: true, email: true, displayName: true, ratingAvg: true },
        },
        tasks: {
          select: { id: true, status: true },
        },
        _count: {
          select: { tasks: true, payments: true },
        },
      },
    });

    if (!contract) {
      throw new NotFoundError('Contract');
    }

    // Check access rights
    if (
      req.user?.role !== 'admin' &&
      contract.clientUserId !== req.user?.id &&
      contract.labelerUserId !== req.user?.id
    ) {
      throw new ForbiddenError('You do not have access to this contract');
    }

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

    const contract = await prisma.contract.findUnique({
      where: { id },
    });

    if (!contract) {
      throw new NotFoundError('Contract');
    }

    // Only client or admin can approve
    if (req.user?.role !== 'admin' && contract.clientUserId !== req.user?.id) {
      throw new ForbiddenError('Only the client can approve this contract');
    }

    // Can only approve submitted contracts
    if (contract.status !== ContractStatus.submitted) {
      throw new BadRequestError(`Cannot approve contract with status: ${contract.status}`);
    }

    const updatedContract = await prisma.contract.update({
      where: { id },
      data: {
        status: ContractStatus.approved,
        completedAt: new Date(),
      },
      include: {
        listing: { select: { id: true, title: true } },
        client: { select: { id: true, email: true, displayName: true } },
        labeler: { select: { id: true, email: true, displayName: true } },
      },
    });

    // Update listing status to completed
    await prisma.listing.update({
      where: { id: contract.listingId },
      data: { status: ListingStatus.completed },
    });

    logger.info(`Contract approved: ${id}`);

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

    const contract = await prisma.contract.findUnique({
      where: { id },
    });

    if (!contract) {
      throw new NotFoundError('Contract');
    }

    // Only client or admin can reject
    if (req.user?.role !== 'admin' && contract.clientUserId !== req.user?.id) {
      throw new ForbiddenError('Only the client can reject this contract');
    }

    // Can only reject submitted contracts
    if (contract.status !== ContractStatus.submitted) {
      throw new BadRequestError(`Cannot reject contract with status: ${contract.status}`);
    }

    const updatedContract = await prisma.contract.update({
      where: { id },
      data: {
        status: ContractStatus.rejected,
      },
      include: {
        listing: { select: { id: true, title: true } },
        client: { select: { id: true, email: true, displayName: true } },
        labeler: { select: { id: true, email: true, displayName: true } },
      },
    });

    logger.info(`Contract rejected: ${id}, reason: ${reason || 'No reason provided'}`);

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

    const contract = await prisma.contract.findUnique({
      where: { id },
    });

    if (!contract) {
      throw new NotFoundError('Contract');
    }

    // Client, labeler, or admin can cancel
    if (
      req.user?.role !== 'admin' &&
      contract.clientUserId !== req.user?.id &&
      contract.labelerUserId !== req.user?.id
    ) {
      throw new ForbiddenError('You do not have permission to cancel this contract');
    }

    // Can only cancel active contracts
    if (contract.status !== ContractStatus.active) {
      throw new BadRequestError(`Cannot cancel contract with status: ${contract.status}`);
    }

    const updatedContract = await prisma.contract.update({
      where: { id },
      data: {
        status: ContractStatus.cancelled,
      },
      include: {
        listing: { select: { id: true, title: true } },
        client: { select: { id: true, email: true, displayName: true } },
        labeler: { select: { id: true, email: true, displayName: true } },
      },
    });

    // Reopen the listing
    await prisma.listing.update({
      where: { id: contract.listingId },
      data: { status: ListingStatus.open },
    });

    logger.info(`Contract cancelled: ${id}, reason: ${reason || 'No reason provided'}`);

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

    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        tasks: {
          where: {
            status: { not: 'accepted' },
          },
        },
      },
    });

    if (!contract) {
      throw new NotFoundError('Contract');
    }

    // Only labeler or admin can submit
    if (req.user?.role !== 'admin' && contract.labelerUserId !== req.user?.id) {
      throw new ForbiddenError('Only the labeler can submit this contract');
    }

    // Can only submit active contracts
    if (contract.status !== ContractStatus.active) {
      throw new BadRequestError(`Cannot submit contract with status: ${contract.status}`);
    }

    // Check if all tasks are completed
    if (contract.tasks.length > 0) {
      throw new BadRequestError('Not all tasks are completed yet');
    }

    const updatedContract = await prisma.contract.update({
      where: { id },
      data: {
        status: ContractStatus.submitted,
      },
      include: {
        listing: { select: { id: true, title: true } },
        client: { select: { id: true, email: true, displayName: true } },
        labeler: { select: { id: true, email: true, displayName: true } },
      },
    });

    logger.info(`Contract submitted: ${id}`);

    res.json({
      success: true,
      data: updatedContract,
    });
  } catch (error) {
    next(error);
  }
};
