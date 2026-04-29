import { ContractStatus, ListingStatus, PaymentStatus, EscrowType, SubmissionStatus, Prisma } from '@prisma/client';
import prisma from '../lib/db';
import logger from '../lib/logger';

export interface DeadlineProcessSummary {
  expiredPendingPayments: number;
  markedOverdue: number;
  autoRefunded: number;
  autoDisputedRevisions: number;
  autoApproved: number;
}

export class DeadlineService {
  async processDeadlines(): Promise<DeadlineProcessSummary> {
    const now = new Date();
    const batchSize = Number(process.env.DEADLINE_SCAN_BATCH_SIZE || 100);

    const summary: DeadlineProcessSummary = {
      expiredPendingPayments: 0,
      markedOverdue: 0,
      autoRefunded: 0,
      autoDisputedRevisions: 0,
      autoApproved: 0,
    };

    logger.info('[DeadlineService] Starting deadline scan...');

    try {
      summary.expiredPendingPayments = await this.expirePendingPayments(now, batchSize);
      summary.markedOverdue = await this.markActiveContractsOverdue(now, batchSize);
      summary.autoRefunded = await this.autoRefundOverdueContracts(now, batchSize);
      summary.autoDisputedRevisions = await this.autoDisputeExpiredRevisions(now, batchSize);
      summary.autoApproved = await this.autoApproveSubmittedContracts(now, batchSize);
      
      logger.info(`[DeadlineService] Processed deadlines: ${JSON.stringify(summary)}`);
    } catch (error) {
      logger.error('[DeadlineService] Error during processDeadlines:', error);
    }

    return summary;
  }

  private async expirePendingPayments(now: Date, batchSize: number): Promise<number> {
    let processed = 0;
    
    const payments = await prisma.payment.findMany({
      where: {
        status: PaymentStatus.pending,
        paymentExpiresAt: { lte: now },
      },
      take: batchSize,
      include: {
        contract: true,
      },
    });

    for (const payment of payments) {
      try {
        if (!payment.contract) {
          logger.warn(`[DeadlineService] Payment ${payment.id} has no contract, skipping`);
          continue;
        }

        if (payment.contract.status !== ContractStatus.pending_payment) {
          logger.warn(`[DeadlineService] Payment ${payment.id} is pending but contract ${payment.contractId} is ${payment.contract.status}, skipping`);
          continue;
        }

        await prisma.$transaction(async (tx) => {
          // 1. Update payment status
          await tx.payment.update({
            where: { id: payment.id },
            data: { status: PaymentStatus.expired },
          });

          // 2. Update contract status
          await tx.contract.update({
            where: { id: payment.contractId! },
            data: {
              status: ContractStatus.cancelled,
              cancelledAt: now,
            },
          });

          // 3. Update listing status
          await tx.listing.update({
            where: { id: payment.contract.listingId },
            data: { status: ListingStatus.open },
          });

          // 4. Update proposal if exists and accepted
          if (payment.contract.proposalId) {
            const proposal = await tx.proposal.findUnique({
              where: { id: payment.contract.proposalId },
            });
            if (proposal && proposal.status === 'accepted') {
              await tx.proposal.update({
                where: { id: proposal.id },
                data: { status: 'pending' },
              });
            }
          }
        });
        
        logger.info(`[DeadlineService] Expired pending payment ${payment.id} and cancelled contract ${payment.contractId}`);
        processed++;
      } catch (err) {
        logger.error(`[DeadlineService] Error expiring pending payment ${payment.id}:`, err);
      }
    }

    return processed;
  }

  private async markActiveContractsOverdue(now: Date, batchSize: number): Promise<number> {
    let processed = 0;

    const contracts = await prisma.contract.findMany({
      where: {
        status: ContractStatus.active,
        dueAt: { lte: now },
      },
      take: batchSize,
    });

    for (const contract of contracts) {
      try {
        if (!contract.dueAt) {
          logger.warn(`[DeadlineService] Contract ${contract.id} is active but has no dueAt, skipping`);
          continue;
        }

        await prisma.$transaction(async (tx) => {
          await tx.contract.update({
            where: { id: contract.id },
            data: {
              status: ContractStatus.overdue,
              overdueAt: now,
            },
          });
        });

        logger.info(`[DeadlineService] Marked contract ${contract.id} as overdue`);
        processed++;
      } catch (err) {
        logger.error(`[DeadlineService] Error marking contract ${contract.id} overdue:`, err);
      }
    }

    return processed;
  }

  private async autoRefundOverdueContracts(now: Date, batchSize: number): Promise<number> {
    let processed = 0;

    const contracts = await prisma.contract.findMany({
      where: {
        status: ContractStatus.overdue,
        autoCancelAt: { lte: now },
      },
      take: batchSize,
    });

    for (const contract of contracts) {
      try {
        const payment = await prisma.payment.findFirst({
          where: {
            contractId: contract.id,
            status: PaymentStatus.paid,
          },
          orderBy: { paidAt: 'desc' },
        });

        if (!payment) {
          // No paid payment found, move to disputed
          await prisma.contract.update({
            where: { id: contract.id },
            data: {
              status: ContractStatus.disputed,
              disputedAt: now,
              disputeReason: 'Auto-refund failed: no paid payment found for overdue contract',
            },
          });
          logger.warn(`[DeadlineService] Contract ${contract.id} marked disputed. No paid payment for auto-refund.`);
          continue;
        }

        await prisma.$transaction(async (tx) => {
          // 1. Update payment status
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.refunded,
              refundedAt: now,
            },
          });

          // 2. Update contract status
          await tx.contract.update({
            where: { id: contract.id },
            data: {
              status: ContractStatus.refunded,
              refundedAt: now,
              cancelledAt: now,
            },
          });

          // 3. Update listing status
          await tx.listing.update({
            where: { id: contract.listingId },
            data: { status: ListingStatus.open },
          });

          // 4. Create EscrowLedger
          await tx.escrowLedger.create({
            data: {
              type: EscrowType.refund_to_client,
              contractId: contract.id,
              amount: payment.amount,
              currency: payment.currency,
              paymentId: payment.id,
              metaJson: {
                source: 'deadline_worker',
                reason: 'overdue_auto_cancel',
                autoCancelAt: contract.autoCancelAt,
                previousContractStatus: 'overdue',
              },
            },
          });

          // 5. Set proposal to rejected (system-initiated refund — labeler may re-apply explicitly)
          if (contract.proposalId) {
            const proposal = await tx.proposal.findUnique({
              where: { id: contract.proposalId },
            });
            if (proposal && proposal.status === 'accepted') {
              await tx.proposal.update({
                where: { id: proposal.id },
                data: { status: 'rejected' },
              });
            }
          }
        });

        logger.info(`[DeadlineService] Auto-refunded overdue contract ${contract.id}`);
        processed++;
      } catch (err) {
        logger.error(`[DeadlineService] Error auto-refunding contract ${contract.id}:`, err);
      }
    }

    return processed;
  }

  private async autoDisputeExpiredRevisions(now: Date, batchSize: number): Promise<number> {
    let processed = 0;

    const contracts = await prisma.contract.findMany({
      where: {
        status: ContractStatus.revision_requested,
        revisionDueAt: { lte: now },
      },
      take: batchSize,
    });

    for (const contract of contracts) {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.contract.update({
            where: { id: contract.id },
            data: {
              status: ContractStatus.disputed,
              disputedAt: now,
              disputeReason: 'Revision deadline expired',
            },
          });
          
          await tx.listing.update({
            where: { id: contract.listingId },
            data: { status: ListingStatus.in_progress }, // should already be in_progress but let's be explicit
          });
        });

        logger.info(`[DeadlineService] Auto-disputed contract ${contract.id} (revision expired)`);
        processed++;
      } catch (err) {
        logger.error(`[DeadlineService] Error auto-disputing contract ${contract.id}:`, err);
      }
    }

    return processed;
  }

  private async autoApproveSubmittedContracts(now: Date, batchSize: number): Promise<number> {
    let processed = 0;

    const contracts = await prisma.contract.findMany({
      where: {
        status: ContractStatus.submitted,
        reviewDueAt: { lte: now },
      },
      take: batchSize,
    });

    for (const contract of contracts) {
      try {
        // Require completed normalization
        const normalization = await prisma.submission.findFirst({
          where: {
            contractId: contract.id,
            format: 'CUSTOM_JSON',
            status: SubmissionStatus.completed,
          },
        });

        if (!normalization) {
          logger.warn(`[DeadlineService] Contract ${contract.id} is submitted but normalization not completed. Skipping auto-approve.`);
          continue;
        }

        const payment = await prisma.payment.findFirst({
          where: {
            contractId: contract.id,
            status: PaymentStatus.paid,
          },
        });

        if (!payment) {
          await prisma.contract.update({
            where: { id: contract.id },
            data: {
              status: ContractStatus.disputed,
              disputedAt: now,
              disputeReason: 'Auto-approve failed: no paid payment found',
            },
          });
          logger.warn(`[DeadlineService] Contract ${contract.id} marked disputed. No paid payment for auto-approve.`);
          continue;
        }

        await prisma.$transaction(async (tx) => {
          // 1. Update payment status
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.released,
              releasedAt: now,
            },
          });

          // 2. Update contract status
          await tx.contract.update({
            where: { id: contract.id },
            data: {
              status: ContractStatus.approved,
              approvedAt: now,
              completedAt: now,
            },
          });

          // 3. Update listing status
          await tx.listing.update({
            where: { id: contract.listingId },
            data: { status: ListingStatus.completed },
          });

          // 4. Create EscrowLedger release_to_labeler
          await tx.escrowLedger.create({
            data: {
              type: EscrowType.release_to_labeler,
              contractId: contract.id,
              amount: payment.labelerEarningAmount,
              currency: payment.currency,
              paymentId: payment.id,
              metaJson: {
                source: 'deadline_worker',
                reason: 'review_window_auto_approve',
                reviewDueAt: contract.reviewDueAt,
              },
            },
          });

          // 5. Create EscrowLedger platform_fee
          await tx.escrowLedger.create({
            data: {
              type: EscrowType.platform_fee,
              contractId: contract.id,
              amount: payment.platformFeeAmount,
              currency: payment.currency,
              paymentId: payment.id,
              metaJson: {
                source: 'deadline_worker',
                reason: 'review_window_auto_approve',
                reviewDueAt: contract.reviewDueAt,
              },
            },
          });
        });

        logger.info(`[DeadlineService] Auto-approved contract ${contract.id} and released payment ${payment.id}`);
        processed++;
      } catch (err) {
        logger.error(`[DeadlineService] Error auto-approving contract ${contract.id}:`, err);
      }
    }

    return processed;
  }
}

export const deadlineService = new DeadlineService();
