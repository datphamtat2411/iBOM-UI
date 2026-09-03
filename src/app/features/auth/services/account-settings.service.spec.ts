import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AccountSettingsService } from './account-settings.service';

describe('AccountSettingsService', () => {
  let service: AccountSettingsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AccountSettingsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('changes the username through the expected endpoint and maps the response data', () => {
    const payload = { username: 'updated-user' };
    const user = { id: '1', email: 'user@example.com', username: 'updated-user', role: 'MEMBER' };

    service.changeUsername(payload).subscribe((result) => expect(result).toEqual(user));

    const request = http.expectOne('/api/auth/change-username');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(payload);
    request.flush({ code: 200, message: 'ok', data: user, timestamp: 'now' });
  });

  it('changes the password through the expected endpoint without confirmPassword', () => {
    const payload = { currentPassword: 'Current1!', newPassword: 'NewStrong1!' };

    service.changePassword(payload).subscribe((result) => expect(result).toBeUndefined());

    const request = http.expectOne('/api/auth/change-password');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(payload);
    expect(request.request.body.confirmPassword).toBeUndefined();
    request.flush({ code: 200, message: 'ok', data: null, timestamp: 'now' });
  });
});
