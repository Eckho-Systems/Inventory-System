export enum UserRole {
  STAFF = 'staff',
  MANAGER = 'manager',
  OWNER = 'owner',
}

export interface User {
  id: string;
  username: string;
  pin: string; // Hashed PIN
  name: string;
  role: UserRole;
  createdAt: number;
  updatedAt: number;
  lastLoginAt?: number;
  isActive: boolean;
}

export interface CreateUserInput {
  username: string;
  pin: string; // Will be hashed before saving
  name: string;
  role: UserRole;
}

export interface UpdateUserInput {
  id: string;
  name?: string;
  pin?: string; // Hashed PIN
  role?: UserRole;
  isActive?: boolean;
}

export interface LoginCredentials {
  username: string;
  pin: string; // Raw PIN (will be hashed for comparison)
}
