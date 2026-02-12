/**
 * LabelSets API Module
 */
import apiClient from './client';
import type { ApiResponse, PaginatedResponse } from '@/types/api';

export interface LabelSet {
  id: string;
  name: string;
  version: number;
  ownerUserId: string;
  createdAt: string;
  _count?: {
    labels: number;
  };
  owner?: {
    id: string;
    email: string;
    displayName: string | null;
  };
}

export const labelsetsApi = {
  /**
   * Get paginated list of label sets
   */
  list(params: { page?: number; limit?: number } = {}) {
    return apiClient.get<PaginatedResponse<LabelSet>>('/labelsets', {
      params: { page: params.page ?? 1, limit: params.limit ?? 100 },
    });
  },

  /**
   * Get single label set by ID
   */
  get(id: string) {
    return apiClient.get<ApiResponse<LabelSet>>(`/labelsets/${id}`);
  },
};
