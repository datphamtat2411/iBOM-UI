export type MemberStatus = 'ACTIVE' | 'INACTIVE';

export type MemberStatusFilter = MemberStatus | 'ALL';

export interface MemberSummary {
  id: number | string;
  username: string;
  email: string;
  status: MemberStatus;
  activeProfileCount: number;
  lastUpdatedAt: string | null;
}

export interface MemberPage {
  content: MemberSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
