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
};
