/**
 * Assets API Module
 */
import apiClient from './client';
import type { Asset } from '@/types/asset';
import type { ApiResponse, PaginatedResponse } from '@/types/api';

export interface AssetListParams {
  page?: number;
  limit?: number;
  datasetId: string;
}

export const assetsApi = {
  /**
   * Get paginated list of assets for a dataset
   */
  list(params: AssetListParams) {
    return apiClient.get<PaginatedResponse<Asset>>(`/assets`, {
      params: { page: params.page, limit: params.limit, datasetId: params.datasetId },
    });
  },

  /**
   * Get single asset by ID
   */
  get(datasetId: string, assetId: string) {
    return apiClient.get<ApiResponse<Asset>>(`/assets/${assetId}`);
  },

  /**
   * Upload a new asset (multipart/form-data)
   */
  upload(datasetId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('datasetId', datasetId);

    return apiClient.post<ApiResponse<Asset>>('/assets', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * Delete an asset
   */
  delete(datasetId: string, assetId: string) {
    return apiClient.delete<ApiResponse<void>>(`/assets/${assetId}`);
  },
};
