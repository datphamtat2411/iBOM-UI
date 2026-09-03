import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, Subject } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { ApplicationShellComponent } from './application-shell.component';

describe('ApplicationShellComponent', () => {
  let fixture: ComponentFixture<ApplicationShellComponent>;
  let auth: { user: ReturnType<typeof signal>; logoutError: ReturnType<typeof signal>; logout: jasmine.Spy };

  beforeEach(async () => {
    auth = {
      user: signal({ id: '1', email: 'minh@example.com', username: 'Minh Anh', role: 'MEMBER' }),
      logoutError: signal<string | null>(null),
      logout: jasmine.createSpy('logout').and.returnValue(of(undefined)),
    };
    await TestBed.configureTestingModule({
      imports: [ApplicationShellComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();
    fixture = TestBed.createComponent(ApplicationShellComponent);
    fixture.detectChanges();
  });

  it('renders the authenticated identity without duplicating the email below the avatar', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.avatar')?.textContent?.trim()).toBe('MA');
    expect(element.querySelector('.account-copy strong')?.textContent?.trim()).toBe('Minh Anh');
    expect(element.querySelector('.account-copy small')?.textContent?.trim()).toBe('MEMBER');
    expect(element.querySelector('.account-email')).toBeNull();

    (element.querySelector('.account-btn') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(element.querySelector('.account-menu p')?.textContent?.trim()).toBe('minh@example.com');
  });

  it('opens and closes mobile navigation from the labeled control', () => {
    const toggle = fixture.nativeElement.querySelector('.mobile-nav-toggle') as HTMLButtonElement;
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('.sidebar-nav').classList).toContain('open');
  });

  it('submits sign out once, closes the menu, and navigates after success', () => {
    const pendingLogout = new Subject<void>();
    auth.logout.and.returnValue(pendingLogout);
    const component = fixture.componentInstance;
    component.accountMenuOpen = true;
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.menu-item') as HTMLButtonElement;
    button.click();
    button.click();
    fixture.detectChanges();

    expect(auth.logout).toHaveBeenCalledTimes(1);
    expect(component.accountMenuOpen).toBeFalse();
    expect(button.disabled).toBeTrue();
    pendingLogout.next();
    pendingLogout.complete();
  });

  it('re-enables sign out after a failed logout', () => {
    const failedLogout = new Subject<void>();
    auth.logout.and.returnValue(failedLogout);
    const component = fixture.componentInstance;
    component.accountMenuOpen = true;
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.menu-item') as HTMLButtonElement).click();
    failedLogout.error(new Error('failed'));
    fixture.detectChanges();

    component.accountMenuOpen = true;
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('.menu-item') as HTMLButtonElement).disabled).toBeFalse();
  });
});
