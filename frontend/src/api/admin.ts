/**
 * Admin API Module
 * Uses existing apiClient with interceptors — no duplicate 401 handling.
 */
import apiClient from './client';
import type { ApiResponse, PaginatedResponse } from '@/types/api';
import type {
  AdminDashboardStats,
  AdminUserListItem,
  AdminUpdateUserPayload,
  AdminUploadMonitoringItem,
  AdminUploadMonitoringParams,
  AdminQueueMonitoringResponse,
  AdminContractListItem,
  AdminTaskListItem,
  AdminReviewItem,
  AdminTaskAnnotationsResponse,
  AdminAnnotationRawItem,
  AdminAnnotationNormalizedItem,
  AdminAnnotationPayload,
  AdminRetryNormalizeResponse,
  AdminTaskQcViewResponse,
  JsonValue,
} from '@/types/admin';

export interface AdminUserListParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}

export interface AdminQueueMonitoringParams {
  jobLimit?: number;
}

export interface AdminContractListParams {
  page?: number;
  limit?: number;
  status?: string;
  ownOnly?: boolean;
}

export interface AdminTaskListParams {
  page?: number;
  limit?: number;
  contractId?: string;
  status?: string;
}

export interface AdminReviewListParams {
  page?: number;
  limit?: number;
  taskId?: string;
  decision?: string;
}

export const adminApi = {
  /**
   * Get dashboard statistics
   */
  getDashboardStats() {
    return apiClient.get<ApiResponse<AdminDashboardStats>>('/admin/dashboard');
  },

  /**
   * Get paginated user list
   */
  getUsers(params: AdminUserListParams = {}) {
    return apiClient.get<PaginatedResponse<AdminUserListItem>>('/admin/users', { params });
  },

  /**
   * Update a user (role only in Phase 1)
   */
  updateUser(userId: string, payload: AdminUpdateUserPayload) {
    return apiClient.patch<ApiResponse<AdminUserListItem>>(`/admin/users/${userId}`, payload);
  },

  /**
   * Get upload/asset pipeline monitoring data
   */
  getUploadMonitoring(params: AdminUploadMonitoringParams = {}) {
    return apiClient.get<PaginatedResponse<AdminUploadMonitoringItem>>('/admin/monitoring/uploads', { params });
  },

  /**
   * Get queue monitoring data
   */
  getQueueMonitoring(params: AdminQueueMonitoringParams = {}) {
    return apiClient.get<ApiResponse<AdminQueueMonitoringResponse>>('/admin/monitoring/queues', { params });
  },

  // ============================================================================
  // Contracts Phase 2
  // ============================================================================
  getContracts(params: AdminContractListParams = {}) {
    return apiClient.get<PaginatedResponse<AdminContractListItem>>('/contracts', { params });
  },
  getContractById(id: string) {
    return apiClient.get<ApiResponse<AdminContractListItem>>(`/contracts/${id}`);
  },
  retryNormalize(id: string) {
    return apiClient.post<ApiResponse<AdminRetryNormalizeResponse>>(`/contracts/${id}/normalize-retry`);
  },
  approveContract(id: string) {
    return apiClient.patch<ApiResponse<AdminContractListItem>>(`/contracts/${id}/approve`);
  },
  rejectContract(id: string, reason?: string) {
    return apiClient.patch<ApiResponse<AdminContractListItem>>(`/contracts/${id}/reject`, { reason });
  },
  cancelContract(id: string, reason?: string) {
    return apiClient.patch<ApiResponse<AdminContractListItem>>(`/contracts/${id}/cancel`, { reason });
  },

  // ============================================================================
  // Tasks Phase 2
  // ============================================================================
  getTasks(params: AdminTaskListParams = {}) {
    return apiClient.get<PaginatedResponse<AdminTaskListItem>>('/tasks', { params });
  },
  getTaskById(id: string) {
    return apiClient.get<ApiResponse<AdminTaskListItem>>(`/tasks/${id}`);
  },
  acceptTask(id: string) {
    return apiClient.patch<ApiResponse<AdminTaskListItem>>(`/tasks/${id}/accept`);
  },
  rejectTask(id: string, reason?: string) {
    return apiClient.patch<ApiResponse<AdminTaskListItem>>(`/tasks/${id}/reject`, { reason });
  },
  releaseExpiredLeases() {
    return apiClient.post<ApiResponse<{ releasedCount: number }>>('/tasks/release-expired');
  },
  getTaskQcView(id: string) {
    return apiClient.get<ApiResponse<AdminTaskQcViewResponse>>(`/tasks/${id}/qc-view`);
  },

  // ============================================================================
  // Reviews Phase 2
  // ============================================================================
  getReviews(params: AdminReviewListParams = {}) {
    return apiClient.get<PaginatedResponse<AdminReviewItem>>('/reviews', { params });
  },
  getReviewById(id: string) {
    return apiClient.get<ApiResponse<AdminReviewItem>>(`/reviews/${id}`);
  },
  resolveReview(id: string, payload: { decision: string; notes?: string }) {
    return apiClient.patch<ApiResponse<AdminReviewItem>>(`/reviews/${id}/resolve`, payload);
  },

  // ============================================================================
  // Annotations Phase 2 (Debug)
  // ============================================================================
  getTaskAnnotations(id: string) {
    return apiClient.get<ApiResponse<AdminTaskAnnotationsResponse>>(`/annotations/task/${id}`);
  },
  createRawAnnotation(payload: { taskId: string; payloadJson: AdminAnnotationPayload }) {
     return apiClient.post<ApiResponse<AdminAnnotationRawItem>>('/annotations/raw', payload);
  },
  normalizeAnnotation(payload: { taskId: string; normalizedJson: JsonValue }) {
     return apiClient.post<ApiResponse<AdminAnnotationNormalizedItem>>('/annotations/normalize', payload);
  },
};

