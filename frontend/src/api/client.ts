/**
 * API Client - Axios instance with interceptors
 */
import axios from 'axios';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import router from '@/router';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
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
  }
);

export default apiClient;
