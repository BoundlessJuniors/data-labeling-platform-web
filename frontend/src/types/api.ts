/**
 * Common API response and error types
 */

import type { AxiosError } from 'axios';

/** Standard API success response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

/** Shape of the nested error object the backend may return */
export interface ApiErrorObject {
  message?: string;
  errors?: Record<string, string> | string[] | unknown;
}

/** Standard API error response – matches backend { success, error: { message, errors? } } */
export interface ApiErrorData {
  success: false;
  /** Backend sends an object, but legacy paths may send a plain string */
  error?: ApiErrorObject | string;
  /** Top-level message fallback (some legacy routes) */
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

// ---------------------------------------------------------------------------
// Error message extraction helpers
// ---------------------------------------------------------------------------

/** Map of known English backend messages → Turkish equivalents */
const ERROR_MAP: Record<string, string> = {
  'Invalid email or password': 'E-posta veya şifre hatalı.',
  'Please provide a valid email address': 'Geçerli bir e-posta adresi giriniz.',
  'Email is required': 'E-posta zorunludur.',
  'Password is required': 'Şifre zorunludur.',
  'Password must be at least 6 characters': 'Şifre en az 6 karakter olmalıdır.',
  'User with this email already exists': 'Bu e-posta adresiyle kayıtlı bir kullanıcı zaten var.',
  'Beta is currently full. No new registrations are allowed.':
    'Beta kontenjanı dolu. Şu anda yeni kayıt alınamıyor.',
  'An invite code is required to register at this time.':
    'Şu anda kayıt olmak için davetiye kodu gereklidir.',
  'Invalid or expired invite code.': 'Davetiye kodu geçersiz veya süresi dolmuş.',
  'This invite code is not valid for this email address.':
    'Bu davetiye kodu bu e-posta adresi için geçerli değil.',
  'Validation failed': 'Girilen bilgileri kontrol ediniz.',
};

/** Translate a raw English backend message to Turkish if a mapping exists. */
export function normalizeErrorMessage(message: string): string {
  return ERROR_MAP[message] ?? message;
}

/**
 * Extract the first meaningful message from a validation errors collection.
 * Handles both Record<string, string> and string[] shapes.
 */
export function extractValidationError(errors: unknown): string | null {
  if (!errors || typeof errors !== 'object') return null;

  if (Array.isArray(errors)) {
    const first = errors.find((e) => typeof e === 'string');
    return typeof first === 'string' ? first : null;
  }

  const record = errors as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    const val = record[key];
    if (typeof val === 'string' && val.trim()) return val;
  }
  return null;
}

/**
 * Extract a plain string message from raw API response data.
 * Returns null if nothing useful is found.
 */
export function extractApiErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;

  const d = data as ApiErrorData;

  if (typeof d.error === 'string' && d.error.trim()) {
    return d.error;
  }

  if (d.error && typeof d.error === 'object') {
    const errObj = d.error as ApiErrorObject;

    // Prefer validation field errors over generic message
    if (errObj.errors) {
      const fieldMsg = extractValidationError(errObj.errors);
      if (fieldMsg) return fieldMsg;
    }

    if (typeof errObj.message === 'string' && errObj.message.trim()) {
      return errObj.message;
    }
  }

  if (typeof d.message === 'string' && d.message.trim()) {
    return d.message;
  }

  return null;
}

/** Extract error message from API error – always returns a clean string */
export function getErrorMessage(error: unknown, fallback: string = 'Bir hata oluştu.'): string {
  if (isApiError(error)) {
    const raw = extractApiErrorMessage(error.response?.data);
    if (raw) return normalizeErrorMessage(raw);
    return fallback;
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
