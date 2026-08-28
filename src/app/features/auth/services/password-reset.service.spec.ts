import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { FORGOT_PASSWORD_PATH, FORGOT_PASSWORD_VERIFY_PATH, RESET_PASSWORD_PATH } from '../../../core/http/api.config';
import { PasswordResetService } from './password-reset.service';

describe('PasswordResetService', () => {
  let service: PasswordResetService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PasswordResetService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uses the recovery endpoints and omits confirm password', () => {
    service.requestCode({ email: 'user@example.com' }).subscribe();
    const request = http.expectOne(FORGOT_PASSWORD_PATH);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'user@example.com' });
    expect(request.request.withCredentials).toBeTrue();
    request.flush({ code: 200, message: 'ok', data: null, timestamp: 'now' });

    service.verifyCode({ email: 'user@example.com', verificationCode: '123456' }).subscribe();
    const verify = http.expectOne(FORGOT_PASSWORD_VERIFY_PATH);
    expect(verify.request.body).toEqual({ email: 'user@example.com', verificationCode: '123456' });
    verify.flush({ code: 200, message: 'ok', data: null, timestamp: 'now' });

    service.resetPassword({ email: 'user@example.com', verificationCode: '123456', password: 'Strong1!' }).subscribe();
    const reset = http.expectOne(RESET_PASSWORD_PATH);
    expect(reset.request.body).toEqual({ email: 'user@example.com', verificationCode: '123456', password: 'Strong1!' });
    expect(reset.request.body.confirmPassword).toBeUndefined();
    reset.flush({ code: 200, message: 'ok', data: null, timestamp: 'now' });
  });
});
