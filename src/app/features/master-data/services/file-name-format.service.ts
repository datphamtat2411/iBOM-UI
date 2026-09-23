import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { ApiResponse } from '../../../core/http/api.models';
import { API_BASE_URL } from '../../../core/http/api.config';
import { FileNameFormat, FileNameFormatPage, FileNameFormatRequest } from '../models/file-name-format.models';

@Injectable({ providedIn: 'root' })
export class FileNameFormatService {
  private readonly http = inject(HttpClient);
  private readonly resourceUrl = `${API_BASE_URL}/master/file-name-formats`;

  list(page: number, size: number): Observable<FileNameFormatPage> {
    const params = new HttpParams({ fromObject: { page, size } });
    return this.http.get<ApiResponse<FileNameFormatPage>>(this.resourceUrl, { params }).pipe(
      map((response) => response.data),
    );
  }

  create(request: FileNameFormatRequest): Observable<FileNameFormat> {
    return this.http.post<ApiResponse<FileNameFormat>>(this.resourceUrl, request).pipe(
      map((response) => response.data),
    );
  }

  update(formatId: number | string, request: FileNameFormatRequest): Observable<FileNameFormat> {
    return this.http.put<ApiResponse<FileNameFormat>>(this.formatUrl(formatId), request).pipe(
      map((response) => response.data),
    );
  }

  delete(formatId: number | string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(this.formatUrl(formatId)).pipe(
      map(() => undefined),
    );
  }

  private formatUrl(formatId: number | string): string {
    return `${this.resourceUrl}/${encodeURIComponent(String(formatId))}`;
  }
}
