import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { of, Subject } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { ProfileContextService } from '../profile/services/profile-context.service';
import { ApplicationShellComponent } from './application-shell.component';

describe('ApplicationShellComponent', () => {
  let fixture: ComponentFixture<ApplicationShellComponent>;
  let auth: { user: ReturnType<typeof signal>; logoutError: ReturnType<typeof signal>; logout: jasmine.Spy };
  let profileContext: { summaries: ReturnType<typeof signal>; summariesLoading: ReturnType<typeof signal>; summariesError: ReturnType<typeof signal>; selectedId: ReturnType<typeof signal>; detail: ReturnType<typeof signal>; detailLoading: ReturnType<typeof signal>; loadSummaries: jasmine.Spy };

  beforeEach(async () => {
    auth = {
      user: signal({ id: 1, email: 'minh@example.com', username: 'Minh Anh', role: 'MEMBER' }),
      logoutError: signal<string | null>(null),
      logout: jasmine.createSpy('logout').and.returnValue(of(undefined)),
    };
    profileContext = {
      summaries: signal([]), summariesLoading: signal(false), summariesError: signal(null), selectedId: signal(null), detail: signal(null), detailLoading: signal(false), loadSummaries: jasmine.createSpy('loadSummaries'),
    };
    await TestBed.configureTestingModule({
      imports: [ApplicationShellComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }, { provide: ProfileContextService, useValue: profileContext }],
    }).compileComponents();
    fixture = TestBed.createComponent(ApplicationShellComponent);
    fixture.detectChanges();
  });

  it('renders the authenticated identity without duplicating the email below the avatar', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.session-status')).toBeNull();
    expect(element.querySelector('.avatar')?.textContent?.trim()).toBe('MA');
    expect(element.querySelector('.account-copy strong')?.textContent?.trim()).toBe('Minh Anh');
    expect(element.querySelector('.account-copy small')?.textContent?.trim()).toBe('MEMBER');
    expect(element.querySelector('.account-email')).toBeNull();

    (element.querySelector('.account-btn') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(element.querySelector('.account-menu p')?.textContent?.trim()).toBe('minh@example.com');
  });

  it('links the workspace logo to the homepage', () => {
    const brand = fixture.nativeElement.querySelector('.brand') as HTMLAnchorElement;

    expect(brand.getAttribute('href')).toBe('/');
    expect(brand.getAttribute('aria-label')).toBe('iBOM Homepage');
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
    const router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    component.accountMenuOpen = true;
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button.menu-item') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    expect(auth.logout).toHaveBeenCalledTimes(1);
    expect(component.accountMenuOpen).toBeFalse();
    expect(fixture.nativeElement.querySelector('.account-menu')).toBeNull();

    component.accountMenuOpen = true;
    fixture.detectChanges();
    const pendingButton = fixture.nativeElement.querySelector('button.menu-item') as HTMLButtonElement;
    expect(pendingButton.disabled).toBeTrue();
    pendingButton.click();
    expect(auth.logout).toHaveBeenCalledTimes(1);
    pendingLogout.next();
    pendingLogout.complete();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('re-enables sign out after a failed logout', () => {
    const failedLogout = new Subject<void>();
    auth.logout.and.returnValue(failedLogout);
    const component = fixture.componentInstance;
    component.accountMenuOpen = true;
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('button.menu-item') as HTMLButtonElement).click();
    failedLogout.error(new Error('failed'));
    fixture.detectChanges();

    component.accountMenuOpen = true;
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('button.menu-item') as HTMLButtonElement).disabled).toBeFalse();
  });

  it('renders no Profile selector when no Profiles exist', () => {
    const router = TestBed.inject(Router);
    spyOnProperty(router, 'url', 'get').and.returnValue('/profiles');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.profile-switcher')).toBeNull();
  });

  it('renders a static current-Profile label when one Profile exists', () => {
    const router = TestBed.inject(Router);
    profileContext.summaries.set([{ id: 1, profileName: 'Backend CV', firstName: 'A', lastName: 'User', jobTitle: 'Engineer', updatedAt: '2026-01-01' }]);
    profileContext.selectedId.set('1');
    spyOnProperty(router, 'url', 'get').and.returnValue('/profiles/1');
    fixture.detectChanges();

    const label = fixture.nativeElement.querySelector('.profile-trigger') as HTMLElement;
    expect(label.tagName).toBe('DIV');
    expect(label.textContent).toContain('Backend CV');
    expect(fixture.nativeElement.querySelector('#profile-menu')).toBeNull();
  });

  it('renders the Profile switcher for multiple Profiles and navigates on selection', () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    profileContext.summaries.set([
      { id: 1, profileName: 'Backend CV', firstName: 'A', lastName: 'User', jobTitle: 'Engineer', updatedAt: '2026-01-01' },
      { id: 2, profileName: 'Frontend CV', firstName: 'A', lastName: 'User', jobTitle: 'Engineer', updatedAt: '2026-01-01' },
    ]);
    profileContext.selectedId.set('1');
    spyOnProperty(router, 'url', 'get').and.returnValue('/profiles/1');
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.profile-trigger') as HTMLButtonElement).click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelectorAll('.profile-option')[1] as HTMLButtonElement).click();

    expect(router.navigate).toHaveBeenCalledWith(['/profiles', 2]);
  });
});
