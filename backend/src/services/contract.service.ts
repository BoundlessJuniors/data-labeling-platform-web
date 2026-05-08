import { ContractStatus, EscrowType, ListingStatus, PaymentStatus, Prisma, SubmissionStatus, TaskStatus } from '@prisma/client';
import { UserRole } from '@prisma/client';
import prisma from '../lib/db';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors';
import logger from '../lib/logger';
import { addNormalizeJob } from '../lib/queue';
import { getSignedUrl } from '../lib/storage';
import { ExportFormat, ExportableTaskRecord } from '../utils/export/export.types';
import { extractExportShapes } from '../utils/export/export.helpers';
import { exportCoco } from '../utils/export/coco.export';
import { exportYolo } from '../utils/export/yolo.export';
import { exportVoc } from '../utils/export/voc.export';
import { auditService } from './audit.service';
import { storageLifecycleService } from './storage-lifecycle.service';

// ── Local helpers ─────────────────────────────────────────────────────────────

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function isPast(date: Date | null | undefined, now: Date): boolean {
  return !!date && date <= now;
}

function decimalToNumber(value: unknown): number {
  return Number(value);
}

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}
/**
 * Service layer for contract lifecycle management.
 *
 * ARCHITECTURAL NOTE:
 *   Contract creation happens exclusively through ProposalService.acceptProposal.
 *   There is intentionally no createContract method here.
 *   The canonical flow is: proposal → accept proposal → contract + tasks.
 */
export class ContractService {

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

    // ── Role-based filtering ──────────────────────────────────────────
    // admin + !ownOnly  → no restriction (sees all contracts)
    // admin + ownOnly   → contracts where admin is directly involved
    // client            → only contracts where clientUserId = self
    // labeler           → only contracts where labelerUserId = self
    if (userRole === 'admin') {
      if (ownOnly) {
        where.OR = [
          { clientUserId: userId },
          { labelerUserId: userId },
        ];
      }
      // else: admin sees all — no additional filter
    } else if (userRole === 'client') {
      where.clientUserId = userId;
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
            select: { id: true, email: true, displayName: true, ratingAvg: true, ratingCount: true },
          },
          labeler: {
            select: { id: true, email: true, displayName: true, ratingAvg: true, ratingCount: true },
          },
          rating: {
            select: {
              id: true,
              contractId: true,
              clientUserId: true,
              labelerUserId: true,
              rating: true,
              comment: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          tasks: {
            select: { status: true },
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
          select: { id: true, email: true, displayName: true, ratingAvg: true, ratingCount: true },
        },
        labeler: {
          select: { id: true, email: true, displayName: true, ratingAvg: true, ratingCount: true },
        },
        rating: {
          select: {
            id: true,
            contractId: true,
            clientUserId: true,
            labelerUserId: true,
            rating: true,
            comment: true,
            createdAt: true,
            updatedAt: true,
          },
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
   * Get labeling context for a contract.
   * Returns only contract-level labeling metadata, keeping payload minimal.
   * Does NOT include tasks, submissions, or full user objects.
   */
  async getLabelingContext(contractId: string, userId: string, userRole: UserRole) {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        listing: {
          include: {
            labelSet: {
              include: {
                labels: {
                  orderBy: { createdAt: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    if (!contract) {
      throw new NotFoundError('Contract');
    }

    // Check access rights using the same rule as getContractById
    if (
      userRole !== 'admin' &&
      contract.clientUserId !== userId &&
      contract.labelerUserId !== userId
    ) {
      throw new ForbiddenError('You do not have access to this contract');
    }

    return {
      contract: {
        id: contract.id,
        status: contract.status,
        listingId: contract.listingId,
        clientUserId: contract.clientUserId,
        labelerUserId: contract.labelerUserId,
      },
      listing: {
        id: contract.listing.id,
        title: contract.listing.title,
        description: contract.listing.description,
        annotationFormat: contract.listing.annotationFormat,
        labelingSpecJson: contract.listing.labelingSpecJson,
        qcMode: contract.listing.qcMode,
        labelSetId: contract.listing.labelSetId,
        labelSetVersion: contract.listing.labelSetVersion,
      },
      labelSet: contract.listing.labelSet ? {
        id: contract.listing.labelSet.id,
        name: contract.listing.labelSet.name,
        version: contract.listing.labelSet.version,
        labels: contract.listing.labelSet.labels.map((label) => ({
          id: label.id,
          name: label.name,
          color: label.color,
          attributesSchemaJson: label.attributesSchemaJson,
        })),
      } : null,
    };
  }

  /**
   * Submit a contract (labeler submits completed work).
   * Creates a Submission record and enqueues a normalize job.
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

    // Extended allowed statuses: active, overdue, revision_requested
    const submittableStatuses: ContractStatus[] = [
      ContractStatus.active,
      ContractStatus.overdue,
      ContractStatus.revision_requested,
    ];
    if (!submittableStatuses.includes(contract.status)) {
      throw new BadRequestError(`Cannot submit contract with status: ${contract.status}`);
    }

    // Payment must be paid before submission is allowed
    const paidPayment = await prisma.payment.findFirst({
      where: { contractId, status: PaymentStatus.paid },
    });
    if (!paidPayment) {
      throw new BadRequestError('Contract cannot be submitted before payment is completed.');
    }

    const now = new Date();

    // Overdue deadline check
    if (contract.status === ContractStatus.overdue) {
      if (!contract.autoCancelAt) {
        throw new BadRequestError('Contract is overdue but autoCancelAt is missing.');
      }
      if (isPast(contract.autoCancelAt, now)) {
        throw new BadRequestError('Contract auto-cancel deadline has passed. Submission is no longer allowed.');
      }
    }

    // Revision deadline check
    if (contract.status === ContractStatus.revision_requested) {
      if (!contract.revisionDueAt) {
        throw new BadRequestError('Contract is in revision but revisionDueAt is missing.');
      }
      if (isPast(contract.revisionDueAt, now)) {
        throw new BadRequestError('Revision deadline has passed. Submission is no longer allowed.');
      }
    }

    // Check if any tasks are still incomplete (ready, leased, or rejected)
    const incompleteTasks = await prisma.task.count({
      where: {
        contractId,
        status: { in: ['ready', 'leased', 'rejected'] },
      },
    });

    if (incompleteTasks > 0) {
      throw new BadRequestError('Cannot submit contract. All tasks must be submitted or accepted before handing over.');
    }

    // Validate every task has at least 1 valid raw annotation.
    const tasksWithoutValidRaw = await prisma.task.findMany({
      where: {
        contractId,
        annotationsRaw: {
          none: {
            leaseToken: { not: null },
            labelerUserId: contract.labelerUserId,
          },
        },
      },
      select: { id: true },
      take: 1,
    });

    if (tasksWithoutValidRaw.length > 0) {
      throw new BadRequestError(
        `Cannot submit contract. Every task must have at least one valid raw annotation (lease_token != null, correct labeler). First failing task: ${tasksWithoutValidRaw[0].id}`
      );
    }

    const reviewDueAt = addHours(now, contract.reviewWindowHours);

    // Update contract status to submitted with SLA timestamps
    const updatedContract = await prisma.contract.update({
      where: { id: contractId },
      data: {
        status: ContractStatus.submitted,
        submittedAt: now,
        reviewDueAt,
      },
      include: {
        listing: { select: { id: true, title: true } },
        client: { select: { id: true, email: true, displayName: true } },
        labeler: { select: { id: true, email: true, displayName: true } },
      },
    });

    // --- Submission + Normalize Job (idempotent) ---
    // Find the latest submission for this contract (any status)
    const existingSubmission = await prisma.submission.findFirst({
      where: {
        contractId,
        format: 'CUSTOM_JSON',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingSubmission && (existingSubmission.status === 'processing' || existingSubmission.status === 'completed')) {
      // Already in-flight or done — do not enqueue again
      logger.info(`Normalize submission already exists for contract ${contractId} (status: ${existingSubmission.status})`);
    } else {
      // Reuse pending/failed submission or create new
      let submission = existingSubmission;
      if (!submission || (submission.status !== 'pending' && submission.status !== 'failed')) {
        submission = await prisma.submission.create({
          data: {
            contractId,
            labelerUserId: contract.labelerUserId,
            format: 'CUSTOM_JSON',
            s3Key: 'db://annotations_raw',
            status: SubmissionStatus.pending,
          },
        });
      }

      // Enqueue normalize job — submission stays 'pending' until worker starts (worker sets 'processing')
      try {
        await addNormalizeJob(contractId, submission.id);
        logger.info(`Normalize job enqueued for contract ${contractId}, submission ${submission.id}`);
      } catch (enqueueError: unknown) {
        const errorMessage = enqueueError instanceof Error ? enqueueError.message : 'Unknown enqueue error';
        await prisma.submission.update({
          where: { id: submission.id },
          data: { status: SubmissionStatus.failed, errorMessage },
        });
        logger.error(`Failed to enqueue normalize job for contract ${contractId}:`, enqueueError);
      }
    }

    logger.info(`Contract submitted: ${contractId}`);

    return updatedContract;
  }

  /**
   * Approve a contract (client approves labeler's work).
   * Phase 4: Releases the escrowed payment to the labeler/platform.
   */
  async approveContract(contractId: string, userId: string, userRole: UserRole) {
    const contract = await prisma.contract.findUnique({ where: { id: contractId } });

    if (!contract) throw new NotFoundError('Contract');

    if (userRole !== 'admin' && contract.clientUserId !== userId) {
      throw new ForbiddenError('Only the client can approve this contract');
    }

    if (contract.status !== ContractStatus.submitted) {
      throw new BadRequestError(`Cannot approve contract with status: ${contract.status}`);
    }

    const completedSubmission = await prisma.submission.findFirst({
      where: { contractId, format: 'CUSTOM_JSON', status: 'completed' },
    });
    if (!completedSubmission) {
      throw new BadRequestError('Normalization is not completed yet. Cannot approve contract.');
    }

    const paidPayment = await prisma.payment.findFirst({
      where: { contractId, status: PaymentStatus.paid },
      orderBy: { paidAt: 'desc' },
    });
    if (!paidPayment) {
      throw new BadRequestError('Cannot approve contract because no paid payment exists.');
    }

    const now = new Date();
    const labelerAmount = roundMoney(decimalToNumber(paidPayment.labelerEarningAmount));
    const platformAmount = roundMoney(decimalToNumber(paidPayment.platformFeeAmount));

    const updatedContract = await prisma.$transaction(async (tx) => {
      // Release payment
      await tx.payment.update({
        where: { id: paidPayment.id },
        data: { status: PaymentStatus.released, releasedAt: now },
      });

      // Approve contract
      const approved = await tx.contract.update({
        where: { id: contractId },
        data: {
          status: ContractStatus.approved,
          approvedAt: now,
          completedAt: now,
        },
        include: {
          listing: { select: { id: true, title: true } },
          client: { select: { id: true, email: true, displayName: true } },
          labeler: { select: { id: true, email: true, displayName: true } },
        },
      });

      // Complete listing
      await tx.listing.update({
        where: { id: contract.listingId },
        data: { status: ListingStatus.completed },
      });

      const ledgerMeta = {
        source: 'contract_approve',
        paymentId: paidPayment.id,
        provider: paidPayment.provider,
        providerPaymentId: paidPayment.providerPaymentId,
      };

      // Labeler payout ledger entry
      await tx.escrowLedger.create({
        data: {
          contractId,
          paymentId: paidPayment.id,
          type: EscrowType.release_to_labeler,
          amount: labelerAmount,
          currency: paidPayment.currency,
          metaJson: ledgerMeta,
        },
      });

      // Platform fee ledger entry
      await tx.escrowLedger.create({
        data: {
          contractId,
          paymentId: paidPayment.id,
          type: EscrowType.platform_fee,
          amount: platformAmount,
          currency: paidPayment.currency,
          metaJson: ledgerMeta,
        },
      });

      return approved;
    });

    logger.info(`Contract approved: ${contractId}, payment ${paidPayment.id} released`);

    try {
      await auditService.logAction(userId, 'contract.approve', 'contract', contractId, {
        clientUserId: contract.clientUserId,
        paymentId: paidPayment.id,
      });
      await auditService.logAction(userId, 'payment.released', 'payment', paidPayment.id, {
        contractId,
        labelerAmount,
        platformAmount,
      });
    } catch (auditErr) {
      logger.warn('Audit log failed for contract.approve', auditErr);
    }

    // Schedule storage lifecycle cleanup — must not fail the approval
    try {
      await storageLifecycleService.scheduleDatasetPurgeForContract(contractId, 'contract_approve');
    } catch (lifecycleErr) {
      logger.warn(`[StorageLifecycle] Failed to schedule purge for contract ${contractId}:`, lifecycleErr);
    }

    logger.info(`Contract approved: ${contractId}`);

    return updatedContract;
  }

  /**
  /**
   * Reject a contract (client rejects labeler's work).
   * Phase 4: revision_requested or disputed when max revisions exceeded.
   */
  async rejectContract(contractId: string, userId: string, userRole: UserRole, reason?: string) {
    const contract = await prisma.contract.findUnique({ where: { id: contractId } });

    if (!contract) throw new NotFoundError('Contract');

    if (userRole !== 'admin' && contract.clientUserId !== userId) {
      throw new ForbiddenError('Only the client can reject this contract');
    }

    if (contract.status !== ContractStatus.submitted) {
      throw new BadRequestError(`Cannot reject contract with status: ${contract.status}`);
    }

    const completedSubmission = await prisma.submission.findFirst({
      where: { contractId, format: 'CUSTOM_JSON', status: 'completed' },
    });
    if (!completedSubmission) {
      throw new BadRequestError('Normalization is not completed yet. Cannot reject contract.');
    }

    const now = new Date();
    const nextRevisionCount = contract.revisionCount + 1;

    // ── Dispute path: max revisions exceeded ─────────────────────────────
    if (nextRevisionCount > contract.maxRevisionCount) {
      const updatedContract = await prisma.$transaction(async (tx) => {
        const disputed = await tx.contract.update({
          where: { id: contractId },
          data: {
            status: ContractStatus.disputed,
            disputedAt: now,
            disputeReason: reason || 'Maximum revision count exceeded',
            revisionReason: reason || null,
            revisionRequestedAt: now,
            revisionCount: nextRevisionCount,
          },
          include: {
            listing: { select: { id: true, title: true } },
            client: { select: { id: true, email: true, displayName: true } },
            labeler: { select: { id: true, email: true, displayName: true } },
          },
        });

        // Listing stays in_progress while disputed
        await tx.listing.update({
          where: { id: contract.listingId },
          data: { status: ListingStatus.in_progress },
        });

        return disputed;
      });

      logger.info(`Contract disputed: ${contractId} (revision ${nextRevisionCount}/${contract.maxRevisionCount})`);

      try {
        await auditService.logAction(userId, 'contract.disputed', 'contract', contractId, {
          reason: reason || null, revisionCount: nextRevisionCount,
        });
      } catch (auditErr) { logger.warn('Audit log failed for contract.disputed', auditErr); }

      return updatedContract;
    }

    // ── Revision path ─────────────────────────────────────────────────────
    const revisionDueAt = addHours(now, contract.revisionWindowHours);

    const updatedContract = await prisma.$transaction(async (tx) => {
      const revised = await tx.contract.update({
        where: { id: contractId },
        data: {
          status: ContractStatus.revision_requested,
          revisionReason: reason || null,
          revisionRequestedAt: now,
          revisionDueAt,
          revisionCount: nextRevisionCount,
        },
        include: {
          listing: { select: { id: true, title: true } },
          client: { select: { id: true, email: true, displayName: true } },
          labeler: { select: { id: true, email: true, displayName: true } },
        },
      });

      // Reset submitted/accepted tasks so labeler can re-lease
      await tx.task.updateMany({
        where: {
          contractId,
          status: { in: [TaskStatus.submitted, TaskStatus.accepted] },
        },
        data: { status: TaskStatus.rejected },
      });

      // Invalidate completed submission for new normalize cycle
      await tx.submission.update({
        where: { id: completedSubmission.id },
        data: { status: SubmissionStatus.failed, errorMessage: 'Invalidated due to contract revision' },
      });

      // Listing stays in_progress
      await tx.listing.update({
        where: { id: contract.listingId },
        data: { status: ListingStatus.in_progress },
      });

      return revised;
    });

    logger.info(`Contract revision requested: ${contractId}, reason: ${reason || 'No reason provided'}`);

    try {
      await auditService.logAction(userId, 'contract.reject', 'contract', contractId, {
        reason: reason || null, clientUserId: contract.clientUserId, revisionCount: nextRevisionCount,
      });
    } catch (auditErr) { logger.warn('Audit log failed for contract.reject', auditErr); }

    return updatedContract;
  }


  /**
   * Cancel a contract (client, labeler, or admin).
   * Phase 4: refunds paid payment for active/overdue/revision_requested.
   */
  async cancelContract(contractId: string, userId: string, userRole: UserRole, reason?: string) {
    const contract = await prisma.contract.findUnique({ where: { id: contractId } });

    if (!contract) throw new NotFoundError('Contract');

    if (
      userRole !== 'admin' &&
      contract.clientUserId !== userId &&
      contract.labelerUserId !== userId
    ) {
      throw new ForbiddenError('You do not have permission to cancel this contract');
    }

    const now = new Date();
    const previousStatus = contract.status;

    // ── Submitted: block direct cancel ────────────────────────────────────
    if (contract.status === ContractStatus.submitted) {
      throw new BadRequestError('Submitted contracts cannot be cancelled directly. Please approve, reject, or open a dispute.');
    }

    // ── Terminal statuses: already done ───────────────────────────────────
    const terminalStatuses: ContractStatus[] = [
      ContractStatus.approved,
      ContractStatus.refunded,
      ContractStatus.cancelled,
      ContractStatus.disputed,
    ];
    if (terminalStatuses.includes(contract.status)) {
      throw new BadRequestError(`Cannot cancel contract with status: ${contract.status}`);
    }

    // ── pending_payment: cancel without refund ────────────────────────────
    if (contract.status === ContractStatus.pending_payment) {
      const updatedContract = await prisma.$transaction(async (tx) => {
        // Expire any pending payment so it cannot be used
        const pendingPayment = await tx.payment.findFirst({
          where: { contractId, status: PaymentStatus.pending },
          orderBy: { createdAt: 'desc' },
        });
        if (pendingPayment) {
          await tx.payment.update({
            where: { id: pendingPayment.id },
            data: { status: PaymentStatus.expired },
          });
        }

        // Cancel contract
        const cancelled = await tx.contract.update({
          where: { id: contractId },
          data: { status: ContractStatus.cancelled, cancelledAt: now },
          include: {
            listing: { select: { id: true, title: true } },
            client: { select: { id: true, email: true, displayName: true } },
            labeler: { select: { id: true, email: true, displayName: true } },
          },
        });

        // Reopen listing
        await tx.listing.update({
          where: { id: contract.listingId },
          data: { status: ListingStatus.open },
        });

        // Restore accepted proposal to pending (payment never succeeded)
        if (contract.proposalId) {
          const proposal = await tx.proposal.findUnique({ where: { id: contract.proposalId } });
          if (proposal && proposal.status === 'accepted') {
            await tx.proposal.update({
              where: { id: contract.proposalId },
              data: { status: 'pending' },
            });
          }
        }

        return cancelled;
      });

      logger.info(`Contract ${contractId} cancelled (pending_payment path, no refund)`);

      try {
        await auditService.logAction(userId, 'contract.cancel', 'contract', contractId, {
          reason: reason || null, previousStatus,
        });
      } catch (auditErr) { logger.warn('Audit log failed for contract.cancel (pending_payment)', auditErr); }

      return updatedContract;
    }

    // ── active / overdue / revision_requested: dispute or refund ──────────
    const refundableStatuses: ContractStatus[] = [
      ContractStatus.active,
      ContractStatus.overdue,
      ContractStatus.revision_requested,
    ];
    if (refundableStatuses.includes(contract.status)) {
      const trimmedReason = reason?.trim();
      if (!trimmedReason) {
        throw new BadRequestError('Cancellation reason is required for paid contracts.');
      }
      if (userRole === 'client') {
        // Phase 9: Client cannot get automatic refund. Move to disputed.
        const updatedContract = await prisma.$transaction(async (tx) => {
          const disputed = await tx.contract.update({
            where: { id: contractId },
            data: {
              status: ContractStatus.disputed,
              disputedAt: now,
              disputeReason: trimmedReason,
              // No cancelledAt, no refundedAt
            },
            include: {
              listing: { select: { id: true, title: true } },
              client: { select: { id: true, email: true, displayName: true } },
              labeler: { select: { id: true, email: true, displayName: true } },
            },
          });
          // Listing stays in_progress, payment stays paid, no ledger created
          return disputed;
        });

        logger.info(`Contract ${contractId} disputed by client cancel (was ${previousStatus})`);
        try {
          await auditService.logAction(userId, 'contract.disputed', 'contract', contractId, {
            reason: trimmedReason,
            previousStatus,
            initiatedBy: 'client',
          });
        } catch (auditErr) { logger.warn('Audit log failed for contract.disputed (client cancel)', auditErr); }

        return updatedContract;
      }

      // Labeler or Admin: Proceed with refund
      const paidPayment = await prisma.payment.findFirst({
        where: { contractId, status: PaymentStatus.paid },
        orderBy: { paidAt: 'desc' },
      });

      if (!paidPayment) {
        throw new BadRequestError('Cannot refund contract because no paid payment exists.');
      }

      const updatedContract = await prisma.$transaction(async (tx) => {
        // Refund payment
        await tx.payment.update({
          where: { id: paidPayment.id },
          data: { status: PaymentStatus.refunded, refundedAt: now },
        });

        // Move contract to refunded
        const refunded = await tx.contract.update({
          where: { id: contractId },
          data: {
            status: ContractStatus.refunded,
            refundedAt: now,
            cancelledAt: now,
          },
          include: {
            listing: { select: { id: true, title: true } },
            client: { select: { id: true, email: true, displayName: true } },
            labeler: { select: { id: true, email: true, displayName: true } },
          },
        });

        // Reopen listing
        await tx.listing.update({
          where: { id: contract.listingId },
          data: { status: ListingStatus.open },
        });

        // Update linked proposal status so the listing can be re-applied to
        // Labeler-initiated → withdrawn; Admin-initiated → rejected
        if (contract.proposalId) {
          const proposal = await tx.proposal.findUnique({ where: { id: contract.proposalId } });
          if (proposal && proposal.status === 'accepted') {
            const nextProposalStatus = userRole === 'labeler' ? 'withdrawn' : 'rejected';
            await tx.proposal.update({
              where: { id: contract.proposalId },
              data: { status: nextProposalStatus },
            });
          }
        }

        // EscrowLedger: refund_to_client
        await tx.escrowLedger.create({
          data: {
            contractId,
            paymentId: paidPayment.id,
            type: EscrowType.refund_to_client,
            amount: paidPayment.amount,
            currency: paidPayment.currency,
            metaJson: {
              source: 'contract_cancel',
              reason: trimmedReason,
              previousContractStatus: previousStatus,
              initiatedBy: userRole,
            },
          },
        });

        return refunded;
      });

      logger.info(`Contract ${contractId} refunded by ${userRole} (was ${previousStatus}), payment ${paidPayment.id} refunded`);

      try {
        await auditService.logAction(userId, 'contract.refunded', 'contract', contractId, {
          reason: trimmedReason,
          previousStatus,
          paymentId: paidPayment.id,
          initiatedBy: userRole,
        });
        await auditService.logAction(userId, 'payment.refunded', 'payment', paidPayment.id, {
          contractId,
          reason: trimmedReason,
          initiatedBy: userRole,
        });
      } catch (auditErr) { logger.warn('Audit log failed for contract.refunded', auditErr); }

      return updatedContract;
    }

    // Fallback (should not be reached)
    throw new BadRequestError(`Cannot cancel contract with status: ${contract.status}`);
  }


  /**
   * Get a QC sample of tasks for a submitted contract.
   * Returns random task IDs with minimal metadata for the client to review.
   *
   * Requirements:
   *   - Contract must be submitted
   *   - Normalization must be completed (Submission status = completed)
   *   - Only client or admin can access
   */
  async getQcSample(contractId: string, userId: string, userRole: UserRole, size: number = 100) {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundError('Contract');
    }

    // Only client or admin
    if (userRole !== 'admin' && contract.clientUserId !== userId) {
      throw new ForbiddenError('Only the client can access QC samples');
    }

    // Contract must be submitted
    if (contract.status !== ContractStatus.submitted) {
      throw new BadRequestError(`QC sample is only available for submitted contracts (current: ${contract.status})`);
    }

    // Normalization must be completed
    const completedSubmission = await prisma.submission.findFirst({
      where: { contractId, format: 'CUSTOM_JSON', status: 'completed' },
    });
    if (!completedSubmission) {
      throw new BadRequestError('Normalization is not completed yet. QC sample not available.');
    }

    // Fetch all task IDs for this contract, then shuffle in application layer
    // (avoids ORDER BY random() performance issues on large tables)
    const allTasks = await prisma.task.findMany({
      where: { contractId },
      select: {
        id: true,
        status: true,
        asset: {
          // storageState must be selected so we can skip signed URL for purged assets
          select: { id: true, objectKey: true, mimeType: true, width: true, height: true, storageState: true },
        },
      },
    });

    // Fisher-Yates shuffle
    const shuffled = [...allTasks];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Take requested sample size
    const sampleSize = Math.min(size, shuffled.length);
    const sample = shuffled.slice(0, sampleSize);

    // Generate signed URLs for each sample task's asset
    const tasksWithUrls = await Promise.all(
      sample.map(async (task) => {
        let imageUrl: string | null = null;
        if (task.asset?.objectKey) {
          // Skip URL generation for purged assets
          if (task.asset.storageState === 'purged') {
            imageUrl = null;
          } else {
            try {
              imageUrl = await getSignedUrl(task.asset.objectKey, 3600);
            } catch (err) {
              logger.warn(`Failed to generate signed URL for asset ${task.asset?.id}:`, err);
            }
          }
        }
        return { ...task, imageUrl };
      })
    );

    return {
      contractId,
      totalTasks: allTasks.length,
      sampleSize: tasksWithUrls.length,
      tasks: tasksWithUrls,
    };
  }

  /**
   * Retry normalize job for a contract (admin only).
   * Finds the latest failed/pending submission or creates a new one, then enqueues.
   */
  async retryNormalize(contractId: string, userId: string, userRole: UserRole) {
    if (userRole !== 'admin') {
      throw new ForbiddenError('Only admin can retry normalize');
    }

    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundError('Contract');
    }

    // Find latest retryable submission (failed or pending)
    let submission = await prisma.submission.findFirst({
      where: {
        contractId,
        format: 'CUSTOM_JSON',
        status: { in: ['failed', 'pending'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!submission) {
      // No retryable submission — create a new one
      submission = await prisma.submission.create({
        data: {
          contractId,
          labelerUserId: contract.labelerUserId,
          format: 'CUSTOM_JSON',
          s3Key: 'db://annotations_raw',
          status: SubmissionStatus.pending,
        },
      });
    }

    // Enqueue normalize job
    try {
      await addNormalizeJob(contractId, submission.id);
      logger.info(`Normalize retry enqueued for contract ${contractId}, submission ${submission.id}`);
      
      await auditService.logAction(userId, 'contract.normalize_retry', 'contract', contractId, {
        submissionId: submission.id,
      });
      
    } catch (enqueueError: unknown) {
      const errorMessage = enqueueError instanceof Error ? enqueueError.message : 'Unknown enqueue error';
      await prisma.submission.update({
        where: { id: submission.id },
        data: { status: SubmissionStatus.failed, errorMessage },
      });
      throw new BadRequestError(`Failed to enqueue normalize job: ${errorMessage}`);
    }


    return { submissionId: submission.id, status: 'processing' };
  }

  /**
   * Export an approved contract's labeling outputs in a specific format.
   * Only accessible by client or admin.
   */
  async exportContract(contractId: string, userId: string, userRole: UserRole, format: ExportFormat) {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        listing: {
          include: {
            labelSet: {
              include: { labels: true },
            },
          },
        },
        tasks: {
          include: {
            asset: true,
            annotationNormalized: true,
          },
        },
      },
    });

    if (!contract) {
      throw new NotFoundError('Contract');
    }

    // Only client or admin can export
    if (userRole !== 'admin' && contract.clientUserId !== userId) {
      throw new ForbiddenError('Only the client can export this contract');
    }

    if (contract.status !== ContractStatus.approved) {
      throw new BadRequestError(`Cannot export contract with status: ${contract.status}. Status must be 'approved'.`);
    }

    const labels = contract.listing.labelSet?.labels || [];
    if (labels.length === 0) {
      throw new BadRequestError('Labeling set has no labels.');
    }

    const exportableTasks: ExportableTaskRecord[] = [];

    for (const task of contract.tasks) {
      if (!task.annotationNormalized || !task.annotationNormalized.normalizedJson) {
        throw new BadRequestError(`Task ${task.id} does not have a normalized annotation. All tasks must be completed for export.`);
      }

      if (!task.asset) {
        throw new BadRequestError(`Task ${task.id} is missing an associated asset.`);
      }

      const payload = task.annotationNormalized.normalizedJson as any;
      if (payload.type !== 'export' || !Array.isArray(payload.data)) {
        throw new BadRequestError(`Task ${task.id} has an invalid normalized payload format.`);
      }

      if (!task.asset.width || !task.asset.height || task.asset.width <= 0 || task.asset.height <= 0) {
        throw new BadRequestError(`Task ${task.id} has missing width/height required for export.`);
      }

      const shapes = extractExportShapes(payload.data, labels, task.asset.width, task.asset.height);

      exportableTasks.push({
        taskId: task.id,
        objectKey: task.asset.objectKey,
        basename: task.asset.objectKey.split('/').pop() || `task-${task.id}.jpg`,
        width: task.asset.width,
        height: task.asset.height,
        shapes,
      });
    }

    switch (format) {
      case 'COCO':
        return exportCoco(contractId, exportableTasks, labels);
      case 'YOLO':
        return exportYolo(contractId, exportableTasks, labels);
      case 'VOC':
        return exportVoc(contractId, exportableTasks, labels);
      default:
        throw new BadRequestError(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Resolve a disputed contract (admin only).
   *
   * decision: 'refund_client'
   *   - payment → refunded, contract → refunded, listing → open
   *   - linked proposal → rejected (admin-initiated)
   *   - escrowLedger: refund_to_client
   *   - audit: contract.dispute_refunded, payment.refunded
   *
   * decision: 'release_to_labeler'
   *   - payment → released, contract → approved, listing → completed
   *   - escrowLedger: release_to_labeler + platform_fee
   *   - audit: contract.dispute_released, payment.released
   */
  async resolveDispute(
    contractId: string,
    adminUserId: string,
    userRole: UserRole,
    decision: 'refund_client' | 'release_to_labeler',
    reason: string
  ) {
    if (userRole !== 'admin') {
      throw new ForbiddenError('Only admin can resolve disputes');
    }

    const contract = await prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) throw new NotFoundError('Contract');

    if (contract.status !== ContractStatus.disputed) {
      throw new BadRequestError(`Cannot resolve dispute for contract with status: ${contract.status}`);
    }

    const paidPayment = await prisma.payment.findFirst({
      where: { contractId, status: PaymentStatus.paid },
      orderBy: { paidAt: 'desc' },
    });

    if (!paidPayment) {
      throw new BadRequestError('Cannot resolve dispute: no paid payment found for this contract.');
    }

    const now = new Date();
    const labelerAmount = roundMoney(decimalToNumber(paidPayment.labelerEarningAmount));
    const platformAmount = roundMoney(decimalToNumber(paidPayment.platformFeeAmount));

    if (decision === 'refund_client') {
      const updatedContract = await prisma.$transaction(async (tx) => {
        // Refund payment
        await tx.payment.update({
          where: { id: paidPayment.id },
          data: { status: PaymentStatus.refunded, refundedAt: now },
        });

        // Move contract to refunded
        const resolved = await tx.contract.update({
          where: { id: contractId },
          data: {
            status: ContractStatus.refunded,
            refundedAt: now,
            cancelledAt: now,
            // disputeReason stays intact (original dispute reason preserved)
          },
          include: {
            listing: { select: { id: true, title: true } },
            client: { select: { id: true, email: true, displayName: true } },
            labeler: { select: { id: true, email: true, displayName: true } },
          },
        });

        // Reopen listing
        await tx.listing.update({
          where: { id: contract.listingId },
          data: { status: ListingStatus.open },
        });

        // Linked proposal → rejected (admin-initiated, labeler may re-apply)
        if (contract.proposalId) {
          const proposal = await tx.proposal.findUnique({ where: { id: contract.proposalId } });
          if (proposal && proposal.status === 'accepted') {
            await tx.proposal.update({
              where: { id: contract.proposalId },
              data: { status: 'rejected' },
            });
          }
        }

        // EscrowLedger: refund_to_client
        await tx.escrowLedger.create({
          data: {
            contractId,
            paymentId: paidPayment.id,
            type: EscrowType.refund_to_client,
            amount: paidPayment.amount,
            currency: paidPayment.currency,
            metaJson: {
              source: 'admin_dispute_resolution',
              decision: 'refund_client',
              reason,
              previousContractStatus: 'disputed',
            },
          },
        });

        return resolved;
      });

      logger.info(`Dispute resolved (refund_client): contract ${contractId}, payment ${paidPayment.id} refunded by admin ${adminUserId}`);

      try {
        await auditService.logAction(adminUserId, 'contract.dispute_refunded', 'contract', contractId, {
          decision: 'refund_client',
          reason,
          paymentId: paidPayment.id,
        });
        await auditService.logAction(adminUserId, 'payment.refunded', 'payment', paidPayment.id, {
          contractId,
          reason,
          source: 'admin_dispute_resolution',
        });
      } catch (auditErr) { logger.warn('Audit log failed for contract.dispute_refunded', auditErr); }

      return updatedContract;
    }

    // decision === 'release_to_labeler'
    const updatedContract = await prisma.$transaction(async (tx) => {
      // Release payment
      await tx.payment.update({
        where: { id: paidPayment.id },
        data: { status: PaymentStatus.released, releasedAt: now },
      });

      // Approve contract
      const resolved = await tx.contract.update({
        where: { id: contractId },
        data: {
          status: ContractStatus.approved,
          approvedAt: now,
          completedAt: now,
        },
        include: {
          listing: { select: { id: true, title: true } },
          client: { select: { id: true, email: true, displayName: true } },
          labeler: { select: { id: true, email: true, displayName: true } },
        },
      });

      // Complete listing
      await tx.listing.update({
        where: { id: contract.listingId },
        data: { status: ListingStatus.completed },
      });

      // EscrowLedger: release_to_labeler
      await tx.escrowLedger.create({
        data: {
          contractId,
          paymentId: paidPayment.id,
          type: EscrowType.release_to_labeler,
          amount: labelerAmount,
          currency: paidPayment.currency,
          metaJson: {
            source: 'admin_dispute_resolution',
            decision: 'release_to_labeler',
            reason,
            previousContractStatus: 'disputed',
          },
        },
      });

      // EscrowLedger: platform_fee
      await tx.escrowLedger.create({
        data: {
          contractId,
          paymentId: paidPayment.id,
          type: EscrowType.platform_fee,
          amount: platformAmount,
          currency: paidPayment.currency,
          metaJson: {
            source: 'admin_dispute_resolution',
            decision: 'release_to_labeler',
            reason,
            previousContractStatus: 'disputed',
          },
        },
      });

      return resolved;
    });

    logger.info(`Dispute resolved (release_to_labeler): contract ${contractId}, payment ${paidPayment.id} released by admin ${adminUserId}`);

    try {
      await auditService.logAction(adminUserId, 'contract.dispute_released', 'contract', contractId, {
        decision: 'release_to_labeler',
        reason,
        paymentId: paidPayment.id,
        labelerAmount,
        platformAmount,
      });
      await auditService.logAction(adminUserId, 'payment.released', 'payment', paidPayment.id, {
        contractId,
        reason,
        source: 'admin_dispute_resolution',
        labelerAmount,
        platformAmount,
      });
    } catch (auditErr) { logger.warn('Audit log failed for contract.dispute_released', auditErr); }

    // Schedule storage lifecycle cleanup after dispute release — must not fail the resolution
    try {
      await storageLifecycleService.scheduleDatasetPurgeForContract(contractId, 'admin_dispute_release');
    } catch (lifecycleErr) {
      logger.warn(`[StorageLifecycle] Failed to schedule purge after dispute release for contract ${contractId}:`, lifecycleErr);
    }

    return updatedContract;
  }

  /**
   * Rate a completed and paid contract (client only).
   */
  async createContractRating(
    contractId: string,
    userId: string,
    userRole: UserRole,
    rating: number,
    comment?: string
  ) {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundError('Contract');
    }

    // Admin cannot rate on behalf of client, userId must strictly match clientUserId
    if (contract.clientUserId !== userId) {
      throw new ForbiddenError('Only the actual client can rate this contract. Admins cannot rate on behalf of clients.');
    }

    if (contract.status !== ContractStatus.approved) {
      throw new BadRequestError('Contract must be approved to be rated.');
    }

    const releasedPayment = await prisma.payment.findFirst({
      where: { contractId, status: PaymentStatus.released },
    });

    if (!releasedPayment) {
      throw new BadRequestError('Contract must have a released payment to be rated.');
    }

    const existingRating = await prisma.contractRating.findUnique({
      where: { contractId },
    });

    if (existingRating) {
      throw new BadRequestError('This contract has already been rated.');
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        // Lock the labeler user row
        await tx.$queryRaw<{ id: string }[]>`SELECT id FROM users WHERE id = ${contract.labelerUserId}::uuid FOR UPDATE`;

        // Create rating
        const contractRating = await tx.contractRating.create({
          data: {
            contractId,
            clientUserId: contract.clientUserId,
            labelerUserId: contract.labelerUserId,
            rating,
            comment: comment || null,
          },
        });

        // Aggregate
        const agg = await tx.contractRating.aggregate({
          where: { labelerUserId: contract.labelerUserId },
          _avg: { rating: true },
          _count: { rating: true },
        });

        const newAvg = agg._avg.rating ? new Prisma.Decimal(agg._avg.rating.toFixed(2)) : null;
        const newCount = agg._count.rating || 0;

        // Update user
        await tx.user.update({
          where: { id: contract.labelerUserId },
          data: {
            ratingAvg: newAvg,
            ratingCount: newCount,
          },
        });

        return contractRating;
      });

      try {
        await auditService.logAction(userId, 'contract.rating_create', 'contract', contractId, {
          clientUserId: contract.clientUserId,
          labelerUserId: contract.labelerUserId,
          rating,
          ratingId: result.id,
        });
      } catch (auditErr) {
        logger.warn(`Audit logging failed for contract rating creation on contract ${contractId}`, auditErr);
      }

      return result;
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestError('This contract has already been rated.');
      }
      throw error;
    }
  }
}
