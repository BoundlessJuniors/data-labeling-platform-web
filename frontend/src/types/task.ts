/**
 * Task types
 */

/** Task status - discriminated union for clear state management */
export type TaskStatus =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'submitted'
  | 'revision_requested'
  | 'resubmitted'
  | 'approved'
  | 'rejected';

/** QC Decision */
export type QCDecision = 'approved' | 'rejected' | 'revision_requested';

/** Task entity */
export interface Task {
  id: string;
  contractId: string;
  assetId: string;
  labelerId: string | null;
  status: TaskStatus;
  priority: number;
  leasedUntil?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Task with asset and review info */
export interface TaskWithDetails extends Task {
  asset: {
    id: string;
    fileName: string;
    fileUrl: string;
    thumbnailUrl?: string | null;
  };
  contract: {
    id: string;
    listingId: string;
    listing: {
      title: string;
      instructions: string | null;
      annotationFormat: string;
    };
  };
  reviews: TaskReview[];
}

/** Task review/QC comment */
export interface TaskReview {
  id: string;
  taskId: string;
  reviewerId: string;
  decision: QCDecision;
  comment: string | null;
  createdAt: string;
  reviewer?: {
    id: string;
    displayName: string | null;
    role: string;
  };
}

/** Create review request */
export interface CreateReviewRequest {
  taskId: string;
  decision: QCDecision;
  comment?: string;
}

/** Task submission info (from desktop) */
export interface TaskSubmission {
  taskId: string;
  annotationFileUrl: string;
  annotationFormat: string;
  submittedAt: string;
}
