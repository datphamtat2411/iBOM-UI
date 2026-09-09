export interface ProfileSummary {
  id: number | string;
  profileName: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  updatedAt: string;
}

export interface ProfileDetail extends ProfileSummary {
  yearsOfExperience: number;
  personality: string | null;
  technicalSummary: string | null;
  hasPreviewed: boolean;
  version: number;
  createdAt: string;
}
