import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { REGISTRATION_CODE_PATH, REGISTRATION_PATH } from '../../../core/http/api.config';
import { RegistrationService } from './registration.service';

describe('RegistrationService', () => {
  let service: RegistrationService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(RegistrationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests a verification code with credentials and only the email', () => {
    service.requestVerificationCode({ email: 'member@example.com' }).subscribe((result) => expect(result).toBeUndefined());
    const request = http.expectOne(REGISTRATION_CODE_PATH);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'member@example.com' });
    expect(request.request.withCredentials).toBeTrue();
    request.flush({ code: 200, message: 'ok', data: null, timestamp: 'now' });
  });

  it('registers with the four backend fields and propagates errors', () => {
    const payload = { email: 'member@example.com', username: 'member', password: 'Strong1!', verificationCode: '123456' };
    service.register(payload).subscribe({ error: (error) => expect(error.status).toBe(409) });
    const request = http.expectOne(REGISTRATION_PATH);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    expect(request.request.withCredentials).toBeTrue();
    request.flush({ errorCode: 'AUTH_EMAIL_ALREADY_REGISTERED' }, { status: 409, statusText: 'Conflict' });
  });
});
