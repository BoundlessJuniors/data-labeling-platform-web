/**
 * Listings API Module
 */
import apiClient from './client';
import type {
  Listing,
  ListingWithDetails,
  CreateListingRequest,
  UpdateListingRequest,
  ListingStatus,
} from '@/types/listing';
import type { ApiResponse, PaginatedResponse } from '@/types/api';

export interface ListingListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: ListingStatus;
  datasetId?: string;
  ownOnly?: boolean;
}

export const listingsApi = {
  /**
   * Get paginated list of listings (client's own)
   */
  list(params: ListingListParams = {}) {
    return apiClient.get<PaginatedResponse<Listing>>('/listings', { params });
  },

  /**
   * Get single listing by ID
   */
  get(id: string) {
    return apiClient.get<ApiResponse<ListingWithDetails>>(`/listings/${id}`);
  },

  /**
   * Create a new listing
   */
  create(data: CreateListingRequest) {
    return apiClient.post<ApiResponse<Listing>>('/listings', data);
  },

  /**
   * Update an existing listing
   */
  update(id: string, data: UpdateListingRequest) {
    return apiClient.patch<ApiResponse<Listing>>(`/listings/${id}`, data);
  },

  /**
   * Delete a listing
   */
  delete(id: string) {
    return apiClient.delete<ApiResponse<void>>(`/listings/${id}`);
  },

};
