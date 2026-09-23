import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { ApiResponse } from '../../../core/http/api.models';
import { API_BASE_URL } from '../../../core/http/api.config';
import { Seniority, SeniorityRequest } from '../models/seniority.models';

@Injectable({ providedIn: 'root' })
export class SeniorityService {
  private readonly http = inject(HttpClient);

  list(): Observable<Seniority[]> {
    return this.http.get<ApiResponse<Seniority[]>>(`${API_BASE_URL}/master/seniority`).pipe(
      map((response) => response.data),
    );
  }

  create(request: SeniorityRequest): Observable<Seniority> {
    return this.http.post<ApiResponse<Seniority>>(`${API_BASE_URL}/master/seniority`, request).pipe(
      map((response) => response.data),
    );
  }

  update(seniorityId: number | string, request: SeniorityRequest): Observable<Seniority> {
    return this.http.put<ApiResponse<Seniority>>(this.seniorityUrl(seniorityId), request).pipe(
      map((response) => response.data),
    );
  }

  delete(seniorityId: number | string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(this.seniorityUrl(seniorityId)).pipe(
      map(() => undefined),
    );
  }

  private seniorityUrl(seniorityId: number | string): string {
    return `${API_BASE_URL}/master/seniority/${encodeURIComponent(String(seniorityId))}`;
  }
}
