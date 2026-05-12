/**
 * API Client — Axios instance with interceptors.
 *
 * CSRF strategy:
 *  - csrfToken is stored in module memory only (never localStorage).
 *  - Before any unsafe request (POST/PUT/PATCH/DELETE) we ensure a token is available.
 *  - A bare axios instance (bareClient) is used to fetch the CSRF token so we
 *    never trigger our own request interceptor recursively.
 *  - On 403 with message "CSRF validation failed" we clear the stale token,
 *    fetch a fresh one, and retry the original request exactly once.
 *  - Normal 403 authorization errors are NOT retried.
 */
import axios, { type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import router from '@/router';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// ---------------------------------------------------------------------------
// In-memory CSRF token — never persisted to localStorage
// ---------------------------------------------------------------------------
let csrfToken: string | null = null;

/** Clear the in-memory CSRF token (call on logout). */
export function clearCsrfToken(): void {
  csrfToken = null;
}

// ---------------------------------------------------------------------------
// Bare client — bypasses our interceptors to avoid infinite recursion
// when fetching the CSRF token itself.
// ---------------------------------------------------------------------------
const bareClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

async function fetchCsrfToken(): Promise<void> {
  const response = await bareClient.get<{
    success: boolean;
    data: { csrfToken: string };
  }>('/auth/csrf');
  csrfToken = response.data.data.csrfToken;
}

// ---------------------------------------------------------------------------
// Main API client
// ---------------------------------------------------------------------------
const UNSAFE_METHODS = new Set(['post', 'put', 'patch', 'delete']);

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Send httpOnly cookies automatically
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach CSRF token to all unsafe requests
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const method = (config.method || '').toLowerCase();
  if (UNSAFE_METHODS.has(method)) {
    if (!csrfToken) {
      await fetchCsrfToken();
    }
    if (csrfToken) {
      config.headers.set('X-CSRF-Token', csrfToken);
    }
  }
  return config;
});

// Extended config type to track single CSRF retry
interface CsrfRetryConfig extends InternalAxiosRequestConfig {
  _csrfRetried?: boolean;
}

// Response interceptor — handle 401 redirects and CSRF 403 single retry
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status: number | undefined = error.response?.status;
    const config = error.config as CsrfRetryConfig;

    // Retry ONLY on CSRF validation failures — not on ordinary 403 role/auth errors
    if (
      status === 403 &&
      error.response?.data?.error?.message === 'CSRF validation failed' &&
      !config._csrfRetried
    ) {
      config._csrfRetried = true;
      clearCsrfToken();
      await fetchCsrfToken();
      if (csrfToken) {
        config.headers.set('X-CSRF-Token', csrfToken);
      }
      return apiClient(config);
    }

    // Handle 401 — session expired
    if (status === 401) {
      const currentPath = window.location.pathname;

      // Don't logout/redirect if already on login page
      if (currentPath !== '/login' && currentPath !== '/register') {
        const authStore = useAuthStore();
        const toastStore = useToastStore();

        authStore.logout();
        toastStore.error('Oturum süreniz doldu. Lütfen tekrar giriş yapın.');
        router.push({ name: 'login', query: { redirect: currentPath } });
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
