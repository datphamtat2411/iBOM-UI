import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/http/api.config';
import { ApiResponse } from '../../../core/http/api.models';
import {
  CreateUserRequest,
  UserId,
  UserPage,
  UserRole,
  UserStatus,
  UserStatusUpdateRequest,
  UserSummary,
} from '../models/user-management.models';

@Injectable({ providedIn: 'root' })
export class UserManagementService {
  private readonly http = inject(HttpClient);
  private readonly usersUrl = `${API_BASE_URL}/users`;

  list(page: number, size: number, search = '', roles: ReadonlyArray<UserRole> = []): Observable<UserPage> {
    let params = new HttpParams({ fromObject: { page, size, search: search.trim() } });
    for (const role of roles) params = params.append('role', role);

    return this.http.get<ApiResponse<UserPage>>(this.usersUrl, { params }).pipe(
      map((response) => response.data),
    );
  }

  create(request: CreateUserRequest): Observable<UserSummary> {
    return this.http.post<ApiResponse<UserSummary>>(this.usersUrl, request).pipe(
      map((response) => response.data),
    );
  }

  updateStatus(userId: UserId, status: UserStatus): Observable<UserSummary> {
    const body: UserStatusUpdateRequest = { status };
    return this.http.put<ApiResponse<UserSummary>>(`${this.usersUrl}/${encodeURIComponent(String(userId))}/status`, body).pipe(
      map((response) => response.data),
    );
  }
}
