import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('authGuard', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  it('allows an authenticated restored session', () => {
    const auth = TestBed.inject(AuthService);
    auth.setSession({ accessToken: 'token', user: { id: '1', email: 'a@b.test', username: 'a', role: 'USER' } });
    auth.isRestored.set(true);

    expect(TestBed.runInInjectionContext(() => authGuard({} as never, {} as never))).toBeTrue();
  });

  it('redirects after restoration when no session exists', () => {
    const auth = TestBed.inject(AuthService);
    auth.isRestored.set(true);
    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(result).toEqual(TestBed.inject(Router).parseUrl('/login'));
  });
});
