import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { NotificationService } from '../notifications/notification.service';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const decision = () => authService.isAuthenticated() || router.parseUrl('/login');

  return authService.isRestored() ? decision() : authService.restoration$().pipe(map(decision));
};

export const managementGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const notifications = inject(NotificationService);
  const decision = () => {
    if (!authService.isAuthenticated()) return router.parseUrl('/login');
    if (['MANAGER', 'ADMIN'].includes(authService.user()?.role ?? '')) return true;

    const denialMessage = route.data?.['managementDeniedMessage'];
    if (typeof denialMessage === 'string') notifications.showError(denialMessage);
    return router.parseUrl('/dashboard');
  };

  return authService.isRestored() ? decision() : authService.restoration$().pipe(map(decision));
};

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const decision = () => authService.isAuthenticated() ? router.parseUrl('/') : true;

  return authService.isRestored() ? decision() : authService.restoration$().pipe(map(decision));
};
