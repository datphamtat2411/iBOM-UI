export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  role: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthenticatedUser;
}
