/**
 * Datasets API Module
 */
import apiClient from './client';
import type {
  Dataset,
  CreateDatasetRequest,
  UpdateDatasetRequest,
} from '@/types/dataset';
import type { ApiResponse, PaginatedResponse } from '@/types/api';

export interface DatasetListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export const datasetsApi = {
  /**
   * Get paginated list of datasets
   */
  list(params: DatasetListParams = {}) {
    return apiClient.get<PaginatedResponse<Dataset>>('/datasets', { params });
  },

  /**
   * Get single dataset by ID
   */
  get(id: string) {
    return apiClient.get<ApiResponse<Dataset>>(`/datasets/${id}`);
  },

  /**
   * Create a new dataset
   */
  create(data: CreateDatasetRequest) {
    return apiClient.post<ApiResponse<Dataset>>('/datasets', data);
  },

  /**
   * Update an existing dataset
   */
  update(id: string, data: UpdateDatasetRequest) {
    return apiClient.patch<ApiResponse<Dataset>>(`/datasets/${id}`, data);
  },

  /**
   * Delete a dataset
   */
  delete(id: string) {
    return apiClient.delete<ApiResponse<void>>(`/datasets/${id}`);
  },
};
