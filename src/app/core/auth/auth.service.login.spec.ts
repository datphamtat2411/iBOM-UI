import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthService } from './auth.service';

describe('AuthService login', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('posts the credentials without a bearer token and establishes the in-memory session', () => {
    service.login({ email: 'user@example.com', password: 'secret' }).subscribe();
    const request = http.expectOne('/api/auth/login');

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'user@example.com', password: 'secret' });
    expect(request.request.withCredentials).toBeTrue();
    expect(request.request.headers.has('Authorization')).toBeFalse();

    request.flush({
      code: 200,
      message: 'Success',
      data: { accessToken: 'access-token', user: { id: 1, email: 'user@example.com', username: 'member', role: 'MEMBER' } },
      timestamp: 'now',
    });

    expect(service.accessToken()).toBe('access-token');
    expect(service.user()?.id).toBe('1');
  });
});
