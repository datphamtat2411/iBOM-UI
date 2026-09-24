import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/http/api.config';
import { ApiResponse } from '../../../core/http/api.models';
import {
  MemberPage,
  MemberSearchRequest,
  MemberStatus,
  SearchChoice,
  SearchChoicePage,
} from '../models/member-management.models';

@Injectable({ providedIn: 'root' })
export class MemberManagementService {
  private readonly http = inject(HttpClient);
  private readonly membersUrl = `${API_BASE_URL}/members`;

  list(page: number, size: number, search: string, status?: MemberStatus): Observable<MemberPage> {
    let params = new HttpParams({ fromObject: { page, size, search: search.trim() } });
    if (status) params = params.set('status', status);

    return this.http.get<ApiResponse<MemberPage>>(this.membersUrl, { params }).pipe(
      map((response) => response.data),
    );
  }

  searchMembers(request: MemberSearchRequest): Observable<MemberPage> {
    return this.http.post<ApiResponse<MemberPage>>(`${API_BASE_URL}/members/search`, request).pipe(
      map((response) => response.data),
    );
  }

  listSkills(page: number, size: number, search = '', categoryId?: number | string | null): Observable<SearchChoicePage> {
    let params = new HttpParams({ fromObject: { page, size, search: search.trim() } });
    if (categoryId !== undefined && categoryId !== null && String(categoryId).trim()) {
      params = params.set('categoryId', String(categoryId));
    }
    return this.http.get<ApiResponse<SearchChoicePage>>(`${API_BASE_URL}/master/skills`, { params }).pipe(
      map((response) => response.data),
    );
  }

  listLanguages(page: number, size: number, search = ''): Observable<SearchChoicePage> {
    const params = new HttpParams({ fromObject: { page, size, search: search.trim() } });
    return this.http.get<ApiResponse<SearchChoicePage>>(`${API_BASE_URL}/master/languages`, { params }).pipe(
      map((response) => response.data),
    );
  }

  listSeniorities(): Observable<SearchChoice[]> {
    return this.http.get<ApiResponse<SearchChoice[]>>(`${API_BASE_URL}/master/seniority`).pipe(
      map((response) => response.data),
    );
  }

}
