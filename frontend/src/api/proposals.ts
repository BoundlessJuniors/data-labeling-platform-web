/**
 * Proposals API Module
 */
import apiClient from './client';
import type { Proposal, AcceptProposalResponse } from '@/types/proposal';
import type { ApiResponse, PaginatedResponse } from '@/types/api';

export interface ProposalListParams {
  listingId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export const proposalsApi = {
  /**
   * Create a new proposal (labeler applies to listing)
   */
  create(data: { listingId: string; priceQuote: number; deliveryDays: number; coverLetter?: string }) {
    return apiClient.post<ApiResponse<Proposal>>('/proposals', data);
  },

  /**
   * Get proposals (filtered by listingId, status, etc.)
   */
  list(params: ProposalListParams = {}) {
    return apiClient.get<PaginatedResponse<Proposal>>('/proposals', { params });
  },

  /**
   * Get a single proposal by ID
   */
  get(id: string) {
    return apiClient.get<ApiResponse<Proposal>>(`/proposals/${id}`);
  },

  /**
   * Accept a proposal (client only) — creates contract + tasks
   */
  accept(id: string) {
    return apiClient.patch<ApiResponse<AcceptProposalResponse>>(`/proposals/${id}/accept`);
  },

  /**
   * Reject a proposal (client only)
   */
  reject(id: string) {
    return apiClient.patch<ApiResponse<Proposal>>(`/proposals/${id}/reject`);
  },
};
