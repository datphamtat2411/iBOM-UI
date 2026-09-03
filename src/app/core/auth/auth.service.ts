import { HttpClient, HttpContext } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { BehaviorSubject, catchError, concatMap, defer, filter, finalize, firstValueFrom, map, Observable, of, shareReplay, take, tap, throwError } from 'rxjs';

import { LOGIN_PATH, LOGOUT_PATH, REFRESH_TOKEN_PATH } from '../http/api.config';
import { ApiErrorResponse, ApiResponse } from '../http/api.models';
import { IS_LOGOUT_REQUEST, IS_REFRESH_REQUEST } from '../http/http-context.tokens';
import { AuthenticatedUser, LoginRequest, LoginResponse } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly accessToken = signal<string | null>(null);
  readonly user = signal<AuthenticatedUser | null>(null);
  readonly isRestored = signal(false);
  readonly logoutError = signal<string | null>(null);
  readonly isAuthenticated = computed(() => this.accessToken() !== null && this.user() !== null);

  private refreshRequest$: Observable<LoginResponse> | null = null;
  private refreshGeneration = 0;
  private logoutActive = false;
  private readonly restorationState$ = new BehaviorSubject(false);

  constructor(private readonly http: HttpClient) {}

  setSession(session: LoginResponse): void {
    this.accessToken.set(session.accessToken);
    this.user.set(session.user);
  }

  updateUser(user: AuthenticatedUser): void {
    this.user.set(user);
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<ApiResponse<LoginResponse>>(LOGIN_PATH, request, { withCredentials: true }).pipe(
      map((response) => response.data),
      tap((session) => this.setSession(session)),
    );
  }

  logout(): Observable<void> {
    this.logoutActive = true;
    this.refreshGeneration++;
    this.logoutError.set(null);

    const refreshRequest = this.refreshRequest$;
    const logoutRequest$ = defer(() => this.http.post<ApiResponse<void>>(LOGOUT_PATH, null, {
      context: new HttpContext().set(IS_LOGOUT_REQUEST, true),
      withCredentials: true,
    })).pipe(
      tap(() => this.clearSession()),
      map(() => undefined),
      catchError((error: unknown) => {
        const response = error as ApiErrorResponse & { error?: ApiErrorResponse };
        this.logoutError.set(response.error?.message || response.message || 'Unable to sign out. Please try again.');
        return throwError(() => error);
      }),
      finalize(() => { this.logoutActive = false; }),
    );

    return refreshRequest
      ? refreshRequest.pipe(catchError(() => of(null)), concatMap(() => logoutRequest$))
      : logoutRequest$;
  }

  clearSession(): void {
    this.accessToken.set(null);
    this.user.set(null);
  }

  refreshAccessToken(): Observable<LoginResponse> {
    if (this.logoutActive) {
      return throwError(() => new Error('Logout is in progress'));
    }

    if (!this.refreshRequest$) {
      const generation = this.refreshGeneration;
      let refreshRequest$: Observable<LoginResponse>;
      refreshRequest$ = this.http
        .post<ApiResponse<LoginResponse>>(
          REFRESH_TOKEN_PATH,
          null,
          {
            context: new HttpContext().set(IS_REFRESH_REQUEST, true),
            withCredentials: true,
          },
        )
        .pipe(
           map((response) => response.data),
           tap((session) => {
             if (!this.logoutActive && generation === this.refreshGeneration) this.setSession(session);
           }),
           catchError((error: unknown) => {
             if (!this.logoutActive && generation === this.refreshGeneration) this.clearSession();
             return throwError(() => error);
           }),
           finalize(() => {
             if (this.refreshRequest$ === refreshRequest$) this.refreshRequest$ = null;
           }),
           shareReplay({ bufferSize: 1, refCount: false }),
         );
      this.refreshRequest$ = refreshRequest$;
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

}
