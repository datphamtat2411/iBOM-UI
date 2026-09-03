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

  it('sends one credentialed logout and clears the session only after success', () => {
    service.setSession(session);
    service.logout().subscribe();

    const request = http.expectOne('/api/auth/logout');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    expect(request.request.withCredentials).toBeTrue();
    expect(service.isAuthenticated()).toBeTrue();
    request.flush({ code: 200, data: null, message: 'ok', timestamp: 'now' } satisfies ApiResponse<null>);

    expect(service.accessToken()).toBeNull();
    expect(service.user()).toBeNull();
  });

  it('waits for refresh and ignores its result once logout starts', () => {
    service.setSession(session);
    service.refreshAccessToken().subscribe();
    service.logout().subscribe();

    const refresh = http.expectOne('/api/auth/refresh-token');
    refresh.flush({ code: 200, data: { ...session, accessToken: 'stale-token' }, message: 'ok', timestamp: 'now' });
    const logout = http.expectOne('/api/auth/logout');
    expect(service.accessToken()).toBe(session.accessToken);
    logout.flush({ code: 200, data: null, message: 'ok', timestamp: 'now' });

    expect(service.accessToken()).toBeNull();
    expect(service.user()).toBeNull();
  });

  it('does not issue refresh work while logout is active', () => {
    service.setSession(session);
    service.logout().subscribe();
    const refreshResult: { error?: unknown } = {};
    service.refreshAccessToken().subscribe({ error: (error) => refreshResult.error = error });

    expect(http.match('/api/auth/refresh-token')).toHaveSize(0);
    http.expectOne('/api/auth/logout').flush({ code: 200, data: null, message: 'ok', timestamp: 'now' });
    expect(refreshResult.error).toBeTruthy();
  });

  it('preserves the session and exposes retryable logout failure', () => {
    service.setSession(session);
    service.logout().subscribe({ error: () => undefined });
    http.expectOne('/api/auth/logout').flush({ message: 'Logout service unavailable' }, { status: 503, statusText: 'Unavailable' });

    expect(service.accessToken()).toBe(session.accessToken);
    expect(service.user()).toEqual(session.user);
    expect(service.logoutError()).toBe('Logout service unavailable');

    service.logout().subscribe();
    http.expectOne('/api/auth/logout').flush({ code: 200, data: null, message: 'ok', timestamp: 'now' });
    expect(service.logoutError()).toBeNull();
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
