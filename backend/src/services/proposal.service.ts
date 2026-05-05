// ============================================================================
// Proposal Service — Phase 3
// Payment-gated lifecycle:
//   createProposal (with deliveryDays from labeler)
//   acceptProposal → pending_payment contract + auto-init payment
// ============================================================================

import { ContractStatus, ListingStatus, StorageState, UserRole } from '@prisma/client';
import { Prisma } from '@prisma/client';
import prisma from '../lib/db';
import { NotFoundError, ForbiddenError, BadRequestError, ConflictError } from '../utils/errors';
import { cacheDelete } from '../lib/redis';
import logger from '../lib/logger';
import { paymentService } from './payment.service';

// ── SLA env helpers ───────────────────────────────────────────────────────────

function getSlaGracePeriodHours(): number {
  return Number(process.env.CONTRACT_GRACE_PERIOD_HOURS ?? 24) || 24;
}

function getSlaReviewWindowHours(): number {
  return Number(process.env.CONTRACT_REVIEW_WINDOW_HOURS ?? 72) || 72;
}

function getSlaRevisionWindowHours(): number {
  return Number(process.env.CONTRACT_REVISION_WINDOW_HOURS ?? 72) || 72;
}

function getSlaMaxRevisionCount(): number {
  return Number(process.env.CONTRACT_MAX_REVISION_COUNT ?? 2) || 2;
}

// ─────────────────────────────────────────────────────────────────────────────

export class ProposalService {
  /**
   * Create a new proposal (labeler or admin only).
   *
   * Business rules:
   * - Only labelers (and admins) can create proposals.
   * - Listing must be open.
   * - Labeler must provide deliveryDays (1–90).
   * - Duplicate check prevents a labeler from applying twice.
   */
  async createProposal(
    listingId: string,
    labelerUserId: string,
    userRole: UserRole,
    priceQuote: number,
    deliveryDays: number,
    coverLetter?: string
  ) {
    // ── Role check ────────────────────────────────────────────────────────
    if (userRole !== 'labeler' && userRole !== 'admin') {
      throw new ForbiddenError('Only labelers can create proposals');
    }

    // ── Verify listing exists and is open ─────────────────────────────────
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundError('Listing');
    }

    if (listing.status !== 'open') {
      throw new BadRequestError('Cannot apply to a listing that is not open');
    }

    // ── Users cannot apply to their own listings ──────────────────────────
    if (listing.ownerUserId === labelerUserId) {
      throw new BadRequestError('Cannot apply to your own listing');
    }

    // ── Duplicate check ───────────────────────────────────────────────────
    const existingProposal = await prisma.proposal.findUnique({
      where: {
        listingId_labelerUserId: {
          listingId,
          labelerUserId,
        },
      },
    });

    if (existingProposal) {
      // Active or accepted proposals block re-application
      if (existingProposal.status === 'pending' || existingProposal.status === 'accepted') {
        throw new ConflictError('You have already applied to this listing');
      }

      // rejected or withdrawn: update the existing row instead of creating a new one
      // This avoids the @@unique([listingId, labelerUserId]) constraint violation
      const updatedProposal = await prisma.proposal.update({
        where: { id: existingProposal.id },
        data: {
          status: 'pending',
          priceQuote,
          deliveryDays,
          coverLetter: coverLetter ?? null,
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

      logger.info(
        `Proposal ${updatedProposal.id} re-applied (was ${existingProposal.status}) by labeler ${labelerUserId} ` +
        `for listing ${listingId} (deliveryDays: ${deliveryDays})`
      );

      return updatedProposal;
    }

    const proposal = await prisma.proposal.create({
      data: {
        listingId,
        labelerUserId,
        priceQuote,
        deliveryDays,
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

    logger.info(
      `Proposal ${proposal.id} created by labeler ${labelerUserId} ` +
      `for listing ${listingId} (deliveryDays: ${deliveryDays})`
    );

    return proposal;
  }


  /**
   * Get all proposals with filtering and pagination.
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
   * Get a single proposal by ID with access control.
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

    const isLabeler = proposal.labelerUserId === userId;
    const isListingOwner = proposal.listing.ownerUserId === userId;
    const isAdmin = userRole === 'admin';

    if (!isLabeler && !isListingOwner && !isAdmin) {
      throw new ForbiddenError('You do not have permission to view this proposal');
    }

    return proposal;
  }

  /**
   * Accept a proposal (client only).
   *
   * Phase 3 lifecycle:
   * A. Transaction:
   *    1. Validate proposal + listing
   *    2. Mark proposal accepted
   *    3. Create contract as pending_payment (with SLA defaults from env)
   *    4. Create tasks (one per dataset asset)
   *    5. Move listing to payment_pending
   *    6. Do NOT reject other proposals here — that happens when payment succeeds
   *
   * B. After transaction:
   *    - Auto-initialize a pending payment via PaymentService
   *    - Return { proposal, contract, payment }
   *
   * If payment init fails the contract + tasks already exist, and the client
   * can retry via POST /api/v1/payments/contracts/:contractId/init.
   */
  async acceptProposal(proposalId: string, clientUserId: string) {
    // ── A. Atomic transaction ─────────────────────────────────────────────
    const result = await prisma.$transaction(async (tx) => {
      // 1. Load proposal with listing + labeler
      const proposal = await tx.proposal.findUnique({
        where: { id: proposalId },
        include: {
          listing: {
            include: {
              dataset: {
                select: {
                  id: true,
                  storageState: true,
                },
              },
            },
          },
          labeler: {
            select: { id: true, email: true, displayName: true },
          },
        },
      });

      if (!proposal) {
        throw new NotFoundError('Proposal');
      }

      // 2. Ownership check
      if (proposal.listing.ownerUserId !== clientUserId) {
        throw new ForbiddenError('Only the listing owner can accept proposals');
      }

      // 3. Proposal state check
      if (proposal.status !== 'pending') {
        throw new BadRequestError(`Cannot accept a proposal that is ${proposal.status}`);
      }

      // 4. Listing state check
      if (proposal.listing.status !== 'open') {
        throw new BadRequestError('Cannot accept proposals for a listing that is not open');
      }

      // 4b. Dataset storage state check — the dataset must still be active in storage
      if (proposal.listing.dataset.storageState !== StorageState.active) {
        throw new BadRequestError(
          'Cannot accept proposal because the dataset source files are not active in storage.'
        );
      }

      // 5. Mark proposal accepted
      await tx.proposal.update({
        where: { id: proposalId },
        data: { status: 'accepted' },
      });

      // 6. Create contract as pending_payment (SLA defaults from env)
      const contract = await tx.contract.create({
        data: {
          listingId: proposal.listingId,
          proposalId: proposal.id,
          clientUserId,
          labelerUserId: proposal.labelerUserId,
          agreedPriceTotal: proposal.priceQuote,
          currency: proposal.listing.currency,
          deliveryDays: proposal.deliveryDays,
          status: ContractStatus.pending_payment,
          // SLA defaults — actual deadlines set when payment succeeds
          gracePeriodHours: getSlaGracePeriodHours(),
          reviewWindowHours: getSlaReviewWindowHours(),
          revisionWindowHours: getSlaRevisionWindowHours(),
          maxRevisionCount: getSlaMaxRevisionCount(),
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

      // 7. Find all assets in the dataset that are still active in storage
      const assets = await tx.asset.findMany({
        where: {
          datasetId: contract.listing.datasetId,
          storageState: StorageState.active,
        },
        select: { id: true },
      });

      // Pre-flight: ensure there are no non-active assets (purge in flight, etc.)
      const totalAssets = await tx.asset.count({
        where: { datasetId: contract.listing.datasetId },
      });
      if (totalAssets > 0 && assets.length < totalAssets) {
        throw new BadRequestError(
          'Cannot create tasks because one or more dataset assets are not active in storage.'
        );
      }

      if (assets.length === 0) {
        throw new BadRequestError('Dataset is empty, cannot create tasks.');
      }

      // 8. Create one task per asset
      await tx.task.createMany({
        data: assets.map((asset) => ({
          contractId: contract.id,
          assetId: asset.id,
          status: 'ready' as const,
          attemptCount: 0,
          annotationCount: 0,
        })),
      });

      logger.info(`${assets.length} tasks created for contract ${contract.id}`);

      // 9. Lock listing in payment_pending
      //    Other proposals are NOT rejected here — rejection happens
      //    inside PaymentService.mockSuccess after payment succeeds.
      await tx.listing.update({
        where: { id: proposal.listingId },
        data: { status: ListingStatus.payment_pending },
      });

      return { proposal, contract };
    });

    // ── Cache invalidation ────────────────────────────────────────────────
    await cacheDelete(`cache:/api/v1/listings/${result.proposal.listingId}`);
    await cacheDelete(`cache:/api/v1/listings`);

    logger.info(
      `Proposal ${proposalId} accepted — Contract ${result.contract.id} created as pending_payment`
    );

    // ── B. Auto-initialize payment (outside transaction) ──────────────────
    // The contract is now committed to the database, so PaymentService can
    // load it. If this call fails the contract exists and can be retried via
    // POST /api/v1/payments/contracts/:contractId/init.
    let payment;
    try {
      payment = await paymentService.initPaymentForContract(
        result.contract.id,
        clientUserId,
        UserRole.client
      );
      logger.info(`Payment ${payment.id} auto-initialized for contract ${result.contract.id}`);
    } catch (paymentErr) {
      logger.error(
        `Payment initialization failed for contract ${result.contract.id} — ` +
        `client can retry via POST /api/v1/payments/contracts/${result.contract.id}/init`,
        paymentErr
      );
      throw paymentErr;
    }

    return {
      proposal: result.proposal,
      contract: result.contract,
      payment,
    };
  }

  /**
   * Reject a proposal (client / listing owner only).
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
   * Withdraw a proposal (labeler only).
   */
  async withdrawProposal(proposalId: string, userId: string) {
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal) {
      throw new NotFoundError('Proposal');
    }

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
   * Get proposals for a specific listing (listing owner or admin only).
   * deliveryDays is included via default Prisma select (all scalar fields returned).
   */
  async getListingProposals(listingId: string, userId: string, userRole: UserRole) {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundError('Listing');
    }

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
