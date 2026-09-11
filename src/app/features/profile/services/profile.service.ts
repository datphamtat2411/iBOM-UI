import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { ApiResponse } from '../../../core/http/api.models';
import { API_BASE_URL } from '../../../core/http/api.config';
import {
  CreateProfileRequest,
  EducationMutationResponse,
  EducationRequest,
  EducationResponse,
  ProfileDetail,
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

  create(profile: CreateProfileRequest): Observable<ProfileDetail> {
    return this.http.post<ApiResponse<ProfileDetail>>(`${API_BASE_URL}/profiles`, profile).pipe(
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

  private educationUrl(profileId: string, educationId?: number | string): string {
    const profileUrl = `${API_BASE_URL}/profiles/${encodeURIComponent(profileId)}/educations`;
    return educationId === undefined ? profileUrl : `${profileUrl}/${encodeURIComponent(String(educationId))}`;
  }
}
