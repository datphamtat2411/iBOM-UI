import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from '../auth/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    auth.setSession({ accessToken: 'token', user: { id: 1, email: 'a@b.test', username: 'a', role: 'USER' } });
  });

  afterEach(() => http.verify());

  it('attaches bearer credentials only to eligible API requests', () => {
    client.get('/api/items').subscribe();
    const request = http.expectOne('/api/items');
    expect(request.request.headers.get('Authorization')).toBe('Bearer token');
    expect(request.request.withCredentials).toBeTrue();
    request.flush({});

    client.get('/api/auth/login').subscribe();
    const publicRequest = http.expectOne('/api/auth/login');
    expect(publicRequest.request.headers.has('Authorization')).toBeFalse();
    publicRequest.flush({});
  });

  it('attaches bearer credentials to protected auth requests', () => {
    client.put('/api/auth/change-username', { username: 'updated-user' }).subscribe();
    const usernameRequest = http.expectOne('/api/auth/change-username');
    expect(usernameRequest.request.headers.get('Authorization')).toBe('Bearer token');
    usernameRequest.flush({});

    client.put('/api/auth/change-password', { currentPassword: 'old', newPassword: 'New1!' }).subscribe();
    const passwordRequest = http.expectOne('/api/auth/change-password');
    expect(passwordRequest.request.headers.get('Authorization')).toBe('Bearer token');
    passwordRequest.flush({});
  });

  it('does not attach the access token or retry logout', () => {
    client.post('/api/auth/logout', null).subscribe();
    const request = http.expectOne('/api/auth/logout');
    expect(request.request.headers.has('Authorization')).toBeFalse();
    expect(request.request.withCredentials).toBeTrue();
    request.flush({});
    expect(http.match('/api/auth/refresh-token')).toHaveSize(0);
  });

  it('coordinates concurrent unauthorized requests through one refresh', () => {
    client.get('/api/one').subscribe();
    client.get('/api/two').subscribe();
    http.expectOne('/api/one').flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne('/api/two').flush({}, { status: 401, statusText: 'Unauthorized' });

    const refresh = http.expectOne('/api/auth/refresh-token');
    expect(http.match('/api/auth/refresh-token').length).toBe(0);
    refresh.flush({ data: { accessToken: 'new-token', user: { id: 1, email: 'a@b.test', username: 'a', role: 'USER' } }, code: 200, message: 'ok', timestamp: 'now' });

    const retries = http.match((request) => request.url === '/api/one' || request.url === '/api/two');
    expect(retries.length).toBe(2);
    retries.forEach((request) => {
      expect(request.request.headers.get('Authorization')).toBe('Bearer new-token');
      request.flush({});
    });
  });

  it('does not retry a request twice when refresh fails', () => {
    client.get('/api/items').subscribe({ error: () => undefined });
    http.expectOne('/api/items').flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne('/api/auth/refresh-token').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(http.match('/api/items').length).toBe(0);
  });
});
