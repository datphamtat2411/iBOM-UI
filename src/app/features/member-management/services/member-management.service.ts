import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/http/api.config';
import { ApiResponse } from '../../../core/http/api.models';
import { MemberPage, MemberStatus } from '../models/member-management.models';

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
}
