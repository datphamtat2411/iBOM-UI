import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthService } from './auth.service';
import { ApiResponse } from '../http/api.models';
import { LoginResponse } from './auth.models';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;
  const session: LoginResponse = {
    accessToken: 'access-token',
    user: { id: '1', email: 'user@example.com', username: 'user', role: 'USER' },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('starts unauthenticated with no persisted token', () => {
    expect(service.accessToken()).toBeNull();
    expect(service.user()).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('refreshes the session and replaces both in-memory values', () => {
    service.refreshAccessToken().subscribe();
    const request = http.expectOne('/api/auth/refresh-token');
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBeTrue();
    request.flush({ code: 200, data: session, message: 'ok', timestamp: 'now' } satisfies ApiResponse<LoginResponse>);

    expect(service.accessToken()).toBe(session.accessToken);
    expect(service.user()).toEqual(session.user);
  });

  it('clears the session when refresh fails', () => {
    service.setSession(session);
    service.refreshAccessToken().subscribe({ error: () => undefined });
    http.expectOne('/api/auth/refresh-token').flush({ errorCode: 'AUTH_INVALID_REFRESH_TOKEN' }, { status: 401, statusText: 'Unauthorized' });

    expect(service.accessToken()).toBeNull();
    expect(service.user()).toBeNull();
  });

  it('resolves restoration after a failed refresh', async () => {
    const restoration = service.restoreSession();
    http.expectOne('/api/auth/refresh-token').flush({}, { status: 401, statusText: 'Unauthorized' });

    await restoration;
    expect(service.isRestored()).toBeTrue();
  });
});
