import { ContractStatus, ListingStatus, Prisma } from '@prisma/client';
import { UserRole } from '@prisma/client';
import prisma from '../lib/db';
import { NotFoundError, ForbiddenError, BadRequestError, ConflictError } from '../utils/errors';
import logger from '../lib/logger';

export class ContractService {
  /**
   * Create a new contract (labeler applies to a listing)
   */
  async createContract(labelerId: string, labelerRole: UserRole, listingId: string) {
    // Verify user is a labeler
    if (labelerRole !== 'labeler' && labelerRole !== 'admin') {
      throw new ForbiddenError('Only labelers can apply to listings');
    }

    // Verify listing exists and is open
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { contracts: true },
    });

    if (!listing) {
      throw new NotFoundError('Listing');
    }

    if (listing.status !== ListingStatus.open) {
      throw new BadRequestError('Listing is not open for applications');
    }

    // Check if listing already has an active contract
    const activeContracts = listing.contracts.filter((c) => c.status === 'active');
    if (activeContracts.length > 0) {
      throw new ConflictError('Listing already has an active contract');
    }

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

    return contract;
  }

  /**
   * Get all contracts with filtering and pagination
   */
  async getContracts(
    page: number,
    limit: number,
    userId: string,
    userRole: UserRole,
    status?: string,
    ownOnly?: boolean
  ) {
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.ContractWhereInput = {};

    if (status) {
      where.status = status as ContractStatus;
    }

    // Filter by user role
    if (userRole === 'admin' && !ownOnly) {
      // Admin sees all
    } else if (userRole === 'client' || ownOnly) {
      where.OR = [
        { clientUserId: userId },
        { labelerUserId: userId },
      ];
    } else if (userRole === 'labeler') {
      where.labelerUserId = userId;
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

    return {
      contracts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single contract by ID with access control
   */
  async getContractById(contractId: string, userId: string, userRole: UserRole) {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
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
      userRole !== 'admin' &&
      contract.clientUserId !== userId &&
      contract.labelerUserId !== userId
    ) {
      throw new ForbiddenError('You do not have access to this contract');
    }

    return contract;
  }

  /**
   * Submit a contract (labeler submits completed work)
   */
  async submitContract(contractId: string, userId: string, userRole: UserRole) {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundError('Contract');
    }

    // Only labeler or admin can submit
    if (userRole !== 'admin' && contract.labelerUserId !== userId) {
      throw new ForbiddenError('Only the labeler can submit this contract');
    }

    // Can only submit active contracts
    if (contract.status !== ContractStatus.active) {
      throw new BadRequestError(`Cannot submit contract with status: ${contract.status}`);
    }

    // Check if any tasks are still incomplete (ready, leased, or rejected)
    const incompleteTasks = await prisma.task.count({
      where: {
        contractId,
        status: {
          in: ['ready', 'leased', 'rejected'],
        },
      },
    });

    if (incompleteTasks > 0) {
      throw new BadRequestError('Cannot submit contract. All tasks must be submitted or accepted before handing over.');
    }

    const updatedContract = await prisma.contract.update({
      where: { id: contractId },
      data: {
        status: ContractStatus.submitted,
      },
      include: {
        listing: { select: { id: true, title: true } },
        client: { select: { id: true, email: true, displayName: true } },
        labeler: { select: { id: true, email: true, displayName: true } },
      },
    });

    logger.info(`Contract submitted: ${contractId}`);

    return updatedContract;
  }

  /**
   * Approve a contract (client approves labeler's work)
   */
  async approveContract(contractId: string, userId: string, userRole: UserRole) {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundError('Contract');
    }

    // Only client or admin can approve
    if (userRole !== 'admin' && contract.clientUserId !== userId) {
      throw new ForbiddenError('Only the client can approve this contract');
    }

    // Can only approve submitted contracts
    if (contract.status !== ContractStatus.submitted) {
      throw new BadRequestError(`Cannot approve contract with status: ${contract.status}`);
    }

    const updatedContract = await prisma.contract.update({
      where: { id: contractId },
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

    logger.info(`Contract approved: ${contractId}`);

    return updatedContract;
  }

  /**
   * Reject a contract (client rejects labeler's work)
   */
  async rejectContract(contractId: string, userId: string, userRole: UserRole, reason?: string) {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundError('Contract');
    }

    // Only client or admin can reject
    if (userRole !== 'admin' && contract.clientUserId !== userId) {
      throw new ForbiddenError('Only the client can reject this contract');
    }

    // Can only reject submitted contracts
    if (contract.status !== ContractStatus.submitted) {
      throw new BadRequestError(`Cannot reject contract with status: ${contract.status}`);
    }

    const updatedContract = await prisma.contract.update({
      where: { id: contractId },
      data: {
        status: ContractStatus.rejected,
      },
      include: {
        listing: { select: { id: true, title: true } },
        client: { select: { id: true, email: true, displayName: true } },
        labeler: { select: { id: true, email: true, displayName: true } },
      },
    });

    logger.info(`Contract rejected: ${contractId}, reason: ${reason || 'No reason provided'}`);

    return updatedContract;
  }

  /**
   * Cancel a contract (client, labeler, or admin)
   */
  async cancelContract(contractId: string, userId: string, userRole: UserRole, reason?: string) {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundError('Contract');
    }

    // Client, labeler, or admin can cancel
    if (
      userRole !== 'admin' &&
      contract.clientUserId !== userId &&
      contract.labelerUserId !== userId
    ) {
      throw new ForbiddenError('You do not have permission to cancel this contract');
    }

    // Can only cancel active contracts
    if (contract.status !== ContractStatus.active) {
      throw new BadRequestError(`Cannot cancel contract with status: ${contract.status}`);
    }

    const updatedContract = await prisma.contract.update({
      where: { id: contractId },
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

    logger.info(`Contract cancelled: ${contractId}, reason: ${reason || 'No reason provided'}`);

    return updatedContract;
  }
}
