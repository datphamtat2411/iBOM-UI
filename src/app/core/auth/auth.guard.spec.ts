import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('authGuard', () => {
  let auth: {
    isRestored: WritableSignal<boolean>;
    isAuthenticated: WritableSignal<boolean>;
    restoration$: AuthService['restoration$'];
  };

  beforeEach(() => {
    auth = {
      isRestored: signal(false),
      isAuthenticated: signal(false),
      restoration$: () => of(true),
    };

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
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
});
