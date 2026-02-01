/**
 * Contract types
 */

/** Contract status */
export type ContractStatus =
  | 'pending'
  | 'accepted'
  | 'in_progress'
  | 'submitted'
  | 'revision_requested'
  | 'completed'
  | 'cancelled'
  | 'rejected';

/** Contract entity */
export interface Contract {
  id: string;
  listingId: string;
  labelerId: string;
  clientId: string;
  status: ContractStatus;
  assignedAssets: number;
  completedAssets: number;
  totalPayment: number;
  currency: string;
  startedAt?: string | null;
  submittedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Create contract (apply to listing) */
export interface CreateContractRequest {
  listingId: string;
}

/** Contract with relations */
export interface ContractWithDetails extends Contract {
  listing: {
    id: string;
    title: string;
    pricePerAsset: number;
    annotationFormat: string;
    instructions: string | null;
  };
  labeler: {
    id: string;
    displayName: string | null;
    email: string;
  };
  client: {
    id: string;
    displayName: string | null;
    email: string;
  };
}
