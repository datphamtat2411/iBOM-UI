import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { MemberManagementService } from './member-management.service';

describe('MemberManagementService', () => {
  let service: MemberManagementService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(MemberManagementService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists Members with the fixed pagination, trimmed search, and optional status filter', () => {
    const page = {
      content: [{ id: 2, username: 'alice', email: 'alice@example.com', status: 'INACTIVE' as const, activeProfileCount: 0, lastUpdatedAt: '2026-01-02T00:00:00Z' }],
      page: 1,
      size: 10,
      totalElements: 11,
      totalPages: 2,
    };

    service.list(1, 10, '  alice  ', 'INACTIVE').subscribe((result) => expect(result).toEqual(page));
    const request = http.expectOne((candidate) => candidate.url === '/api/members');

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('size')).toBe('10');
    expect(request.request.params.get('search')).toBe('alice');
    expect(request.request.params.get('status')).toBe('INACTIVE');
    request.flush({ data: page });
  });

  it('omits status when the caller requests all Member statuses and maps the API envelope', () => {
    const page = { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 };

    service.list(0, 10, '', undefined).subscribe((result) => expect(result).toBe(page));
    const request = http.expectOne((candidate) => candidate.url === '/api/members');

    expect(request.request.params.has('status')).toBeFalse();
    request.flush({ code: 200, data: page, message: 'ok', timestamp: 'now' });
  });

  it('serializes ordered Skill + Seniority pairs as repeated aligned parameters', () => {
    const page = {
      content: [{ id: 2, username: 'alice', email: 'alice@example.com', status: 'ACTIVE' as const, activeProfileCount: 1, lastUpdatedAt: null, matchingProfiles: [] }],
      page: 0,
      size: 10,
      totalElements: 1,
      totalPages: 1,
    };

    service.searchBySkill(0, 10, [11, 22], ['senior', 8], 'ACTIVE').subscribe((result) => expect(result).toBe(page));
    const request = http.expectOne((candidate) => candidate.url === '/api/members/search-by-skill');

    expect(request.request.params.getAll('skillIds')).toEqual(['11', '22']);
    expect(request.request.params.getAll('seniorityIds')).toEqual(['senior', '8']);
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.get('size')).toBe('10');
    expect(request.request.params.get('status')).toBe('ACTIVE');
    request.flush({ data: page });
  });

  it('serializes ordered Language + Level pairs and omits an all-status filter', () => {
    const page = { content: [], page: 1, size: 10, totalElements: 0, totalPages: 0 };

    service.searchByLanguage(1, 10, ['en', 9], ['ADVANCED', 'NATIVE']).subscribe((result) => expect(result).toBe(page));
    const request = http.expectOne((candidate) => candidate.url === '/api/members/search-by-language');

    expect(request.request.params.getAll('languageIds')).toEqual(['en', '9']);
    expect(request.request.params.getAll('levels')).toEqual(['ADVANCED', 'NATIVE']);
    expect(request.request.params.has('status')).toBeFalse();
    request.flush({ data: page });
  });

  it('reads paginated Skill choices and complete Seniority choices through the matching master-data endpoints', () => {
    const skillPage = { content: [{ id: 3, name: 'Angular' }], page: 2, size: 100, totalElements: 201, totalPages: 3 };
    const seniorities = [{ id: 4, name: 'Senior' }];

    service.listSkills(2, 100, ' ang ').subscribe((result) => expect(result).toBe(skillPage));
    const skillsRequest = http.expectOne((candidate) => candidate.url === '/api/master/skills');
    expect(skillsRequest.request.params.get('page')).toBe('2');
    expect(skillsRequest.request.params.get('size')).toBe('100');
    expect(skillsRequest.request.params.get('search')).toBe('ang');
    skillsRequest.flush({ data: skillPage });

    service.listSeniorities().subscribe((result) => expect(result).toBe(seniorities));
    const seniorityRequest = http.expectOne('/api/master/seniority');
    seniorityRequest.flush({ data: seniorities });
  });
});
