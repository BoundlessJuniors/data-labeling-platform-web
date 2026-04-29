// ============================================================================
// Mock Payment Provider
// In-process mock — no HTTP calls, no external dependencies.
// Used in development and Phase 2 testing.
// Switch PAYMENT_PROVIDER="iyzico" in a later phase to use the real provider.
// ============================================================================

import { randomUUID } from 'crypto';
import {
  PaymentProvider,
  CreateProviderPaymentInput,
  CreateProviderPaymentResult,
} from './payment-provider.interface';

export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';

  /**
   * Creates mock provider IDs instantly — no network call.
   * Returns a fake checkout URL for development tracing.
   */
  async createPayment(input: CreateProviderPaymentInput): Promise<CreateProviderPaymentResult> {
    const providerPaymentId = `mock_pay_${randomUUID()}`;
    const providerConversationId = `mock_conv_${randomUUID()}`;
    const providerTransactionId = `mock_tx_${randomUUID()}`;

    return {
      provider: this.name,
      providerPaymentId,
      providerConversationId,
      providerTransactionId,
      checkoutUrl: `mock://checkout/${providerPaymentId}`,
      raw: {
        mode: 'mock',
        contractId: input.contractId,
        amount: input.amount,
        currency: input.currency,
        platformFeeAmount: input.platformFeeAmount,
        labelerEarningAmount: input.labelerEarningAmount,
      },
    };
  }

  /**
   * Simulates the provider notifying us that payment succeeded.
   * Equivalent to a real provider's webhook callback.
   */
  async markMockPaid(providerPaymentId: string): Promise<{ raw?: unknown }> {
    return {
      raw: {
        mode: 'mock',
        providerPaymentId,
        status: 'paid',
        paidAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Simulates the provider notifying us that payment failed.
   */
  async markMockFailed(providerPaymentId: string): Promise<{ raw?: unknown }> {
    return {
      raw: {
        mode: 'mock',
        providerPaymentId,
        status: 'failed',
        failedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Placeholder — fund release is handled in a later phase.
   */
  async releasePayment(providerPaymentId: string): Promise<{ raw?: unknown }> {
    return {
      raw: {
        mode: 'mock',
        providerPaymentId,
        status: 'released',
        releasedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Placeholder — refund logic is handled in a later phase.
   */
  async refundPayment(providerPaymentId: string): Promise<{ raw?: unknown }> {
    return {
      raw: {
        mode: 'mock',
        providerPaymentId,
        status: 'refunded',
        refundedAt: new Date().toISOString(),
      },
    };
  }
}

/** Singleton instance */
export const mockPaymentProvider = new MockPaymentProvider();
