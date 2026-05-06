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
  inviteCode?: string
}

export interface InviteRequestRequest {
  email: string
}

export interface InviteRequestResponse {
  success: boolean
  message: string
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
  }
}

export const authApi = {
  login: (data: LoginRequest) => 
    apiClient.post<AuthResponse>('/auth/login', data),
  
  register: (data: RegisterRequest) => 
    apiClient.post<AuthResponse>('/auth/register', data),
  
  getProfile: () => 
    apiClient.get<{ success: boolean; data: User }>('/auth/profile'),

  logout: () =>
    apiClient.post<{ success: boolean; message: string }>('/auth/logout'),

  requestInvite: (data: InviteRequestRequest) =>
    apiClient.post<InviteRequestResponse>('/auth/invite-request', data),
}
