import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { authGuard, guestGuard, managementGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { NotificationService } from '../notifications/notification.service';

const memberManagementDeniedMessage = 'You do not have permission to access Member Management.';

describe('authGuard', () => {
  let auth: {
    isRestored: WritableSignal<boolean>;
    isAuthenticated: WritableSignal<boolean>;
    user: WritableSignal<{ role: string } | null>;
    restoration$: AuthService['restoration$'];
  };
  let notifications: { showError: jasmine.Spy };

  beforeEach(() => {
    auth = {
      isRestored: signal(false),
      isAuthenticated: signal(false),
      user: signal<{ role: string } | null>(null),
      restoration$: () => of(true),
    };
    notifications = { showError: jasmine.createSpy('showError') };

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }, { provide: NotificationService, useValue: notifications }],
    });
  });

  it('allows an authenticated restored session', () => {
    auth.isRestored.set(true);
    auth.isAuthenticated.set(true);

    expect(TestBed.runInInjectionContext(() => authGuard({} as never, {} as never))).toBeTrue();
  });

  it('redirects after restoration when no session exists', () => {
    auth.isRestored.set(true);
    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(result).toEqual(TestBed.inject(Router).parseUrl('/login'));
  });

  it('does not permit the dashboard after local logout clears the session', () => {
    auth.isRestored.set(true);
    auth.isAuthenticated.set(false);

    expect(TestBed.runInInjectionContext(() => authGuard({} as never, {} as never))).toEqual(TestBed.inject(Router).parseUrl('/login'));
  });

  it('redirects an authenticated user away from guest pages', () => {
    auth.isRestored.set(true);
    auth.isAuthenticated.set(true);

    expect(TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never))).toEqual(TestBed.inject(Router).parseUrl('/'));
  });

  it('allows a signed-out user to open guest pages', () => {
    auth.isRestored.set(true);

    expect(TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never))).toBeTrue();
  });

  it('allows only managers and admins into Management routes', () => {
    auth.isRestored.set(true);
    auth.isAuthenticated.set(true);
    const route = { data: { managementDeniedMessage: memberManagementDeniedMessage } };

    for (const role of ['MANAGER', 'ADMIN']) {
      auth.user.set({ role });
      expect(TestBed.runInInjectionContext(() => managementGuard(route as never, {} as never))).toBeTrue();
    }
    expect(notifications.showError).not.toHaveBeenCalled();

    auth.user.set({ role: 'MEMBER' });
    expect(TestBed.runInInjectionContext(() => managementGuard(route as never, {} as never))).toEqual(TestBed.inject(Router).parseUrl('/dashboard'));
  });

  it('publishes the route-scoped denial once for an authenticated non-manager', () => {
    auth.isRestored.set(true);
    auth.isAuthenticated.set(true);
    auth.user.set({ role: 'MEMBER' });
    const route = { data: { managementDeniedMessage: memberManagementDeniedMessage } };

    expect(TestBed.runInInjectionContext(() => managementGuard(route as never, {} as never))).toEqual(TestBed.inject(Router).parseUrl('/dashboard'));
    expect(notifications.showError).toHaveBeenCalledOnceWith(memberManagementDeniedMessage);
  });

  it('redirects an unauthenticated user to login without publishing route feedback', () => {
    auth.isRestored.set(true);
    const route = { data: { managementDeniedMessage: memberManagementDeniedMessage } };

    expect(TestBed.runInInjectionContext(() => managementGuard(route as never, {} as never))).toEqual(TestBed.inject(Router).parseUrl('/login'));
    expect(notifications.showError).not.toHaveBeenCalled();
  });

  it('does not publish Member Management copy for management routes without denial metadata', () => {
    auth.isRestored.set(true);
    auth.isAuthenticated.set(true);
    auth.user.set({ role: 'MEMBER' });

    expect(TestBed.runInInjectionContext(() => managementGuard({} as never, {} as never))).toEqual(TestBed.inject(Router).parseUrl('/dashboard'));
    expect(notifications.showError).not.toHaveBeenCalled();
  });

  it('waits for session restoration before deciding Management access', () => {
    auth.isAuthenticated.set(true);
    auth.user.set({ role: 'ADMIN' });

    const result = TestBed.runInInjectionContext(() => managementGuard({} as never, {} as never));

    expect(result).toEqual(jasmine.any(Object));
  });
});
