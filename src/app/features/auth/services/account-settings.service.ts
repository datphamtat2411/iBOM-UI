import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { ApiResponse } from '../../../core/http/api.models';
import { ChangePasswordRequest, ChangeUsernameRequest, ChangeUsernameResponse } from '../models/account-settings.models';

const CHANGE_USERNAME_PATH = '/api/auth/change-username';
const CHANGE_PASSWORD_PATH = '/api/auth/change-password';

@Injectable({ providedIn: 'root' })
export class AccountSettingsService {
  constructor(private readonly http: HttpClient) {}

  changeUsername(request: ChangeUsernameRequest): Observable<ChangeUsernameResponse> {
    return this.http.put<ApiResponse<ChangeUsernameResponse>>(CHANGE_USERNAME_PATH, request).pipe(map((response) => response.data));
  }

  changePassword(request: ChangePasswordRequest): Observable<void> {
    return this.http.put<ApiResponse<null>>(CHANGE_PASSWORD_PATH, request).pipe(map(() => undefined));
  }
}
