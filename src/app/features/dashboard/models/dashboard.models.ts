export interface DashboardProfileSummary {
  id: number | string;
  profileName: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  updatedAt: string;
}

export interface DashboardCompletenessSection {
  key: string;
  weight: number;
  completed: boolean;
  validFieldCount?: number;
  fieldCount?: number;
  hasQualifyingRecord?: boolean;
}

export interface DashboardCompleteness {
  percentage: number;
  completed: boolean;
  sections: DashboardCompletenessSection[];
}

export interface MemberDashboardStats {
  selectedProfile: DashboardProfileSummary;
  completeness: DashboardCompleteness;
  latestExportedAt: string | null;
}

export interface PrimarySkillItem {
  skillId: number;
  skillName: string;
  profileCount: number;
}

export interface PrimarySkillDistribution {
  items: PrimarySkillItem[];
  otherProfileCount: number;
}

export interface SkillCategoryItem {
  categoryId: number | null;
  categoryCode: string | null;
  categoryName: string;
  profileCount: number;
  percentage: number;
}

export interface SkillCategoryDistribution {
  items: SkillCategoryItem[];
  otherProfileCount: number;
}

export interface ManagerDashboardStats {
  totalProfiles: number;
  completedProfiles: number;
  primarySkillDistribution: PrimarySkillDistribution;
  skillCategoryDistribution: SkillCategoryDistribution;
}
