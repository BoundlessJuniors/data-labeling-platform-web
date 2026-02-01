/**
 * Tasks API Module
 */
import apiClient from './client';
import type { Task, TaskWithDetails, CreateReviewRequest, TaskReview } from '@/types/task';
import type { ApiResponse, PaginatedResponse } from '@/types/api';

export interface TaskListParams {
  page?: number;
  limit?: number;
  contractId?: string;
  status?: string;
}

export const tasksApi = {
  /**
   * Get paginated list of tasks for a contract
   */
  list(params: TaskListParams = {}) {
    return apiClient.get<PaginatedResponse<Task>>('/tasks', { params });
  },

  /**
   * Get single task by ID with details
   */
  get(id: string) {
    return apiClient.get<ApiResponse<TaskWithDetails>>(`/tasks/${id}`);
  },

  /**
   * Create a review (QC decision) for a task
   */
  createReview(data: CreateReviewRequest) {
    return apiClient.post<ApiResponse<TaskReview>>(`/tasks/${data.taskId}/reviews`, data);
  },
};
