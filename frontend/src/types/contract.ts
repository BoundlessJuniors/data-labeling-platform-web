/**
 * Contract types
 */

/** Contract status */
export type ContractStatus =
  | 'active'
  | 'submitted'
  | 'approved'
  | 'revision_requested'
  | 'completed'
  | 'cancelled'
  | 'rejected';

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
  createdAt: string;
  updatedAt: string;
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
