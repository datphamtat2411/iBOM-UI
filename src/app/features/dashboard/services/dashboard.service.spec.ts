import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(DashboardService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads member Dashboard stats with the selected Profile and unwraps response data', () => {
    const stats = {
      selectedProfile: { id: 7, profileName: 'Backend CV', firstName: 'A', lastName: 'User', jobTitle: 'Engineer', updatedAt: '2026-01-01' },
      completeness: { percentage: 80, completed: false, sections: [] },
      latestExportedAt: null,
    };
    service.getMemberStats('profile/7').subscribe((result) => expect(result).toEqual(stats));

    const request = http.expectOne((candidate) => candidate.url === '/api/dashboard/my-stats');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('profileId')).toBe('profile/7');
    request.flush({ data: stats });
  });

  it('loads Manager Dashboard stats from the manager contract and unwraps response data', () => {
    const stats = {
      totalProfiles: 4,
      completedProfiles: 2,
      primarySkillDistribution: { items: [{ skillId: 1, skillName: 'Java', profileCount: 2 }], otherProfileCount: 0 },
      skillCategoryDistribution: { items: [{ categoryId: 1, categoryCode: 'BACKEND', categoryName: 'Backend', profileCount: 2, percentage: 100 }], otherProfileCount: 0 },
    };
    service.getManagerStats().subscribe((result) => expect(result).toEqual(stats));

    const request = http.expectOne('/api/dashboard/manager-stats');
    expect(request.request.method).toBe('GET');
    request.flush({ data: stats });
  });
});
