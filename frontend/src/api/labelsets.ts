/**
 * LabelSets API Module
 */
import apiClient from './client';
import type { ApiResponse, PaginatedResponse } from '@/types/api';

export interface Label {
  id: string;
  name: string;
  color: string;
  labelSetId: string;
  attributesSchemaJson?: Record<string, unknown>;
  createdAt: string;
}

export interface LabelSet {
  id: string;
  name: string;
  version: number;
  ownerUserId: string;
  createdAt: string;
  labels?: Label[];
  _count?: {
    labels: number;
    listings?: number;
  };
  owner?: {
    id: string;
    email: string;
    displayName: string | null;
  };
}

export interface CreateLabelSetPayload {
  name: string;
  version?: number;
  labels?: { name: string; color: string }[];
}

export interface UpdateLabelSetPayload {
  name?: string;
  labels?: { name: string; color: string }[];
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

  /**
   * Create a new label set with labels
   */
  create(data: CreateLabelSetPayload) {
    return apiClient.post<ApiResponse<LabelSet>>('/labelsets', data);
  },

  /**
   * Update a label set (name and/or replace labels)
   */
  update(id: string, data: UpdateLabelSetPayload) {
    return apiClient.put<ApiResponse<LabelSet>>(`/labelsets/${id}`, data);
  },

  /**
   * Delete a label set
   */
  remove(id: string) {
    return apiClient.delete(`/labelsets/${id}`);
  },
};
