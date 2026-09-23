import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/http/api.config';
import { ApiResponse } from '../../../core/http/api.models';
import { LanguageMaster, LanguageMasterPage, LanguageMasterRequest } from '../models/language-master.models';

@Injectable({ providedIn: 'root' })
export class LanguageMasterService {
  private readonly http = inject(HttpClient);
  private readonly languagesUrl = `${API_BASE_URL}/master/languages`;

  list(page: number, size: number, search: string): Observable<LanguageMasterPage> {
    const params = new HttpParams({ fromObject: { page, size, search: search.trim() } });
    return this.http.get<ApiResponse<LanguageMasterPage>>(this.languagesUrl, { params }).pipe(
      map((response) => response.data),
    );
  }

  create(request: LanguageMasterRequest): Observable<LanguageMaster> {
    return this.http.post<ApiResponse<LanguageMaster>>(this.languagesUrl, request).pipe(
      map((response) => response.data),
    );
  }

  update(languageId: number | string, request: LanguageMasterRequest): Observable<LanguageMaster> {
    return this.http.put<ApiResponse<LanguageMaster>>(this.languageUrl(languageId), request).pipe(
      map((response) => response.data),
    );
  }

  delete(languageId: number | string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(this.languageUrl(languageId)).pipe(
      map(() => undefined),
    );
  }

  private languageUrl(languageId: number | string): string {
    return `${this.languagesUrl}/${encodeURIComponent(String(languageId))}`;
  }
}
