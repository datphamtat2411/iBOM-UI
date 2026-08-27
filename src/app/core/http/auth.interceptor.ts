import { HttpContext, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { isApiRequest, isPublicAuthRequest, REFRESH_TOKEN_PATH } from './api.config';
import { HAS_RETRIED_REQUEST, IS_REFRESH_REQUEST } from './http-context.tokens';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!isApiRequest(request.url)) {
    return next(request);
  }

  const authService = inject(AuthService);
  const isRefreshRequest = request.context.get(IS_REFRESH_REQUEST) || request.url === REFRESH_TOKEN_PATH;
  const eligible = !isRefreshRequest && !isPublicAuthRequest(request.url);
  const token = authService.accessToken();
  const preparedRequest = request.clone({
    withCredentials: true,
    ...(eligible && token ? { setHeaders: { Authorization: `Bearer ${token}` } } : {}),
  });

  if (!eligible || request.context.get(HAS_RETRIED_REQUEST)) {
    return next(preparedRequest);
  }

  return next(preparedRequest).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      const retryContext = new HttpContext().set(HAS_RETRIED_REQUEST, true);
      return authService.refreshAccessToken().pipe(
        switchMap((session) =>
          next(
            request.clone({
              context: retryContext,
              withCredentials: true,
              setHeaders: { Authorization: `Bearer ${session.accessToken}` },
            }),
          ),
        ),
        catchError(() => throwError(() => error)),
      );
    }),
  );
};
