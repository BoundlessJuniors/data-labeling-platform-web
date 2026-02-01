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
    return apiClient.get<PaginatedResponse<Asset>>(`/datasets/${params.datasetId}/assets`, {
      params: { page: params.page, limit: params.limit },
    });
  },

  /**
   * Get single asset by ID
   */
  get(datasetId: string, assetId: string) {
    return apiClient.get<ApiResponse<Asset>>(`/datasets/${datasetId}/assets/${assetId}`);
  },

  /**
   * Delete an asset
   */
  delete(datasetId: string, assetId: string) {
    return apiClient.delete<ApiResponse<void>>(`/datasets/${datasetId}/assets/${assetId}`);
  },
};
