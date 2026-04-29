/**
 * Payment types
 */

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'refunded' | 'released';

export interface PaymentContractListing {
  id: string;
  title: string;
  status: string;
}

export interface PaymentContract {
  id: string;
  listingId: string;
  clientUserId: string;
  labelerUserId: string;
  agreedPriceTotal: number | string;
  currency: string;
  status: string;
  listing?: PaymentContractListing | null;
}

export interface Payment {
  id: string;
  contractId: string;
  payerUserId: string;
  labelerUserId: string;
  amount: number | string;
  currency: string;
  provider: string;
  providerRef?: string | null;
  providerPaymentId?: string | null;
  providerConversationId?: string | null;
  providerTransactionId?: string | null;
  platformFeeAmount: number | string;
  labelerEarningAmount: number | string;
  checkoutUrl?: string | null;
  status: PaymentStatus;
  paymentExpiresAt?: string | null;
  paidAt?: string | null;
  failedAt?: string | null;
  releasedAt?: string | null;
  refundedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  contract?: PaymentContract | null;
}
