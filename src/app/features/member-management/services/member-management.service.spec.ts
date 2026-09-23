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
});
