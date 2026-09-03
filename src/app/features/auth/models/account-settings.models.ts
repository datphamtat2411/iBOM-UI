import { AuthenticatedUser } from '../../../core/auth/auth.models';

export interface ChangeUsernameRequest {
  username: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export type ChangeUsernameResponse = AuthenticatedUser;
