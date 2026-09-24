import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { ApiResponse } from '../../../core/http/api.models';
import { API_BASE_URL } from '../../../core/http/api.config';
import { ManagerDashboardStats, MemberDashboardStats } from '../models/dashboard.models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  getMemberStats(profileId: number | string): Observable<MemberDashboardStats> {
    const params = new HttpParams().set('profileId', String(profileId));
    return this.http.get<ApiResponse<MemberDashboardStats>>(`${API_BASE_URL}/dashboard/my-stats`, { params }).pipe(
      map((response) => response.data),
    );
  }

  getManagerStats(): Observable<ManagerDashboardStats> {
    return this.http.get<ApiResponse<ManagerDashboardStats>>(`${API_BASE_URL}/dashboard/manager-stats`).pipe(
      map((response) => response.data),
    );
  }
}
