export type UserId = number | string;

export type UserRole = 'MEMBER' | 'MANAGER' | 'ADMIN';

export type UserStatus = 'ACTIVE' | 'INACTIVE';

export interface UserSummary {
  id: UserId;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

export interface CreateUserRequest {
  email: string;
  username: string;
  password: string;
  role: UserRole;
}

export interface UserPage {
  content: UserSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface UserFilterDraft {
  search: string;
  roles: UserRole[];
}

export type AppliedUserFilter = Readonly<{
  search: string;
  roles: ReadonlyArray<UserRole>;
}>;
