/**
 * Payments API Module
 */
import apiClient from './client';
import type { Payment } from '@/types/payment';
import type { ApiResponse } from '@/types/api';

export const paymentsApi = {
  initForContract(contractId: string) {
    return apiClient.post<ApiResponse<Payment>>(`/payments/contracts/${contractId}/init`);
  },

  getByContract(contractId: string) {
    return apiClient.get<ApiResponse<Payment | null>>(`/payments/contracts/${contractId}`);
  },

  getById(id: string) {
    return apiClient.get<ApiResponse<Payment>>(`/payments/${id}`);
  },

  mockSuccess(id: string) {
    return apiClient.post<ApiResponse<Payment>>(`/payments/${id}/mock-success`);
  },

  mockFail(id: string) {
    return apiClient.post<ApiResponse<Payment>>(`/payments/${id}/mock-fail`);
  },
};
