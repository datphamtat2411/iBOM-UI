import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { CreateUserRequest, UserSummary } from '../models/user-management.models';
import { UserManagementService } from './user-management.service';

describe('UserManagementService', () => {
  let service: UserManagementService;
  let http: HttpTestingController;

  const page = {
    content: [{ id: 2, username: 'alice', email: 'alice@example.com', role: 'ADMIN' as const, status: 'ACTIVE' as const }],
    page: 0,
    size: 10,
    totalElements: 1,
    totalPages: 1,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(UserManagementService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('serializes trimmed search and repeated role filters and unwraps the page response', () => {
    service.list(2, 10, '  alice  ', ['MEMBER', 'ADMIN']).subscribe((result) => expect(result).toBe(page));
    const request = http.expectOne((candidate) => candidate.url === '/api/users');

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('10');
    expect(request.request.params.get('search')).toBe('alice');
    expect(request.request.params.getAll('role')).toEqual(['MEMBER', 'ADMIN']);
    request.flush({ code: 200, data: page, message: 'ok', timestamp: 'now' });
  });

  it('omits role parameters when no roles are selected', () => {
    service.list(0, 10, '').subscribe((result) => expect(result).toBe(page));
    const request = http.expectOne((candidate) => candidate.url === '/api/users');

    expect(request.request.params.has('role')).toBeFalse();
    request.flush({ data: page });
  });

  it('creates a managed User with the backend fields and unwraps the response data', () => {
    const requestBody: CreateUserRequest = {
      email: 'new@example.com',
      username: 'new-user',
      password: 'Strong!Password1',
      role: 'MANAGER',
    };
    const created = { id: 3, username: 'new-user', email: 'new@example.com', role: 'MANAGER' as const, status: 'ACTIVE' as const };

    service.create(requestBody).subscribe((result) => expect(result).toBe(created));
    const request = http.expectOne('/api/users');

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(requestBody);
    expect(request.request.body).not.toEqual(jasmine.objectContaining({ confirmPassword: jasmine.anything() }));
    request.flush({ code: 201, data: created, message: 'created', timestamp: 'now' });
  });

  it('updates a user status with the explicit status payload and unwraps the response', () => {
    const updated: UserSummary = { ...page.content[0], status: 'INACTIVE' };
    service.updateStatus(updated.id, updated.status).subscribe((result) => expect(result).toBe(updated));
    const request = http.expectOne('/api/users/2/status');

    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ status: 'INACTIVE' });
    request.flush({ code: 200, data: updated, message: 'ok', timestamp: 'now' });
  });
});
