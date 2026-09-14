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

export type ProjectStatus = 'ONGOING' | 'COMPLETED';

export interface Project {
  id: number | string;
  name: string;
  description: string;
  startDate: string | null;
  endDate: string | null;
  status: ProjectStatus;
  position: string;
  teamSize: number | null;
  responsibilities: string | null;
  programmingLanguages: string | null;
  tools: string | null;
}

export type ProjectResponse = Project;

export interface ProjectRequest {
  name: string;
  description: string;
  startDate: string | null;
  endDate: string | null;
  status: ProjectStatus;
  position: string;
  teamSize: number | null;
  responsibilities: string | null;
  programmingLanguages: string | null;
  tools: string | null;
  version: number;
}

export interface ProjectMutationResponse {
  project: ProjectResponse;
  profileVersion: number;
}

export interface Certificate {
  id: number | string;
  certificateName: string;
  issueDate: string;
}

export type CertificateResponse = Certificate;

export interface CertificateRequest {
  certificateName: string;
  issueDate: string;
  version: number;
}

export interface CertificateMutationResponse {
  certificate: CertificateResponse;
  profileVersion: number;
}

export type LanguageLevel = 'BEGINNER' | 'INTERMEDIATE' | 'UPPER_INTERMEDIATE' | 'ADVANCED' | 'NATIVE';

export interface ProfileLanguage {
  profileLanguageId: number | string;
  languageId: number | string;
  languageName: string;
  level: LanguageLevel;
}

export type ProfileLanguageResponse = ProfileLanguage;

export interface ProfileLanguageRequest {
  languageId: number | string;
  level: LanguageLevel;
  version: number;
}

export interface ProfileLanguageMutationResponse {
  profileLanguage: ProfileLanguageResponse;
  profileVersion: number;
}

export interface LanguageMasterOption {
  id: number | string;
  name: string;
}

export interface LanguageMasterPage {
  content: LanguageMasterOption[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ProfileSkill {
  profileSkillId: number | string;
  skillId: number | string;
  skillName: string;
  categoryId: number | string | null;
  categoryCode: string | null;
  categoryName: string | null;
  experienceYears: number;
  lastUsed: string | null;
}

export type ProfileSkillResponse = ProfileSkill;

export interface ProfileSkillRequest {
  skillId: number | string;
  experienceYears: number;
  lastUsed: string | null;
  version: number;
}

export interface ProfileSkillMutationResponse {
  profileSkill: ProfileSkillResponse;
  profileVersion: number;
}

export interface SkillMasterOption {
  id: number | string;
  name: string;
  categoryId: number | string | null;
  categoryCode: string | null;
  categoryName: string | null;
}

export interface SkillMasterPage {
  content: SkillMasterOption[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
