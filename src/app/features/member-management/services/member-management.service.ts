import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/http/api.config';
import { ApiResponse } from '../../../core/http/api.models';
import {
  LanguageLevel,
  MemberPage,
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

  searchBySkill(
    page: number,
    size: number,
    skillIds: ReadonlyArray<number | string>,
    seniorityIds: ReadonlyArray<number | string>,
    status?: MemberStatus,
  ): Observable<MemberPage> {
    let params = this.pairParams(page, size, 'skillIds', skillIds, 'seniorityIds', seniorityIds);
    if (status) params = params.set('status', status);

    return this.http.get<ApiResponse<MemberPage>>(`${API_BASE_URL}/members/search-by-skill`, { params }).pipe(
      map((response) => response.data),
    );
  }

  searchByLanguage(
    page: number,
    size: number,
    languageIds: ReadonlyArray<number | string>,
    levels: ReadonlyArray<LanguageLevel>,
    status?: MemberStatus,
  ): Observable<MemberPage> {
    let params = this.pairParams(page, size, 'languageIds', languageIds, 'levels', levels);
    if (status) params = params.set('status', status);

    return this.http.get<ApiResponse<MemberPage>>(`${API_BASE_URL}/members/search-by-language`, { params }).pipe(
      map((response) => response.data),
    );
  }

  listSkills(page: number, size: number, search = ''): Observable<SearchChoicePage> {
    const params = new HttpParams({ fromObject: { page, size, search: search.trim() } });
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

  private pairParams(
    page: number,
    size: number,
    firstName: string,
    firstValues: ReadonlyArray<number | string>,
    secondName: string,
    secondValues: ReadonlyArray<number | string>,
  ): HttpParams {
    let params = new HttpParams({ fromObject: { page, size } });
    firstValues.forEach((value) => {
      params = params.append(firstName, String(value));
    });
    secondValues.forEach((value) => {
      params = params.append(secondName, String(value));
    });
    return params;
  }
}
