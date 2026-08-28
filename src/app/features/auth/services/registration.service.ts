import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { ApiResponse } from '../../../core/http/api.models';
import { REGISTRATION_CODE_PATH, REGISTRATION_PATH } from '../../../core/http/api.config';
import { RegistrationCodeRequest, RegistrationRequest } from '../models/registration.models';

@Injectable({ providedIn: 'root' })
export class RegistrationService {
  constructor(private readonly http: HttpClient) {}

  requestVerificationCode(request: RegistrationCodeRequest): Observable<void> {
    return this.http.post<ApiResponse<void>>(REGISTRATION_CODE_PATH, request, { withCredentials: true })
      .pipe(map(() => undefined));
  }

  register(request: RegistrationRequest): Observable<void> {
    return this.http.post<ApiResponse<void>>(REGISTRATION_PATH, request, { withCredentials: true })
      .pipe(map(() => undefined));
  }
}
