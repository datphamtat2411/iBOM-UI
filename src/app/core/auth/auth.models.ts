export interface AuthenticatedUser {
  id: number;
  email: string;
  username: string;
  role: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthenticatedUser;
}
