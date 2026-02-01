/**
 * User and Authentication types
 */

/** User role types */
export type UserRole = 'client' | 'labeler' | 'admin';

/** User entity */
export interface User {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt?: string;
}

/** Login request payload */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Register request payload */
export interface RegisterRequest {
  email: string;
  password: string;
  role: 'client' | 'labeler';
  displayName?: string;
}

/** Auth response with token */
export interface AuthResponse {
  user: User;
  token: string;
}
