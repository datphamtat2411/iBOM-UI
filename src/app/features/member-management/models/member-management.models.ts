export type MemberStatus = 'ACTIVE' | 'INACTIVE';

export type MemberStatusFilter = MemberStatus | 'ALL';

export type LanguageLevel = 'BEGINNER' | 'INTERMEDIATE' | 'UPPER_INTERMEDIATE' | 'ADVANCED' | 'NATIVE';

export type AdvancedSearchMode = 'SKILL' | 'LANGUAGE';

export type MemberSearchMode = 'BASE' | AdvancedSearchMode;

export interface SearchChoice {
  id: number | string;
  name: string;
}

export interface SearchChoicePage {
  content: SearchChoice[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface SkillSearchPair {
  skillId: number | string;
  seniorityId: number | string;
}

export interface LanguageSearchPair {
  languageId: number | string;
  level: LanguageLevel;
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

export interface AppliedSkillSearch {
  mode: 'SKILL';
  pairs: SkillSearchPair[];
  status: MemberStatusFilter;
}

export interface AppliedLanguageSearch {
  mode: 'LANGUAGE';
  pairs: LanguageSearchPair[];
  status: MemberStatusFilter;
}

export type AppliedMemberSearch = AppliedSkillSearch | AppliedLanguageSearch;

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
