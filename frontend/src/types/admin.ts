/**
 * Admin module types — aligned with backend response shapes
 */
export type JsonPrimitive = string | number | boolean | null;

export interface JsonObject {
  [key: string]: JsonValue;
}

export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
// ============================================================================
// Dashboard
// ============================================================================

export interface AdminDashboardStats {
  totalUsers: number;
  totalClients: number;
  totalLabelers: number;
  totalDatasets: number;
  totalAssets: number;
  totalListings: number;
  totalContracts: number;
  totalTasks: number;
  // Status breakdowns
  openListings: number;
  activeContracts: number;
  submittedContracts: number;
  revisionRequestedContracts: number;
  processingAssets: number;
  errorAssets: number;
  pendingAssets: number;
  uploadedAssets: number;
  readyTasks: number;
  leasedTasks: number;
  submittedTasks: number;
  rejectedTasks: number;
  failedSubmissions: number;
  processingSubmissions: number;
}

// ============================================================================
// Users
// ============================================================================

/** Matches backend admin.service getUsers select */
export interface AdminUserListItem {
  id: string;
  email: string;
  displayName: string | null;
  role: 'client' | 'labeler' | 'admin';
  ratingAvg: string | null; // Prisma Decimal comes as string
  createdAt: string;
  _count: {
    datasets: number;
    listingsOwned: number;
    contractsAsClient: number;
    contractsAsLabeler: number;
    taskLeases?: number;
    reviews?: number;
    proposals?: number;
  };
}

/** Subset returned by backend getUserById audit-log summary */
export interface AdminUserAuditLogSummary {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
}

/** Subset returned by backend getUserById proposal summary */
export interface AdminUserProposalSummary {
  id: string;
  status: string;
  priceQuote: string | number;
  createdAt: string;
}

/** Subset returned by backend getUserById contract summary */
export interface AdminUserContractSummary {
  id: string;
  status: string;
  agreedPriceTotal: string | number;
  startedAt: string;
}

/** Subset returned by backend getUserById review summary */
export interface AdminUserReviewSummary {
  id: string;
  decision: string;
  taskId: string;
  createdAt: string;
}

/**
 * Full user detail returned by GET /admin/users/:id
 * Extends the list shape with nested recent-activity arrays.
 */
export interface AdminUserDetail extends AdminUserListItem {
  _count: AdminUserListItem['_count'] & {
    taskLeases: number;
    reviews: number;
    proposals: number;
  };
  contractsAsClient?: AdminUserContractSummary[];
  contractsAsLabeler?: AdminUserContractSummary[];
  reviews?: AdminUserReviewSummary[];
  proposals?: AdminUserProposalSummary[];
  auditLogs?: AdminUserAuditLogSummary[];
}

export interface AdminUpdateUserPayload {
  role: string;
}

// ============================================================================
// Upload Monitoring
// ============================================================================

export type AdminAssetStatus = 'pending' | 'uploaded' | 'processing' | 'ready' | 'error';

export interface AdminUploadMonitoringItem {
  id: string;
  datasetId: string;
  objectKey: string;
  mimeType: string;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  status: AdminAssetStatus;
  processingError: string | null;
  createdAt: string;
  dataset: {
    id: string;
    name: string;
    owner: {
      id: string;
      email: string;
      displayName: string | null;
    };
  };
}

export interface AdminUploadMonitoringParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

// ============================================================================
// Queue Monitoring
// ============================================================================

export interface AdminQueueCounts {
  waiting: number;
  active: number;
  delayed: number;
  failed: number;
  completed: number;
  paused: number;
}

export interface AdminQueueJobItem {
  id: string | undefined;
  name: string;
  queueName: string;
  state: string;
  attemptsMade: number;
  timestamp: number;
  processedOn: number | null;
  finishedOn: number | null;
  failedReason: string | null;
  data: Record<string, unknown> | null;
}

export interface AdminQueueSummary {
  name: string;
  counts: AdminQueueCounts;
  recentJobs: AdminQueueJobItem[];
}

export interface AdminQueueMonitoringResponse {
  queues: AdminQueueSummary[];
}

// ============================================================================
// Contracts (Admin Phase 2)
// ============================================================================

export type AdminContractStatus =
  | 'pending_payment'
  | 'active'
  | 'overdue'
  | 'submitted'
  | 'approved'
  | 'revision_requested'
  | 'disputed'
  | 'refunded'
  | 'cancelled';


export interface AdminContractListItem {
  id: string;
  listingId: string;
  clientUserId: string;
  labelerUserId: string;
  status: AdminContractStatus;
  agreedPriceTotal: string | number; // Prisma Decimal
  currency: string;
  startedAt: string | null;
  completedAt: string | null;
  revisionCount: number;
  listing?: { id: string; title: string };
  client?: { id: string; email: string; displayName: string | null };
  labeler?: { id: string; email: string; displayName: string | null };
  _count?: { tasks: number };
  tasks?: { status: string }[];
}

// ============================================================================
// Tasks (Admin Phase 2)
// ============================================================================

export type AdminTaskStatus = 'ready' | 'leased' | 'submitted' | 'accepted' | 'rejected';

export interface AdminTaskQcViewResponse {
  id: string;
  status: AdminTaskStatus;
  asset: {
    id: string;
    objectKey: string;
    mimeType: string;
    width: number | null;
    height: number | null;
  } | null;
  imageUrl: string | null;
  latestRaw: AdminAnnotationRawItem | null;
  normalized: AdminAnnotationNormalizedItem | null;
  normalizeReady: boolean;
  labelSet: {
    id: string;
    name: string;
    version: number;
    labels: {
      id: string;
      name: string;
      color: string | null;
      attributesSchemaJson?: JsonValue | null;
    }[];
  } | null;
}

export interface AdminTaskListItem {
  id: string;
  contractId: string;
  assetId: string;
  status: AdminTaskStatus;
  attemptCount: number;
  annotationCount: number;
  lastLeasedAt: string | null;
  createdAt: string;
  updatedAt: string;
  asset?: {
    id: string;
    objectKey: string;
    mimeType: string;
    width: number | null;
    height: number | null;
  };
  contract?: { id: string; listingId: string };
  taskLease?: { labelerUserId: string; leasedUntil: string } | null;
}

// ============================================================================
// Reviews (Admin Phase 2)
// ============================================================================

export type AdminReviewDecision = 'accept' | 'reject';

export interface AdminReviewItem {
  id: string;
  taskId: string;
  reviewerUserId: string;
  decision: AdminReviewDecision;
  notes: string | null;
  createdAt: string;
  task?: { id: string; status: string; assetId: string };
  reviewer?: { id: string; email: string; displayName: string | null };
}

// ============================================================================
// Annotations (Admin Phase 2)
// ============================================================================
export type AdminAnnotationType =
  | 'bbox'
  | 'polygon'
  | 'polyline'
  | 'keypoint'
  | 'circle'
  | 'export';

export interface AdminAnnotationPayload {
  type: AdminAnnotationType;
  data: JsonValue;
}

export interface AdminRetryNormalizeResponse {
  submissionId: string;
  status: 'processing';
}

export interface AdminAnnotationRawItem {
  id: string;
  taskId: string;
  labelerUserId: string;
  leaseToken: string | null;
  payloadHash: string;
  payloadJson: AdminAnnotationPayload;
  createdAt: string;
  labeler?: { id: string; email: string; displayName: string | null };
}

export interface AdminAnnotationNormalizedItem {
  id: string;
  taskId: string;
  labelerUserId: string;
  normalizedJson: JsonValue;
  version: number;
  createdAt: string;
  updatedAt: string;
  labeler?: { id: string; email: string; displayName: string | null };
}

export interface AdminTaskAnnotationsResponse {
  raw: AdminAnnotationRawItem[];
  normalized: AdminAnnotationNormalizedItem | null;
}

// ============================================================================
// Audit Logs (Admin Phase 3)
// ============================================================================

export interface AdminAuditLogItem {
  id: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  metaJson: JsonValue | null;
  createdAt: string;
  actor: {
    id: string;
    email: string;
    displayName: string | null;
    role: string;
  };
}

// ============================================================================
// Payments (Admin Payment Dashboard)
// ============================================================================

export type AdminPaymentStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'refunded' | 'released';

export interface AdminPaymentDashboardStats {
  totalPayments: number;
  pendingPayments: number;
  paidPayments: number;
  failedPayments: number;
  expiredPayments: number;
  refundedPayments: number;
  releasedPayments: number;
  totalPaidAmount: string | number;
  totalEscrowHeld: string | number;
  totalReleasedAmount: string | number;
  totalPlatformFeeAmount: string | number;
  totalRefundedAmount: string | number;
}

export interface AdminPaymentListItem {
  id: string;
  contractId: string;
  payerUserId: string;
  labelerUserId: string | null;
  amount: string | number;
  currency: string;
  provider: string;
  providerRef: string | null;
  providerPaymentId: string | null;
  providerConversationId: string | null;
  providerTransactionId: string | null;
  platformFeeAmount: string | number;
  labelerEarningAmount: string | number;
  checkoutUrl: string | null;
  status: AdminPaymentStatus;
  paymentExpiresAt: string | null;
  paidAt: string | null;
  failedAt: string | null;
  releasedAt: string | null;
  refundedAt: string | null;
  createdAt: string;
  updatedAt: string;
  payer?: {
    id: string;
    email: string;
    displayName: string | null;
    role: string;
  };
  labeler?: {
    id: string;
    email: string;
    displayName: string | null;
    role: string;
  };
  contract?: {
    id: string;
    status: string;
    listingId: string;
    listing?: {
      id: string;
      title: string;
      status: string;
    };
  };
}

export interface AdminPaymentListParams {
  page?: number;
  limit?: number;
  status?: string;
  provider?: string;
  search?: string;
}
