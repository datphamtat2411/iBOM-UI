import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { MemberManagementService } from './member-management.service';

describe('MemberManagementService', () => {
  let service: MemberManagementService;
  let http: HttpTestingController;

  const page = {
    content: [{ id: 2, username: 'alice', email: 'alice@example.com', status: 'ACTIVE' as const, activeProfileCount: 1, lastUpdatedAt: null, matchingProfiles: [] }],
    page: 0,
    size: 10,
    totalElements: 1,
    totalPages: 1,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(MemberManagementService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('keeps the unfiltered Member list request for the base operation', () => {
    service.list(1, 10, '  alice  ', 'INACTIVE').subscribe((result) => expect(result).toBe(page));
    const request = http.expectOne((candidate) => candidate.url === '/api/members');

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('size')).toBe('10');
    expect(request.request.params.get('search')).toBe('alice');
    expect(request.request.params.get('status')).toBe('INACTIVE');
    request.flush({ data: page });
  });

  it('posts one canonical combined Member search request and maps the response envelope', () => {
    const requestBody = {
      search: 'alice',
      status: 'ACTIVE' as const,
      skills: [{ skillId: 11, seniorityId: null }],
      languages: [{ languageId: 'en', level: 'ADVANCED' as const }],
      page: 2,
      size: 10,
    };

    service.searchMembers(requestBody).subscribe((result) => expect(result).toBe(page));
    const request = http.expectOne('/api/members/search');

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(requestBody);
    request.flush({ code: 200, data: page, message: 'ok', timestamp: 'now' });
  });

  it('serializes Skill search and Category discovery parameters on the same master-data request', () => {
    const skillPage = { content: [{ id: 3, name: 'Angular', categoryId: 7, categoryName: 'Frontend' }], page: 2, size: 10, totalElements: 21, totalPages: 3 };

    service.listSkills(2, 10, ' ang ', 7).subscribe((result) => expect(result).toBe(skillPage));
    const request = http.expectOne((candidate) => candidate.url === '/api/master/skills');

    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('10');
    expect(request.request.params.get('search')).toBe('ang');
    expect(request.request.params.get('categoryId')).toBe('7');
    request.flush({ data: skillPage });
  });

  it('reads paginated Language choices without adding a Category parameter', () => {
    const languagePage = { content: [{ id: 'en', name: 'English' }], page: 1, size: 10, totalElements: 11, totalPages: 2 };

    service.listLanguages(1, 10, ' eng ').subscribe((result) => expect(result).toBe(languagePage));
    const request = http.expectOne((candidate) => candidate.url === '/api/master/languages');

    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('size')).toBe('10');
    expect(request.request.params.get('search')).toBe('eng');
    expect(request.request.params.has('categoryId')).toBeFalse();
    request.flush({ data: languagePage });
  });
});
