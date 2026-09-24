export type MemberId = number | string;

export type MemberStatus = 'ACTIVE' | 'INACTIVE';

export type MemberStatusFilter = MemberStatus | 'ALL';

export type LanguageLevel = 'BEGINNER' | 'INTERMEDIATE' | 'UPPER_INTERMEDIATE' | 'ADVANCED' | 'NATIVE';

export interface SearchChoice {
  id: MemberId;
  name: string;
  categoryId?: MemberId;
  categoryCode?: string;
  categoryName?: string;
}

export interface SearchChoicePage {
  content: SearchChoice[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface MemberSkillCondition {
  skillId: MemberId;
  seniorityId: MemberId | null;
}

export interface MemberLanguageCondition {
  languageId: MemberId;
  level: LanguageLevel | null;
}

export interface MemberFilterDraft {
  search: string;
  status: MemberStatusFilter;
  languages: MemberLanguageCondition[];
  skills: MemberSkillCondition[];
}

export type AppliedMemberFilter = Readonly<{
  search: string;
  status: MemberStatusFilter;
  languages: ReadonlyArray<Readonly<MemberLanguageCondition>>;
  skills: ReadonlyArray<Readonly<MemberSkillCondition>>;
}>;

export interface MemberSearchRequest {
  search: string;
  status: MemberStatus | null;
  skills: Array<{ skillId: MemberId; seniorityId: MemberId | null }>;
  languages: Array<{ languageId: MemberId; level: LanguageLevel | null }>;
  page: number;
  size: number;
}

export interface MatchingProfile {
  id: number | string;
  name?: string;
  profileName?: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  updatedAt?: string | null;
  lastUpdatedAt?: string | null;
}

export interface MemberSummary {
  id: number | string;
  username: string;
  email: string;
  status: MemberStatus;
  activeProfileCount: number;
  lastUpdatedAt: string | null;
  matchingProfiles?: MatchingProfile[];
}

export interface MemberPage {
  content: MemberSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
