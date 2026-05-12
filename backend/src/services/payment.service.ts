// ============================================================================
// Payment Service — Phase 2
// Handles mock-provider payment lifecycle:
//   initPaymentForContract → mockSuccess → (mockFail)
//
// NOTE: Payment amount, fee, and labeler earning are ALWAYS derived from the
// contract record — never accepted from request body.
// ============================================================================

import { ContractStatus, ListingStatus, PaymentStatus, EscrowType, UserRole, Prisma } from '@prisma/client';
import prisma from '../lib/db';
import logger from '../lib/logger';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors';
import { invalidateApiCache } from '../lib/redis';
import { auditService } from './audit.service';
import { mockPaymentProvider } from './payments/mock-payment.provider';

// ── Date helpers ─────────────────────────────────────────────────────────────

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

// ── Config helpers ────────────────────────────────────────────────────────────

function getPlatformFeeRate(): number {
  const raw = process.env.PLATFORM_FEE_RATE;
  const val = raw ? parseFloat(raw) : 0.1;
  return isNaN(val) ? 0.1 : val;
}

function getPaymentExpiresMinutes(): number {
  const raw = process.env.PAYMENT_EXPIRES_MINUTES;
  const val = raw ? parseInt(raw, 10) : 30;
  return isNaN(val) ? 30 : val;
}

function getPaymentProvider(): string {
  return process.env.PAYMENT_PROVIDER ?? 'mock';
}

// ── Fee breakdown ─────────────────────────────────────────────────────────────

function calculateBreakdown(agreedPriceTotal: Prisma.Decimal): {
  platformFeeAmount: number;
  labelerEarningAmount: number;
} {
  const feeRate = getPlatformFeeRate();
  const amountNumber = Number(agreedPriceTotal);
  const platformFeeAmount = parseFloat((amountNumber * feeRate).toFixed(2));
  const labelerEarningAmount = parseFloat((amountNumber - platformFeeAmount).toFixed(2));
  return { platformFeeAmount, labelerEarningAmount };
}

// ── Full include shape reused across methods ──────────────────────────────────

const paymentInclude = {
  contract: {
    include: {
      listing: { select: { id: true, title: true, status: true } },
    },
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// PaymentService
// ─────────────────────────────────────────────────────────────────────────────

export class PaymentService {
  // ──────────────────────────────────────────────────────────────────────────
  // 1. initPaymentForContract
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Creates (or returns an existing) pending Payment for a pending_payment
   * Contract. Only the client who owns the contract, or an admin, may call this.
   *
   * Idempotent: if a non-expired pending payment already exists it is returned
   * without creating a duplicate.
   */
  async initPaymentForContract(contractId: string, userId: string, userRole: UserRole) {
    // ── 1. Load contract ───────────────────────────────────────────────────
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundError('Contract');
    }

    // ── 2. Access control ──────────────────────────────────────────────────
    if (userRole !== 'admin' && contract.clientUserId !== userId) {
      throw new ForbiddenError('Only the client can initialize payment for this contract');
    }

    // ── 3. Contract must be pending_payment ────────────────────────────────
    if (contract.status !== ContractStatus.pending_payment) {
      const readableStatus = contract.status.replace(/_/g, ' ');
      throw new BadRequestError(
        `Contract is not awaiting payment — current status: ${readableStatus}`
      );
    }

    // ── 4. Provider guard (Phase 2: mock only) ─────────────────────────────
    const provider = getPaymentProvider();
    if (provider !== 'mock') {
      throw new BadRequestError('Only mock payment provider is implemented in Phase 2');
    }

    // ── 5. Check for an existing usable payment ────────────────────────────
    const existingPayment = await prisma.payment.findFirst({
      where: { contractId },
      orderBy: { createdAt: 'desc' },
      include: paymentInclude,
    });

    if (existingPayment) {
      if (existingPayment.status === PaymentStatus.paid || existingPayment.status === PaymentStatus.released) {
        throw new BadRequestError('A completed payment already exists for this contract');
      }

      // Return non-expired pending payment instead of creating a duplicate
      if (
        existingPayment.status === PaymentStatus.pending &&
        existingPayment.paymentExpiresAt &&
        existingPayment.paymentExpiresAt > new Date()
      ) {
        logger.info(`Returning existing pending payment ${existingPayment.id} for contract ${contractId}`);
        return existingPayment;
      }
      if (
        existingPayment.status === PaymentStatus.pending &&
        existingPayment.paymentExpiresAt &&
        existingPayment.paymentExpiresAt <= new Date()
      ) {
        await prisma.payment.update({
          where: { id: existingPayment.id },
          data: { status: PaymentStatus.expired },
        });

        logger.info(`Expired old pending payment ${existingPayment.id} for contract ${contractId}`);
      }
    }

    // ── 6. Prepare breakdown ───────────────────────────────────────────────
    const { platformFeeAmount, labelerEarningAmount } = calculateBreakdown(contract.agreedPriceTotal);
    const amountStr = contract.agreedPriceTotal.toString();
    const now = new Date();
    const paymentExpiresAt = addMinutes(now, getPaymentExpiresMinutes());

    // ── 7. Call mock provider ──────────────────────────────────────────────
    const providerResult = await mockPaymentProvider.createPayment({
      contractId,
      amount: amountStr,
      currency: contract.currency,
      payerUserId: contract.clientUserId,
      labelerUserId: contract.labelerUserId,
      platformFeeAmount: platformFeeAmount.toString(),
      labelerEarningAmount: labelerEarningAmount.toString(),
    });

    // ── 8. Persist Payment record ──────────────────────────────────────────
    const payment = await prisma.payment.create({
      data: {
        contractId,
        payerUserId: contract.clientUserId,
        labelerUserId: contract.labelerUserId,
        amount: contract.agreedPriceTotal,
        currency: contract.currency,
        provider: providerResult.provider,
        providerRef: providerResult.providerPaymentId,   // backward compat
        providerPaymentId: providerResult.providerPaymentId,
        providerConversationId: providerResult.providerConversationId ?? null,
        providerTransactionId: providerResult.providerTransactionId ?? null,
        checkoutUrl: providerResult.checkoutUrl ?? null,
        platformFeeAmount,
        labelerEarningAmount,
        paymentExpiresAt,
        status: PaymentStatus.pending,
      },
      include: paymentInclude,
    });

    logger.info(`Payment ${payment.id} initialised for contract ${contractId} (provider: ${provider})`);

    // ── 9. Audit (non-fatal) ───────────────────────────────────────────────
    try {
      await auditService.logAction(
        userId,
        'payment.created',
        'payment',
        payment.id,
        {
          contractId,
          provider,
          amount: amountStr,
          currency: contract.currency,
        } as Prisma.InputJsonValue
      );
    } catch (auditErr) {
      logger.warn('Audit log failed for payment.created', auditErr);
    }

    return payment;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. getPaymentById
  // ──────────────────────────────────────────────────────────────────────────

  async getPaymentById(paymentId: string, userId: string, userRole: UserRole) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: paymentInclude,
    });

    if (!payment) {
      throw new NotFoundError('Payment');
    }

    if (userRole === 'admin') return payment;

    if (userRole === 'client' && payment.payerUserId === userId) return payment;

    if (userRole === 'labeler' && payment.labelerUserId === userId) return payment;

    throw new ForbiddenError('You do not have permission to view this payment');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. getPaymentByContract
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Returns the latest Payment for a contract, or null if none exists.
   * Does NOT auto-create a payment.
   */
  async getPaymentByContract(contractId: string, userId: string, userRole: UserRole) {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      select: { id: true, clientUserId: true, labelerUserId: true },
    });

    if (!contract) {
      throw new NotFoundError('Contract');
    }

    if (userRole !== 'admin') {
      if (contract.clientUserId !== userId && contract.labelerUserId !== userId) {
        throw new ForbiddenError('You do not have permission to view payments for this contract');
      }
    }

    const payment = await prisma.payment.findFirst({
      where: { contractId },
      orderBy: { createdAt: 'desc' },
      include: paymentInclude,
    });

    return payment ?? null;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. mockSuccess  — THE MAIN PHASE 2 ACTIVATION FLOW
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Simulates a successful payment callback from the mock provider.
   * On success:
   *   - Payment → paid
   *   - Contract → active (startedAt / paidAt / dueAt / autoCancelAt set)
   *   - Listing → in_progress
   *   - Other pending proposals for this listing → rejected
   *   - EscrowLedger hold entry created
   */
  async mockSuccess(paymentId: string, userId: string, userRole: UserRole) {
    // ── 1. Load payment with contract + listing ────────────────────────────
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        contract: {
          include: {
            listing: { select: { id: true, title: true, status: true } },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundError('Payment');
    }

    // ── 2. Access control ──────────────────────────────────────────────────
    if (userRole !== 'admin' && payment.payerUserId !== userId) {
      throw new ForbiddenError('Only the payment payer or an admin can confirm this payment');
    }

    // ── 3. Provider guard ──────────────────────────────────────────────────
    if (payment.provider !== 'mock') {
      throw new BadRequestError('mock-success is only available for the mock payment provider');
    }

    // ── 4. Payment must be pending ─────────────────────────────────────────
    if (payment.status !== PaymentStatus.pending) {
      throw new BadRequestError(
        `Payment is not pending — current status: ${payment.status.replace(/_/g, ' ')}`
      );
    }

    // ── 5. Expiry check ────────────────────────────────────────────────────
    const now = new Date();
    if (payment.paymentExpiresAt && payment.paymentExpiresAt <= now) {
      // Mark expired then reject
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.expired },
      });
      throw new BadRequestError('Payment has expired — please initialise a new payment');
    }

    // ── 6. Contract must be pending_payment ────────────────────────────────
    const contract = payment.contract;
    if (contract.status !== ContractStatus.pending_payment) {
      throw new BadRequestError(
        `Contract must be pending_payment before payment activation — current: ${contract.status}`
      );
    }

    // ── 7. Call mock provider ──────────────────────────────────────────────
    await mockPaymentProvider.markMockPaid!(payment.providerPaymentId!);

    // ── 8. Compute contract deadline timestamps ────────────────────────────
    const startedAt = now;
    const dueAt = addDays(startedAt, contract.deliveryDays);
    const autoCancelAt = addHours(dueAt, contract.gracePeriodHours);

    // ── 9. Atomic transaction ──────────────────────────────────────────────
    const updatedPayment = await prisma.$transaction(async (tx) => {
      // 9a. Mark payment paid
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.paid,
          paidAt: now,
        },
      });

      // 9b. Activate contract
      await tx.contract.update({
        where: { id: contract.id },
        data: {
          status: ContractStatus.active,
          paidAt: now,
          startedAt,
          dueAt,
          autoCancelAt,
        },
      });

      // 9c. Move listing to in_progress
      await tx.listing.update({
        where: { id: contract.listingId },
        data: { status: ListingStatus.in_progress },
      });

      // 9d. Reject remaining pending proposals
      await tx.proposal.updateMany({
        where: {
          listingId: contract.listingId,
          status: 'pending',
          ...(contract.proposalId ? { id: { not: contract.proposalId } } : {}),
        },
        data: { status: 'rejected' },
      });

      // 9e. Create EscrowLedger hold entry
      await tx.escrowLedger.create({
        data: {
          contractId: contract.id,
          paymentId,
          type: EscrowType.hold,
          amount: payment.amount,
          currency: payment.currency,
          metaJson: {
            provider: payment.provider,
            providerPaymentId: payment.providerPaymentId,
            platformFeeAmount: Number(payment.platformFeeAmount),
            labelerEarningAmount: Number(payment.labelerEarningAmount),
          },
        },
      });

      // Return fresh payment after all related updates
      return tx.payment.findUniqueOrThrow({
        where: { id: paymentId },
        include: paymentInclude,
      });
    });

    logger.info(
      `Payment ${paymentId} mock-paid → Contract ${contract.id} activated ` +
      `(dueAt: ${dueAt.toISOString()}, autoCancelAt: ${autoCancelAt.toISOString()})`
    );

    // Invalidate listing cache — mockSuccess moves listing to 'in_progress' and
    // rejects other pending proposals, both of which affect listing responses.
    await invalidateApiCache('/api/v1/listings');

    // ── 10. Audit (non-fatal) ──────────────────────────────────────────────
    try {
      await auditService.logAction(userId, 'payment.mock_paid', 'payment', paymentId, {
        contractId: contract.id,
        dueAt: dueAt.toISOString(),
        autoCancelAt: autoCancelAt.toISOString(),
      } as Prisma.InputJsonValue);

      await auditService.logAction(userId, 'contract.activated', 'contract', contract.id, {
        paymentId,
        startedAt: startedAt.toISOString(),
        dueAt: dueAt.toISOString(),
      } as Prisma.InputJsonValue);
    } catch (auditErr) {
      logger.warn('Audit log failed for payment.mock_paid / contract.activated', auditErr);
    }

    return updatedPayment;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5. mockFail
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Simulates a payment failure. Contract remains pending_payment so the
   * client may retry with a new payment.
   */
  async mockFail(paymentId: string, userId: string, userRole: UserRole) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: paymentInclude,
    });

    if (!payment) {
      throw new NotFoundError('Payment');
    }

    if (userRole !== 'admin' && payment.payerUserId !== userId) {
      throw new ForbiddenError('Only the payment payer or an admin can fail this payment');
    }

    if (payment.provider !== 'mock') {
      throw new BadRequestError('mock-fail is only available for the mock payment provider');
    }

    if (payment.status !== PaymentStatus.pending) {
      throw new BadRequestError(
        `Payment is not pending — current status: ${payment.status.replace(/_/g, ' ')}`
      );
    }

    await mockPaymentProvider.markMockFailed!(payment.providerPaymentId!);

    const now = new Date();

    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.failed,
        failedAt: now,
      },
      include: paymentInclude,
    });

    logger.info(`Payment ${paymentId} mock-failed — contract ${payment.contractId} remains pending_payment`);

    try {
      await auditService.logAction(userId, 'payment.mock_failed', 'payment', paymentId, {
        contractId: payment.contractId,
      } as Prisma.InputJsonValue);
    } catch (auditErr) {
      logger.warn('Audit log failed for payment.mock_failed', auditErr);
    }

    return updatedPayment;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // (Internal) expirePayment — to be called by deadline worker in Phase 3+
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Marks a pending payment as expired.
   * Does NOT cancel the contract; the deadline worker handles that separately.
   */
  async expirePayment(paymentId: string): Promise<void> {
    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.expired },
    });

    logger.info(`Payment ${paymentId} marked as expired`);
  }
}

/** Singleton instance */
export const paymentService = new PaymentService();
