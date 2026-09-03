import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject } from 'rxjs';

import { AuthenticatedUser } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let auth: {
    user: WritableSignal<AuthenticatedUser | null>;
    isAuthenticated: WritableSignal<boolean>;
    logoutError: WritableSignal<string | null>;
    logout: jasmine.Spy;
  };

  beforeEach(async () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(2026, 7, 24, 9, 41, 28));

    auth = {
      user: signal<AuthenticatedUser | null>(null),
      isAuthenticated: signal(false),
      logoutError: signal<string | null>(null),
      logout: jasmine.createSpy('logout').and.returnValue(of(undefined)),
    };

    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('initializes, updates, and stops the local clock with the component lifecycle', () => {
    fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.localTime).toBe('09:41:28');

    jasmine.clock().tick(1000);
    expect(fixture.componentInstance.localTime).toBe('09:41:29');

    fixture.destroy();
    jasmine.clock().tick(1000);
    expect(fixture.componentInstance.localTime).toBe('09:41:29');
  });

  it('exposes the Login entry point at /login', () => {
    fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.login-control').getAttribute('href')).toBe('/login');
  });

  it('replaces Login with the authenticated user menu', () => {
    auth.user.set({ id: 1, email: 'minh@example.com', username: 'Minh Anh', role: 'MEMBER' });
    auth.isAuthenticated.set(true);
    fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.login-control')).toBeNull();
    expect(element.querySelector('.home-avatar')?.textContent?.trim()).toBe('MA');

    (element.querySelector('.home-account-btn') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(element.querySelector('.home-menu-item')?.textContent?.trim()).toBe('Workspace');
    expect(element.querySelectorAll('.home-menu-item').length).toBe(2);
  });

  it('logs out from the homepage and returns to the root route', () => {
    auth.user.set({ id: 1, email: 'minh@example.com', username: 'Minh Anh', role: 'MEMBER' });
    auth.isAuthenticated.set(true);
    const pendingLogout = new Subject<void>();
    auth.logout.and.returnValue(pendingLogout);
    fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    fixture.componentInstance.accountMenuOpen = true;
    fixture.detectChanges();
    spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);

    (fixture.nativeElement.querySelectorAll('.home-menu-item')[1] as HTMLButtonElement).click();
    expect(auth.logout).toHaveBeenCalledTimes(1);
    pendingLogout.next();
    pendingLogout.complete();
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/');
  });
});
