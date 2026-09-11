export interface ProfileSummary {
  id: number | string;
  profileName: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  updatedAt: string;
  completeness?: number;
}

export interface ProfileDetail extends ProfileSummary {
  yearsOfExperience: number;
  personality: string | null;
  technicalSummary: string | null;
  hasPreviewed: boolean;
  version: number;
  createdAt: string;
}

export interface CreateProfileRequest {
  profileName: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  yearsOfExperience: number;
  personality: string;
  technicalSummary: string;
}

export interface UpdateProfileRequest {
  profileName: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  yearsOfExperience: number;
  personality: string;
  technicalSummary: string;
  version: number;
}

export type EducationStatus = 'ONGOING' | 'COMPLETED';

export interface Education {
  id: number | string;
  schoolName: string;
  degree: string;
  fieldOfStudy: string | null;
  startDate: string;
  endDate: string | null;
  status: EducationStatus;
}

export type EducationResponse = Education;

export interface EducationRequest {
  schoolName: string;
  degree: string;
  fieldOfStudy: string | null;
  startDate: string;
  endDate: string | null;
  status: EducationStatus;
  version: number;
}

export interface EducationMutationResponse {
  education: EducationResponse;
  profileVersion: number;
}

export interface ProfileVersionResponse {
  profileVersion: number;
}
