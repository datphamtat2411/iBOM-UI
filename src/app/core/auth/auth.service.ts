import { HttpClient, HttpContext } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { BehaviorSubject, catchError, filter, finalize, firstValueFrom, map, Observable, of, shareReplay, take, tap, throwError } from 'rxjs';

import { LOGIN_PATH, REFRESH_TOKEN_PATH } from '../http/api.config';
import { ApiResponse } from '../http/api.models';
import { IS_REFRESH_REQUEST } from '../http/http-context.tokens';
import { AuthenticatedUser, LoginRequest, LoginResponse } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly accessToken = signal<string | null>(null);
  readonly user = signal<AuthenticatedUser | null>(null);
  readonly isRestored = signal(false);
  readonly isAuthenticated = computed(() => this.accessToken() !== null && this.user() !== null);

  private refreshRequest$: Observable<LoginResponse> | null = null;
  private readonly restorationState$ = new BehaviorSubject(false);

  constructor(private readonly http: HttpClient) {}

  setSession(session: LoginResponse): void {
    this.accessToken.set(session.accessToken);
    this.user.set(session.user);
  }

  updateUser(user: AuthenticatedUser): void {
    this.user.set({ ...user, id: String(user.id) });
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<ApiResponse<LoginResponse>>(LOGIN_PATH, request, { withCredentials: true }).pipe(
      map((response) => this.normalizeSession(response.data)),
      tap((session) => this.setSession(session)),
    );
  }

  clearSession(): void {
    this.accessToken.set(null);
    this.user.set(null);
  }

  refreshAccessToken(): Observable<LoginResponse> {
    if (!this.refreshRequest$) {
      this.refreshRequest$ = this.http
        .post<ApiResponse<LoginResponse>>(
          REFRESH_TOKEN_PATH,
          null,
          {
            context: new HttpContext().set(IS_REFRESH_REQUEST, true),
            withCredentials: true,
          },
        )
        .pipe(
           map((response) => this.normalizeSession(response.data)),
          tap((session) => this.setSession(session)),
          catchError((error: unknown) => {
            this.clearSession();
            return throwError(() => error);
          }),
          finalize(() => {
            this.refreshRequest$ = null;
          }),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
    }

    return this.refreshRequest$!;
  }

  async restoreSession(): Promise<void> {
    await firstValueFrom(
      this.refreshAccessToken().pipe(
        catchError(() => of(null)),
        finalize(() => {
          this.isRestored.set(true);
          this.restorationState$.next(true);
        }),
      ),
    );
  }

  restoration$(): Observable<boolean> {
    return this.restorationState$.pipe(
      filter(Boolean),
      take(1),
    );
  }

  private normalizeSession(session: LoginResponse): LoginResponse {
    return {
      ...session,
      user: {
        ...session.user,
        id: String(session.user.id),
      },
    };
  }
}
