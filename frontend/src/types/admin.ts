/**
 * Admin module types — aligned with backend response shapes
 */

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
  };
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
