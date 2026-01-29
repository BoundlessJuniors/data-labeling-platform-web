import apiClient from './client'

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  role: 'client' | 'labeler'
  displayName?: string
}

export interface User {
  id: string
  email: string
  displayName: string | null
  role: 'client' | 'labeler' | 'admin'
  createdAt: string
}

export interface AuthResponse {
  success: boolean
  data: {
    user: User
    token: string
  }
}

export const authApi = {
  login: (data: LoginRequest) => 
    apiClient.post<AuthResponse>('/auth/login', data),
  
  register: (data: RegisterRequest) => 
    apiClient.post<AuthResponse>('/auth/register', data),
  
  getProfile: () => 
    apiClient.get<{ success: boolean; data: User }>('/auth/profile'),
}
