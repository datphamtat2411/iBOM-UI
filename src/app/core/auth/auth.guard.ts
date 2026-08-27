import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const decision = () => authService.isAuthenticated() || router.parseUrl('/login');

  return authService.isRestored() ? decision() : authService.restoration$().pipe(map(decision));
};
