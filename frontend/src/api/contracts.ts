/**
 * Contracts API Module
 */
import apiClient from './client';
import type { Contract, ContractWithDetails, ContractStatus } from '@/types/contract';
import type { ApiResponse, PaginatedResponse } from '@/types/api';
import type { QcSampleResponse } from '@/types/qc';

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
   * Accept a contract (legacy alias — prefer approve)
   */
  accept(id: string) {
    return apiClient.patch<ApiResponse<Contract>>(`/contracts/${id}/accept`);
  },

  /**
   * Approve a contract (client approves labeler's work)
   */
  approve(id: string) {
    return apiClient.patch<ApiResponse<Contract>>(`/contracts/${id}/approve`);
  },

  /**
   * Reject a contract with a reason
   */
  reject(id: string, reason?: string) {
    return apiClient.patch<ApiResponse<Contract>>(`/contracts/${id}/reject`, { reason });
  },

  /**
   * Cancel a contract
   */
  cancel(id: string, reason?: string) {
    return apiClient.patch<ApiResponse<Contract>>(`/contracts/${id}/cancel`, { reason });
  },

  /**
   * Complete a contract (mark as done after all tasks approved)
   */
  complete(id: string) {
    return apiClient.patch<ApiResponse<Contract>>(`/contracts/${id}/complete`);
  },

  /**
   * Get QC sample tasks for a submitted contract (client/admin)
   */
  getQcSample(contractId: string, size: number = 5) {
    return apiClient.get<ApiResponse<QcSampleResponse>>(`/contracts/${contractId}/qc-sample`, {
      params: { size },
    });
  },

  /**
   * Export labeled data for an approved contract
   */
  export(contractId: string, format: 'COCO' | 'YOLO' | 'VOC') {
    return apiClient.get<Blob>(`/contracts/${contractId}/export`, {
      params: { format },
      responseType: 'blob',
    });
  },

  /**
   * Resolve a disputed contract (admin only)
   */
  resolveDispute(
    id: string,
    data: { decision: 'refund_client' | 'release_to_labeler'; reason: string }
  ) {
    return apiClient.patch<ApiResponse<Contract>>(`/contracts/${id}/resolve-dispute`, data);
  },
};


