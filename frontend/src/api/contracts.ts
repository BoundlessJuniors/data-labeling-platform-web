/**
 * Contracts API Module
 */
import apiClient from './client';
import type { Contract, ContractWithDetails, ContractStatus } from '@/types/contract';
import type { ApiResponse, PaginatedResponse } from '@/types/api';

export interface ContractListParams {
  page?: number;
  limit?: number;
  status?: ContractStatus;
}

export const contractsApi = {
  /**
   * Get paginated list of contracts (client view)
   */
  list(params: ContractListParams = {}) {
    return apiClient.get<PaginatedResponse<Contract>>('/contracts', { params });
  },

  /**
   * Get single contract by ID
   */
  get(id: string) {
    return apiClient.get<ApiResponse<ContractWithDetails>>(`/contracts/${id}`);
  },

  /**
   * Accept a contract
   */
  accept(id: string) {
    return apiClient.patch<ApiResponse<Contract>>(`/contracts/${id}/accept`);
  },

  /**
   * Reject a contract
   */
  reject(id: string) {
    return apiClient.patch<ApiResponse<Contract>>(`/contracts/${id}/reject`);
  },

  /**
   * Cancel a contract
   */
  cancel(id: string) {
    return apiClient.patch<ApiResponse<Contract>>(`/contracts/${id}/cancel`);
  },

  /**
   * Complete a contract (mark as done after all tasks approved)
   */
  complete(id: string) {
    return apiClient.patch<ApiResponse<Contract>>(`/contracts/${id}/complete`);
  },
};
