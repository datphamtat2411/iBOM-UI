import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { ApiResponse } from '../../../core/http/api.models';
import { API_BASE_URL } from '../../../core/http/api.config';
import { Skill, SkillCategory, SkillMutationRequest, SkillPage } from '../models/master-data.models';

@Injectable({ providedIn: 'root' })
export class MasterDataService {
  private readonly http = inject(HttpClient);

  listSkills(page: number, size: number, search: string): Observable<SkillPage> {
    const params = new HttpParams({ fromObject: { page, size, search: search.trim() } });
    return this.http.get<ApiResponse<SkillPage>>(`${API_BASE_URL}/master/skills`, { params }).pipe(
      map((response) => response.data),
    );
  }

  listSkillCategories(): Observable<SkillCategory[]> {
    return this.http.get<ApiResponse<SkillCategory[]>>(`${API_BASE_URL}/master/skill-categories`).pipe(
      map((response) => response.data),
    );
  }

  createSkill(request: SkillMutationRequest): Observable<Skill> {
    return this.http.post<ApiResponse<Skill>>(`${API_BASE_URL}/master/skills`, request).pipe(
      map((response) => response.data),
    );
  }

  updateSkill(skillId: number | string, request: SkillMutationRequest): Observable<Skill> {
    return this.http.put<ApiResponse<Skill>>(`${API_BASE_URL}/master/skills/${encodeURIComponent(String(skillId))}`, request).pipe(
      map((response) => response.data),
    );
  }

  deleteSkill(skillId: number | string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${API_BASE_URL}/master/skills/${encodeURIComponent(String(skillId))}`).pipe(
      map(() => undefined),
    );
  }
}
