/**
 * Contract types
 */

export type ContractStatus =
  | 'pending_payment'
  | 'active'
  | 'overdue'
  | 'submitted'
  | 'revision_requested'
  | 'approved'
  | 'cancelled'
  | 'refunded'
  | 'disputed'
  | 'completed' // legacy
  | 'rejected'; // legacy

/** Contract entity (from GET /api/contracts) */
export interface Contract {
  id: string;
  listingId: string;
  labelerUserId: string;
  clientUserId: string;
  status: ContractStatus;
  agreedPriceTotal: number;
  currency: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
  paidAt?: string | null;
  dueAt?: string | null;
  overdueAt?: string | null;
  autoCancelAt?: string | null;
  submittedAt?: string | null;
  reviewDueAt?: string | null;
  revisionDueAt?: string | null;
  approvedAt?: string | null;
  cancelledAt?: string | null;
  refundedAt?: string | null;
  disputedAt?: string | null;
  disputeReason?: string | null;
  revisionReason?: string | null;
  revisionRequestedAt?: string | null;
  revisionCount?: number;
  maxRevisionCount?: number;
  deliveryDays?: number;
  gracePeriodHours?: number;
  reviewWindowHours?: number;
  revisionWindowHours?: number;
  // Nested relations from backend include
  listing?: {
    id: string;
    title: string;
  };
  client?: {
    id: string;
    email: string;
    displayName: string | null;
  };
  labeler?: {
    id: string;
    email: string;
    displayName: string | null;
  };
  _count?: {
    tasks: number;
    payments?: number;
  };
  tasks?: { status: string }[];
}

/** Contract with full details (from GET /api/contracts/:id) */
export interface ContractWithDetails extends Contract {
  listing: {
    id: string;
    title: string;
    dataset?: {
      id: string;
      name: string;
    };
    labelSet?: {
      id: string;
      name: string;
      version: number;
      labels: { id: string; name: string; color?: string }[];
    };
  };
  labeler: {
    id: string;
    displayName: string | null;
    email: string;
    ratingAvg?: number | null;
  };
  client: {
    id: string;
    displayName: string | null;
    email: string;
    ratingAvg?: number | null;
  };
  tasks?: { id: string; status: string }[];
  _count: {
    tasks: number;
    payments: number;
  };
}

/** Create contract request (legacy — kept for compatibility) */
export interface CreateContractRequest {
  listingId: string;
}
