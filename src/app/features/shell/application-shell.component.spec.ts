import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavigationEnd, provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';

import { NotificationService } from '../../core/notifications/notification.service';
import { AuthService } from '../../core/auth/auth.service';
import { ProfileContextService } from '../profile/services/profile-context.service';
import { ProfileEditSessionService } from '../profile/services/profile-edit-session.service';
import { ApplicationShellComponent } from './application-shell.component';

describe('ApplicationShellComponent', () => {
  let fixture: ComponentFixture<ApplicationShellComponent>;
  let auth: { user: ReturnType<typeof signal>; logoutError: ReturnType<typeof signal>; logout: jasmine.Spy };
  let profileContext: { summaries: ReturnType<typeof signal>; summariesLoading: ReturnType<typeof signal>; summariesError: ReturnType<typeof signal>; selectedId: ReturnType<typeof signal>; detail: ReturnType<typeof signal>; detailLoading: ReturnType<typeof signal>; managedMember: ReturnType<typeof signal>; managedSummaries: ReturnType<typeof signal>; managedSummariesLoading: ReturnType<typeof signal>; managedSummariesError: ReturnType<typeof signal>; managedSelectedId: ReturnType<typeof signal>; managedDetail: ReturnType<typeof signal>; clearManagedContext: jasmine.Spy; loadSummaries: jasmine.Spy; refreshSummariesAndSelect: jasmine.Spy };
  let editSession: ProfileEditSessionService;

  beforeEach(async () => {
    auth = {
      user: signal({ id: 1, email: 'minh@example.com', username: 'Minh Anh', role: 'MEMBER' }),
      logoutError: signal<string | null>(null),
      logout: jasmine.createSpy('logout').and.returnValue(of(undefined)),
    };
    profileContext = {
      summaries: signal([]), summariesLoading: signal(false), summariesError: signal(null), selectedId: signal(null), detail: signal(null), detailLoading: signal(false), managedMember: signal(null), managedSummaries: signal([]), managedSummariesLoading: signal(false), managedSummariesError: signal(null), managedSelectedId: signal(null), managedDetail: signal(null), clearManagedContext: jasmine.createSpy('clearManagedContext'), loadSummaries: jasmine.createSpy('loadSummaries'), refreshSummariesAndSelect: jasmine.createSpy('refreshSummariesAndSelect').and.returnValue(of(undefined)),
    };
    await TestBed.configureTestingModule({
      imports: [ApplicationShellComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }, { provide: ProfileContextService, useValue: profileContext }],
    }).compileComponents();
    fixture = TestBed.createComponent(ApplicationShellComponent);
    editSession = TestBed.inject(ProfileEditSessionService);
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

  it('shows independent Management navigation only for managers and admins', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.management-group')).toBeNull();

    auth.user.set({ id: 1, email: 'minh@example.com', username: 'Minh Anh', role: 'MANAGER' });
    fixture.detectChanges();
    expect(element.querySelector('.management-group')).not.toBeNull();

    auth.user.set({ id: 1, email: 'minh@example.com', username: 'Minh Anh', role: 'ADMIN' });
    fixture.detectChanges();
    expect(element.querySelector('.management-group')).not.toBeNull();
  });

  it('keeps Workspace numbering independent from Management numbering', () => {
    auth.user.set({ id: 1, email: 'minh@example.com', username: 'Minh Anh', role: 'MANAGER' });
    fixture.detectChanges();
    const groups = fixture.nativeElement.querySelectorAll('.nav-group');

    expect(groups[0].textContent).toContain('01Dashboard');
    expect(groups[0].textContent).toContain('02Profile Workspace');
    expect(groups[1].textContent).toContain('01Member Management');
    expect(groups[1].textContent).toContain('02Master Data');
  });

  it('links Member Management from the role-aware Management navigation', () => {
    auth.user.set({ id: 1, email: 'minh@example.com', username: 'Minh Anh', role: 'MANAGER' });
    fixture.detectChanges();

    const memberLink = fixture.nativeElement.querySelector('a[routerLink="/members"]') as HTMLAnchorElement;
    expect(memberLink).not.toBeNull();
    expect(memberLink.textContent).toContain('Member Management');

    auth.user.set({ id: 1, email: 'minh@example.com', username: 'Minh Anh', role: 'MEMBER' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a[routerLink="/members"]')).toBeNull();
  });

  it('toggles the Master Data parent without navigating and preserves active child state when collapsed', () => {
    const router = TestBed.inject(Router);
    spyOnProperty(router, 'url', 'get').and.returnValue('/master-data/skills');
    auth.user.set({ id: 1, email: 'minh@example.com', username: 'Minh Anh', role: 'MANAGER' });
    const component = fixture.componentInstance;
    component.masterDataExpanded = true;
    fixture.detectChanges();

    const parent = fixture.nativeElement.querySelector('.nav-parent') as HTMLButtonElement;
    const children = fixture.nativeElement.querySelector('.nav-children') as HTMLDivElement;
    const currentUrl = router.url;
    expect(parent.querySelector('.nav-parent-label')?.nextElementSibling?.classList).toContain('nav-chevron');
    expect(children.hidden).toBeFalse();
    parent.click();
    fixture.detectChanges();

    expect(router.url).toBe(currentUrl);
    expect(component.masterDataExpanded).toBeFalse();
    expect(children.hidden).toBeTrue();
    expect(parent.classList).toContain('active');
    expect(parent.getAttribute('aria-expanded')).toBe('false');
    expect(parent.getAttribute('aria-controls')).toBe('master-data-nav');

    parent.click();
    fixture.detectChanges();
    expect(component.masterDataExpanded).toBeTrue();
    expect(children.hidden).toBeFalse();
  });

  it('expands Master Data when the shell is initialized on a child route', () => {
    const router = TestBed.inject(Router);
    spyOnProperty(router, 'url', 'get').and.returnValue('/master-data/languages');
    auth.user.set({ id: 1, email: 'minh@example.com', username: 'Minh Anh', role: 'MANAGER' });
    const directFixture = TestBed.createComponent(ApplicationShellComponent);
    directFixture.detectChanges();

    const parent = directFixture.nativeElement.querySelector('.nav-parent') as HTMLButtonElement;
    expect(directFixture.componentInstance.masterDataExpanded).toBeTrue();
    expect(parent.getAttribute('aria-expanded')).toBe('true');
    directFixture.destroy();
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

  it('does not log out when a dirty Profile edit is kept', async () => {
    const component = fixture.componentInstance;
    const currentUser = auth.user();
    const currentProfile = profileContext.detail();
    const currentProfileId = profileContext.selectedId();
    editSession.setDirty(true);
    component.accountMenuOpen = true;
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('button.menu-item') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(auth.logout).not.toHaveBeenCalled();
    expect(editSession.pendingNavigation()).toEqual({ url: '/login' });

    editSession.resolveNavigation(false);
    await fixture.whenStable();

    expect(auth.logout).not.toHaveBeenCalled();
    expect(auth.user()).toBe(currentUser);
    expect(profileContext.detail()).toBe(currentProfile);
    expect(profileContext.selectedId()).toBe(currentProfileId);
    expect(component.logoutInProgress).toBeFalse();
  });

  it('logs out once and navigates to login after a dirty Profile edit is discarded', async () => {
    const pendingLogout = new Subject<void>();
    auth.logout.and.returnValue(pendingLogout);
    const component = fixture.componentInstance;
    const router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    editSession.setDirty(true);

    component.signOut();

    expect(auth.logout).not.toHaveBeenCalled();
    expect(editSession.pendingNavigation()).toEqual({ url: '/login' });

    editSession.setDirty(false);
    editSession.resolveNavigation(true);
    await fixture.whenStable();

    expect(auth.logout).toHaveBeenCalledTimes(1);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
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

  it('renders a direct Create Profile CTA without a selector when no Profiles exist', () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    spyOnProperty(router, 'url', 'get').and.returnValue('/profiles');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.profile-trigger')).toBeNull();
    expect(fixture.nativeElement.querySelector('.profile-menu')).toBeNull();
    const cta = fixture.nativeElement.querySelector('.profile-create-cta') as HTMLButtonElement;
    expect(cta.textContent).toContain('Create Profile');
    cta.click();

    expect(router.navigate).toHaveBeenCalledWith(['/profiles/new']);
  });

  it('renders static selected context with Create and Copy actions when one Profile exists', () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    profileContext.summaries.set([{ id: 1, profileName: 'Backend CV', firstName: 'A', lastName: 'User', jobTitle: 'Engineer', updatedAt: '2026-01-01' }]);
    profileContext.selectedId.set('1');
    spyOnProperty(router, 'url', 'get').and.returnValue('/profiles/1');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.profile-trigger')).toBeNull();
    expect(fixture.nativeElement.querySelector('.profile-static-context')?.textContent).toContain('Backend CV');
    expect(fixture.nativeElement.querySelectorAll('.profile-context-actions button').length).toBe(2);
    (fixture.nativeElement.querySelector('.profile-context-actions button') as HTMLButtonElement).click();
    expect(router.navigate).toHaveBeenCalledWith(['/profiles/new']);
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
    expect(fixture.nativeElement.querySelector('.profile-menu-actions')?.textContent).toContain('Copy Profile');
    (fixture.nativeElement.querySelectorAll('.profile-option')[1] as HTMLButtonElement).click();

    expect(router.navigate).toHaveBeenCalledWith(['/profiles', 2]);
  });

  it('renders managed Member context, switches within that Member, and omits own-profile actions', () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    spyOnProperty(router, 'url', 'get').and.returnValue('/members/10/profiles/2');
    profileContext.managedMember.set({ id: '10', username: 'managed-user' });
    profileContext.managedSummaries.set([
      { id: 2, profileName: 'Managed Backend CV', firstName: 'A', lastName: 'Member', jobTitle: 'Engineer', updatedAt: '2026-01-01' },
      { id: 3, profileName: 'Managed Frontend CV', firstName: 'A', lastName: 'Member', jobTitle: 'Engineer', updatedAt: '2026-01-02' },
    ]);
    profileContext.managedSelectedId.set('2');
    profileContext.managedDetail.set({ id: 2, profileName: 'Managed Backend CV', firstName: 'A', lastName: 'Member', jobTitle: 'Engineer', updatedAt: '2026-01-01', yearsOfExperience: 5, personality: null, technicalSummary: null, hasPreviewed: false, version: 1, createdAt: '2026-01-01', lastExportedAt: null, preferredFileNameFormatId: null });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.member-context')?.textContent).toContain('managed-user');
    expect(fixture.nativeElement.querySelector('.profile-menu-actions')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Create Profile');
    expect(fixture.nativeElement.textContent).not.toContain('Copy Profile');

    (fixture.nativeElement.querySelector('.profile-trigger') as HTMLButtonElement).click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelectorAll('.profile-option')[1] as HTMLButtonElement).click();

    expect(router.navigate).toHaveBeenCalledWith(['/members', '10', 'profiles', 3]);
  });

  it('keeps zero managed Profiles valid without exposing a Create action', () => {
    const router = TestBed.inject(Router);
    spyOnProperty(router, 'url', 'get').and.returnValue('/members/10/profiles');
    profileContext.managedMember.set({ id: '10', username: 'managed-user' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.profile-trigger')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('No active Profiles');
    expect(fixture.nativeElement.textContent).not.toContain('Create Profile');
    expect(fixture.nativeElement.textContent).not.toContain('Copy Profile');
  });

  it('renders the remaining Profile as static context after summaries refresh', () => {
    const router = TestBed.inject(Router);
    profileContext.summaries.set([
      { id: 1, profileName: 'Backend CV', firstName: 'A', lastName: 'User', jobTitle: 'Engineer', updatedAt: '2026-01-01' },
      { id: 2, profileName: 'Frontend CV', firstName: 'A', lastName: 'User', jobTitle: 'Engineer', updatedAt: '2026-01-01' },
    ]);
    profileContext.selectedId.set('1');
    spyOnProperty(router, 'url', 'get').and.returnValue('/profiles/1');
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.profile-trigger') as HTMLButtonElement).click();
    fixture.detectChanges();

    profileContext.summaries.set([{ id: 2, profileName: 'Frontend CV', firstName: 'A', lastName: 'User', jobTitle: 'Engineer', updatedAt: '2026-01-01' }]);
    profileContext.selectedId.set('2');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.profile-trigger')).toBeNull();
    expect(fixture.nativeElement.querySelector('.profile-static-context')?.textContent).toContain('Frontend CV');
    expect(fixture.nativeElement.querySelector('.profile-static-context')?.textContent).not.toContain('Backend CV');
  });

  it('opens Create Profile from the Profile menu without changing the selected Profile', () => {
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
    const action = fixture.nativeElement.querySelector('.profile-menu-actions button') as HTMLButtonElement;
    action.click();

    expect(router.navigate).toHaveBeenCalledWith(['/profiles/new']);
    expect(profileContext.selectedId()).toBe('1');
  });

  it('refreshes summaries, selects, navigates, and notifies after a successful Copy', async () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    spyOnProperty(router, 'url', 'get').and.returnValue('/profiles/1');
    const notifications = TestBed.inject(NotificationService);
    spyOn(notifications, 'showSuccess');
    profileContext.summaries.set([{ id: 1, profileName: 'Backend CV', firstName: 'A', lastName: 'User', jobTitle: 'Engineer', updatedAt: '2026-01-01' }]);
    profileContext.selectedId.set('1');
    const component = fixture.componentInstance;
    component.openCopyProfile();
    await fixture.whenStable();
    component.profileCopied({ id: 2, profileName: 'Copied CV' } as never);

    expect(profileContext.refreshSummariesAndSelect).toHaveBeenCalledWith(2);
    expect(notifications.showSuccess).toHaveBeenCalledWith('Profile copied successfully.');
    expect(router.navigate).toHaveBeenCalledWith(['/profiles', 2]);
    expect(component.copyModalOpen).toBeFalse();
  });

  it('keeps the Copy modal open after the API response until Open copied Profile is chosen', async () => {
    const router = TestBed.inject(Router);
    spyOnProperty(router, 'url', 'get').and.returnValue('/profiles/1');
    profileContext.summaries.set([{ id: 1, profileName: 'Backend CV', firstName: 'A', lastName: 'User', jobTitle: 'Engineer', updatedAt: '2026-01-01' }]);
    profileContext.selectedId.set('1');
    const component = fixture.componentInstance;

    component.openCopyProfile();
    await fixture.whenStable();
    component.copyCompleted({ id: 2, profileName: 'Copied CV' } as never);

    expect(component.copyModalOpen).toBeTrue();
    expect(profileContext.refreshSummariesAndSelect).not.toHaveBeenCalled();
  });

  it('reports Copy success when Profile reconciliation fails without navigating or retrying', async () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    spyOnProperty(router, 'url', 'get').and.returnValue('/profiles/1');
    const notifications = TestBed.inject(NotificationService);
    spyOn(notifications, 'showSuccess');
    profileContext.summaries.set([{ id: 1, profileName: 'Backend CV', firstName: 'A', lastName: 'User', jobTitle: 'Engineer', updatedAt: '2026-01-01' }]);
    profileContext.selectedId.set('1');
    profileContext.refreshSummariesAndSelect.and.returnValue(throwError(() => new Error('unavailable')));
    const component = fixture.componentInstance;
    component.openCopyProfile();
    await fixture.whenStable();

    component.profileCopied({ id: 2, profileName: 'Copied CV' } as never);

    expect(profileContext.refreshSummariesAndSelect).toHaveBeenCalledTimes(1);
    expect(notifications.showSuccess).toHaveBeenCalledWith('Profile copied successfully, but the Profile workspace could not be refreshed. Please try again.');
    expect(router.navigate).not.toHaveBeenCalled();
    expect(component.copyModalOpen).toBeFalse();
  });

  it('closes and invalidates Copy when navigation leaves the source Profile', async () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    spyOnProperty(router, 'url', 'get').and.returnValue('/profiles/1');
    const component = fixture.componentInstance;
    profileContext.summaries.set([{ id: 1, profileName: 'Backend CV', firstName: 'A', lastName: 'User', jobTitle: 'Engineer', updatedAt: '2026-01-01' }]);
    profileContext.selectedId.set('1');

    component.openCopyProfile();
    await fixture.whenStable();
    expect(component.copyModalOpen).toBeTrue();

    (router.events as unknown as Subject<NavigationEnd>).next(new NavigationEnd(1, '/profiles/1', '/dashboard'));
    component.profileCopied({ id: 2, profileName: 'Copied CV' } as never);

    expect(profileContext.refreshSummariesAndSelect).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalledWith(['/profiles', 2]);
    expect(component.copyModalOpen).toBeFalse();
  });

  it('coordinates dirty state before opening Copy and does not open when changes are kept', async () => {
    const component = fixture.componentInstance;
    profileContext.summaries.set([{ id: 1, profileName: 'Backend CV', firstName: 'A', lastName: 'User', jobTitle: 'Engineer', updatedAt: '2026-01-01' }]);
    profileContext.selectedId.set('1');
    editSession.setDirty(true);

    component.openCopyProfile();
    expect(editSession.pendingNavigation()).toEqual({ url: '/profiles/1' });
    editSession.resolveNavigation(false);
    await fixture.whenStable();

    expect(component.copyModalOpen).toBeFalse();
  });

  it('renders application success feedback outside routed feature components', () => {
    const notifications = TestBed.inject(NotificationService);
    notifications.showSuccess('Project added successfully.');
    fixture.detectChanges();

    const toast = fixture.nativeElement.querySelector('[data-notification-toast]') as HTMLElement;
    expect(toast.getAttribute('role')).toBe('status');
    expect(toast.getAttribute('aria-live')).toBe('polite');
    expect(toast.textContent).toContain('Project added successfully.');
  });
});
