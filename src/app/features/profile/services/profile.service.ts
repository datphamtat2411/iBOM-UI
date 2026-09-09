import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { ApiResponse } from '../../../core/http/api.models';
import { API_BASE_URL } from '../../../core/http/api.config';
import { CreateProfileRequest, ProfileDetail, ProfileSummary } from '../models/profile.models';

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
}
