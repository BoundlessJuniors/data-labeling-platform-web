import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi, type User, type LoginRequest, type RegisterRequest } from '@/api/auth';
import { getErrorMessage } from '@/types/api';
import { clearCsrfToken } from '@/api/client';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(JSON.parse(localStorage.getItem('user') || 'null'))
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isClient = computed(() => user.value?.role === 'client')
  const isLabeler = computed(() => user.value?.role === 'labeler')

  async function login(credentials: LoginRequest) {
    loading.value = true
    error.value = null
    try {
      const response = await authApi.login(credentials)
      user.value = response.data.data.user
      localStorage.setItem('user', JSON.stringify(user.value))
      return true
    } catch (err: unknown) {
      error.value = getErrorMessage(err, 'Login failed');
      return false
    } finally {
      loading.value = false
    }
  }

  async function register(data: RegisterRequest) {
    loading.value = true
    error.value = null
    try {
      const response = await authApi.register(data)
      user.value = response.data.data.user
      localStorage.setItem('user', JSON.stringify(user.value))
      return true
    } catch (err: unknown) {
      error.value = getErrorMessage(err, 'Registration failed');
      return false
    } finally {
      loading.value = false
    }
  }

  async function requestInvite(email: string) {
    loading.value = true
    error.value = null
    try {
      await authApi.requestInvite({ email })
      return true
    } catch (err: unknown) {
      error.value = getErrorMessage(err, 'Davetiye talebi gönderilemedi')
      return false
    } finally {
      loading.value = false
    }
  }

  async function fetchProfile() {
    try {
      const response = await authApi.getProfile()
      user.value = response.data.data
      localStorage.setItem('user', JSON.stringify(user.value))
    } catch (_err: unknown) {
      logout()
    }
  }

  async function logout() {
    try {
      await authApi.logout()
    } catch {
      // Ignore errors — clear local state regardless
    }
    user.value = null
    localStorage.removeItem('user')
    // Clear the in-memory CSRF token so it is not reused after logout
    clearCsrfToken()
  }

  function clearError() {
    error.value = null
  }

  return {
    user,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    isClient,
    isLabeler,
    login,
    register,
    requestInvite,
    fetchProfile,
    logout,
    clearError,
  }
})
