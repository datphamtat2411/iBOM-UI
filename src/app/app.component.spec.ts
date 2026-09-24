import { DebugElement } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router, RouterOutlet } from '@angular/router';

import { AppComponent } from './app.component';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
  });

  it('renders the router outlet application shell', () => {
    fixture.detectChanges();

    const outlet: DebugElement | null = fixture.debugElement.query(By.directive(RouterOutlet));
    expect(outlet).not.toBeNull();
  });

  it('renders the homepage at the root route', async () => {
    const router = TestBed.inject(Router);
    fixture.detectChanges();

    await router.navigateByUrl('/');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-home')).not.toBeNull();
  });

  it('navigates once to Login with generic session-ended state after an established refresh failure', () => {
    const auth = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    const http = TestBed.inject(HttpTestingController);
    const clearSession = spyOn(auth, 'clearSession').and.callThrough();
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);
    auth.setSession({ accessToken: 'token', user: { id: 1, email: 'user@example.com', username: 'user', role: 'USER' } });

    auth.refreshAccessToken().subscribe({ error: () => undefined });
    http.expectOne('/api/auth/refresh-token').flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(clearSession).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledOnceWith(['/login'], { state: { sessionEnded: true } });
  });
});
