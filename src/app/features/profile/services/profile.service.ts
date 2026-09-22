import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { ApiResponse } from '../../../core/http/api.models';
import { API_BASE_URL } from '../../../core/http/api.config';
import {
  CreateProfileRequest,
  ProfileCopyRequest,
  ProfileResponse,
  CertificateMutationResponse,
  CertificateRequest,
  CertificateResponse,
  EducationMutationResponse,
  EducationRequest,
  EducationResponse,
  LanguageMasterPage,
  ProfileSkillMutationResponse,
  ProfileSkillRequest,
  ProfileSkillResponse,
  SkillMasterPage,
  ProfileLanguageMutationResponse,
  ProfileLanguageRequest,
  ProfileLanguageResponse,
  ProfileDetail,
  ProjectMutationResponse,
  ProjectRequest,
  ProjectResponse,
  ProfileSummary,
  ProfileVersionResponse,
  UpdateProfileRequest,
} from '../models/profile.models';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);

  list(): Observable<ProfileSummary[]> {
    return this.http.get<ApiResponse<ProfileSummary[]>>(`${API_BASE_URL}/profiles/me`).pipe(
      map((response) => response.data),
    );
  }

  get(profileId: string): Observable<ProfileDetail> {
    return this.http.get<ApiResponse<ProfileDetail>>(`${API_BASE_URL}/profiles/${encodeURIComponent(profileId)}`).pipe(
      map((response) => response.data),
    );
  }

  preview(profileId: string): Observable<Blob> {
    return this.http.get(`${API_BASE_URL}/cv/preview/${encodeURIComponent(profileId)}`, { responseType: 'blob' });
  }

  create(profile: CreateProfileRequest): Observable<ProfileDetail> {
    return this.http.post<ApiResponse<ProfileDetail>>(`${API_BASE_URL}/profiles`, profile).pipe(
      map((response) => response.data),
    );
  }

  copy(sourceProfileId: number | string, profile: ProfileCopyRequest): Observable<ProfileResponse> {
    return this.http.post<ApiResponse<ProfileResponse>>(`${API_BASE_URL}/profiles/${encodeURIComponent(String(sourceProfileId))}/copy`, profile).pipe(
      map((response) => response.data),
    );
  }

  update(profileId: string, profile: UpdateProfileRequest): Observable<ProfileDetail> {
    return this.http.put<ApiResponse<ProfileDetail>>(`${API_BASE_URL}/profiles/${encodeURIComponent(profileId)}`, profile).pipe(
      map((response) => response.data),
    );
  }

  delete(profileId: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${API_BASE_URL}/profiles/${encodeURIComponent(profileId)}`).pipe(
      map(() => undefined),
    );
  }

  listEducations(profileId: string): Observable<EducationResponse[]> {
    return this.http.get<ApiResponse<EducationResponse[]>>(this.educationUrl(profileId)).pipe(
      map((response) => response.data),
    );
  }

  createEducation(profileId: string, education: EducationRequest): Observable<EducationMutationResponse> {
    return this.http.post<ApiResponse<EducationMutationResponse>>(this.educationUrl(profileId), education).pipe(
      map((response) => response.data),
    );
  }

  updateEducation(profileId: string, educationId: number | string, education: EducationRequest): Observable<EducationMutationResponse> {
    return this.http.put<ApiResponse<EducationMutationResponse>>(this.educationUrl(profileId, educationId), education).pipe(
      map((response) => response.data),
    );
  }

  deleteEducation(profileId: string, educationId: number | string, profileVersion: number): Observable<ProfileVersionResponse> {
    return this.http.delete<ApiResponse<ProfileVersionResponse>>(this.educationUrl(profileId, educationId), { body: { profileVersion } }).pipe(
      map((response) => response.data),
    );
  }

  listProjects(profileId: string): Observable<ProjectResponse[]> {
    return this.http.get<ApiResponse<ProjectResponse[]>>(this.projectUrl(profileId)).pipe(
      map((response) => response.data),
    );
  }

  createProject(profileId: string, project: ProjectRequest): Observable<ProjectMutationResponse> {
    return this.http.post<ApiResponse<ProjectMutationResponse>>(this.projectUrl(profileId), project).pipe(
      map((response) => response.data),
    );
  }

  updateProject(profileId: string, projectId: number | string, project: ProjectRequest): Observable<ProjectMutationResponse> {
    return this.http.put<ApiResponse<ProjectMutationResponse>>(this.projectUrl(profileId, projectId), project).pipe(
      map((response) => response.data),
    );
  }

  deleteProject(profileId: string, projectId: number | string, profileVersion: number): Observable<ProfileVersionResponse> {
    return this.http.delete<ApiResponse<ProfileVersionResponse>>(this.projectUrl(profileId, projectId), { body: { profileVersion } }).pipe(
      map((response) => response.data),
    );
  }

  listCertificates(profileId: string): Observable<CertificateResponse[]> {
    return this.http.get<ApiResponse<CertificateResponse[]>>(this.certificateUrl(profileId)).pipe(
      map((response) => response.data),
    );
  }

  createCertificate(profileId: string, certificate: CertificateRequest): Observable<CertificateMutationResponse> {
    return this.http.post<ApiResponse<CertificateMutationResponse>>(this.certificateUrl(profileId), certificate).pipe(
      map((response) => response.data),
    );
  }

  updateCertificate(profileId: string, certificateId: number | string, certificate: CertificateRequest): Observable<CertificateMutationResponse> {
    return this.http.put<ApiResponse<CertificateMutationResponse>>(this.certificateUrl(profileId, certificateId), certificate).pipe(
      map((response) => response.data),
    );
  }

  deleteCertificate(profileId: string, certificateId: number | string, profileVersion: number): Observable<ProfileVersionResponse> {
    return this.http.delete<ApiResponse<ProfileVersionResponse>>(this.certificateUrl(profileId, certificateId), { body: { profileVersion } }).pipe(
      map((response) => response.data),
    );
  }

  listProfileLanguages(profileId: string): Observable<ProfileLanguageResponse[]> {
    return this.http.get<ApiResponse<ProfileLanguageResponse[]>>(this.languageUrl(profileId)).pipe(
      map((response) => response.data),
    );
  }

  createProfileLanguage(profileId: string, language: ProfileLanguageRequest): Observable<ProfileLanguageMutationResponse> {
    return this.http.post<ApiResponse<ProfileLanguageMutationResponse>>(this.languageUrl(profileId), language).pipe(
      map((response) => response.data),
    );
  }

  updateProfileLanguage(profileId: string, profileLanguageId: number | string, language: ProfileLanguageRequest): Observable<ProfileLanguageMutationResponse> {
    return this.http.put<ApiResponse<ProfileLanguageMutationResponse>>(this.languageUrl(profileId, profileLanguageId), language).pipe(
      map((response) => response.data),
    );
  }

  deleteProfileLanguage(profileId: string, profileLanguageId: number | string, profileVersion: number): Observable<ProfileVersionResponse> {
    return this.http.delete<ApiResponse<ProfileVersionResponse>>(this.languageUrl(profileId, profileLanguageId), { body: { profileVersion } }).pipe(
      map((response) => response.data),
    );
  }

  listProfileSkills(profileId: string): Observable<ProfileSkillResponse[]> {
    return this.http.get<ApiResponse<ProfileSkillResponse[]>>(this.skillUrl(profileId)).pipe(
      map((response) => response.data),
    );
  }

  createProfileSkill(profileId: string, skill: ProfileSkillRequest): Observable<ProfileSkillMutationResponse> {
    return this.http.post<ApiResponse<ProfileSkillMutationResponse>>(this.skillUrl(profileId), skill).pipe(
      map((response) => response.data),
    );
  }

  updateProfileSkill(profileId: string, profileSkillId: number | string, skill: ProfileSkillRequest): Observable<ProfileSkillMutationResponse> {
    return this.http.put<ApiResponse<ProfileSkillMutationResponse>>(this.skillUrl(profileId, profileSkillId), skill).pipe(
      map((response) => response.data),
    );
  }

  deleteProfileSkill(profileId: string, profileSkillId: number | string, profileVersion: number): Observable<ProfileVersionResponse> {
    return this.http.delete<ApiResponse<ProfileVersionResponse>>(this.skillUrl(profileId, profileSkillId), { body: { profileVersion } }).pipe(
      map((response) => response.data),
    );
  }

  listLanguageMaster(page: number, size: number, search: string): Observable<LanguageMasterPage> {
    const params = new HttpParams({ fromObject: { page, size, search: search.trim() } });
    return this.http.get<ApiResponse<LanguageMasterPage>>(`${API_BASE_URL}/master/languages`, { params }).pipe(
      map((response) => response.data),
    );
  }

  listSkillMaster(page: number, size: number, search: string): Observable<SkillMasterPage> {
    const params = new HttpParams({ fromObject: { page, size, search: search.trim() } });
    return this.http.get<ApiResponse<SkillMasterPage>>(`${API_BASE_URL}/master/skills`, { params }).pipe(
      map((response) => response.data),
    );
  }

  private educationUrl(profileId: string, educationId?: number | string): string {
    const profileUrl = `${API_BASE_URL}/profiles/${encodeURIComponent(profileId)}/educations`;
    return educationId === undefined ? profileUrl : `${profileUrl}/${encodeURIComponent(String(educationId))}`;
  }

  private projectUrl(profileId: string, projectId?: number | string): string {
    const profileUrl = `${API_BASE_URL}/profiles/${encodeURIComponent(profileId)}/projects`;
    return projectId === undefined ? profileUrl : `${profileUrl}/${encodeURIComponent(String(projectId))}`;
  }

  private languageUrl(profileId: string, profileLanguageId?: number | string): string {
    const profileUrl = `${API_BASE_URL}/profiles/${encodeURIComponent(profileId)}/languages`;
    return profileLanguageId === undefined ? profileUrl : `${profileUrl}/${encodeURIComponent(String(profileLanguageId))}`;
  }

  private skillUrl(profileId: string, profileSkillId?: number | string): string {
    const profileUrl = `${API_BASE_URL}/profiles/${encodeURIComponent(profileId)}/skills`;
    return profileSkillId === undefined ? profileUrl : `${profileUrl}/${encodeURIComponent(String(profileSkillId))}`;
  }

  private certificateUrl(profileId: string, certificateId?: number | string): string {
    const profileUrl = `${API_BASE_URL}/profiles/${encodeURIComponent(profileId)}/certificates`;
    return certificateId === undefined ? profileUrl : `${profileUrl}/${encodeURIComponent(String(certificateId))}`;
  }
}
