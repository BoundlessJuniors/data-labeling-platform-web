/**
 * Common API response and error types
 */

import type { AxiosError } from 'axios';

/** Standard API success response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

/** Standard API error response */
export interface ApiErrorData {
  success: false;
  error: string;
  message?: string;
  statusCode?: number;
}

/** Typed Axios error for API responses */
export type ApiError = AxiosError<ApiErrorData>;

/** Paginated response wrapper */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** Extract error message from API error */
export function getErrorMessage(error: unknown, fallback: string = 'An error occurred'): string {
  if (isApiError(error)) {
    return error.response?.data?.error || error.response?.data?.message || fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

/** Type guard for ApiError */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as ApiError).isAxiosError === true
  );
}
