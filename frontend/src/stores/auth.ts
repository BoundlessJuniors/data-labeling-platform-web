import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi, type User, type LoginRequest, type RegisterRequest } from '@/api/auth';
import { getErrorMessage } from '@/types/api';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const user = ref<User | null>(JSON.parse(localStorage.getItem('user') || 'null'))
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isClient = computed(() => user.value?.role === 'client')
  const isLabeler = computed(() => user.value?.role === 'labeler')

  async function login(credentials: LoginRequest) {
    loading.value = true
    error.value = null
    try {
      const response = await authApi.login(credentials)
      token.value = response.data.data.token
      user.value = response.data.data.user
      localStorage.setItem('token', token.value)
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
      token.value = response.data.data.token
      user.value = response.data.data.user
      localStorage.setItem('token', token.value)
      localStorage.setItem('user', JSON.stringify(user.value))
      return true
    } catch (err: unknown) {
      error.value = getErrorMessage(err, 'Registration failed');
      return false
    } finally {
      loading.value = false
    }
  }

  async function fetchProfile() {
    if (!token.value) return
    try {
      const response = await authApi.getProfile()
      user.value = response.data.data
      localStorage.setItem('user', JSON.stringify(user.value))
    } catch (_err: unknown) {
      logout()
    }
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  function clearError() {
    error.value = null
  }

  return {
    token,
    user,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    isClient,
    isLabeler,
    login,
    register,
    fetchProfile,
    logout,
    clearError,
  }
})
