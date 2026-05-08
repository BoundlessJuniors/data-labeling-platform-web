/**
 * Proposal types
 */

/** Proposal status */
export type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

/** Proposal entity (from GET /api/proposals) */
export interface Proposal {
  id: string;
  listingId: string;
  labelerUserId: string;
  priceQuote: number;
  deliveryDays: number;
  coverLetter: string | null;
  status: ProposalStatus;
  createdAt: string;
  listing?: {
    id: string;
    title: string;
    priceTotal: number;
    currency: string;
    status?: string;
  };
  labeler: {
    id: string;
    email: string;
    displayName: string | null;
    ratingAvg: string | number | null;
    ratingCount: number;
  };
}

/** Accept proposal response */
import type { Payment } from './payment';

export interface AcceptProposalResponse {
  proposal: Proposal;
  contract: {
    id: string;
    listingId: string;
    clientUserId: string;
    labelerUserId: string;
    agreedPriceTotal: number;
    currency: string;
    status: string;
  };
  payment: Payment;
}
