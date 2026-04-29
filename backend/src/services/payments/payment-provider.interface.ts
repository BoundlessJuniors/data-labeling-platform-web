// ============================================================================
// Payment Provider Interface
// Provider-agnostic abstraction for payment operations.
// Phase 2: Only MockPaymentProvider implements this.
// Phase 3+: IyzicoPaymentProvider will implement this.
// ============================================================================

export interface CreateProviderPaymentInput {
  contractId: string;
  paymentId?: string;
  amount: string;
  currency: string;
  payerUserId: string;
  labelerUserId: string;
  platformFeeAmount: string;
  labelerEarningAmount: string;
}

export interface CreateProviderPaymentResult {
  provider: string;
  providerPaymentId: string;
  providerConversationId?: string | null;
  providerTransactionId?: string | null;
  checkoutUrl?: string | null;
  raw?: unknown;
}

export interface PaymentProvider {
  readonly name: string;

  /**
   * Initialise a payment with the provider. Returns provider-specific IDs
   * and an optional hosted checkout URL.
   */
  createPayment(input: CreateProviderPaymentInput): Promise<CreateProviderPaymentResult>;

  /**
   * (Mock only) Simulate a successful payment confirmation.
   * Real providers use webhooks/callbacks instead of this method.
   */
  markMockPaid?(providerPaymentId: string): Promise<{ raw?: unknown }>;

  /**
   * (Mock only) Simulate a payment failure.
   */
  markMockFailed?(providerPaymentId: string): Promise<{ raw?: unknown }>;

  /**
   * Release funds held in escrow to the labeler/platform after approval.
   * Will be implemented in a later phase.
   */
  releasePayment?(providerPaymentId: string): Promise<{ raw?: unknown }>;

  /**
   * Refund funds to the client.
   * Will be implemented in a later phase.
   */
  refundPayment?(providerPaymentId: string): Promise<{ raw?: unknown }>;
}
