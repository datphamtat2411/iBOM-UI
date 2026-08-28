import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { ApiResponse } from '../../../core/http/api.models';
import { FORGOT_PASSWORD_PATH, FORGOT_PASSWORD_VERIFY_PATH, RESET_PASSWORD_PATH } from '../../../core/http/api.config';
import { ForgotPasswordRequest, ResetPasswordRequest, VerifyPasswordCodeRequest } from '../models/password-reset.models';

@Injectable({ providedIn: 'root' })
export class PasswordResetService {
  constructor(private readonly http: HttpClient) {}

  requestCode(request: ForgotPasswordRequest): Observable<void> {
    return this.http.post<ApiResponse<void>>(FORGOT_PASSWORD_PATH, request, { withCredentials: true }).pipe(map(() => undefined));
  }

  verifyCode(request: VerifyPasswordCodeRequest): Observable<void> {
    return this.http.post<ApiResponse<void>>(FORGOT_PASSWORD_VERIFY_PATH, request, { withCredentials: true }).pipe(map(() => undefined));
  }

  resetPassword(request: ResetPasswordRequest): Observable<void> {
    return this.http.post<ApiResponse<void>>(RESET_PASSWORD_PATH, request, { withCredentials: true }).pipe(map(() => undefined));
  }
}
