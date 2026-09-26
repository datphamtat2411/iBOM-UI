import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { By } from '@angular/platform-browser';
import { NavigationEnd, provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, Subject, throwError } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { NotificationService } from '../../core/notifications/notification.service';
import { ProfileCopyComponent } from '../profile/components/profile-copy/profile-copy.component';
import { ProfileContextService } from '../profile/services/profile-context.service';
import { ProfileEditSessionService } from '../profile/services/profile-edit-session.service';
import { ShellPreferencesService, SHELL_SIDEBAR_COLLAPSED_STORAGE_KEY } from './services/shell-preferences.service';
import { ApplicationShellComponent } from './application-shell.component';

describe('ApplicationShellComponent', () => {
  let fixture: ComponentFixture<ApplicationShellComponent>;
  let auth: { user: ReturnType<typeof signal>; logoutError: ReturnType<typeof signal>; logout: jasmine.Spy };
  let profileContext: {
    summaries: ReturnType<typeof signal>;
    summariesLoading: ReturnType<typeof signal>;
    summariesError: ReturnType<typeof signal>;
    selectedId: ReturnType<typeof signal>;
    detail: ReturnType<typeof signal>;
    detailLoading: ReturnType<typeof signal>;
    managedMember: ReturnType<typeof signal>;
    managedSummaries: ReturnType<typeof signal>;
    managedSummariesLoading: ReturnType<typeof signal>;
    managedSummariesError: ReturnType<typeof signal>;
    managedSelectedId: ReturnType<typeof signal>;
    managedDetail: ReturnType<typeof signal>;
    beginSelection: jasmine.Spy;
    clearManagedContext: jasmine.Spy;
    loadSummaries: jasmine.Spy;
    refreshSummariesAndSelect: jasmine.Spy;
  };
  let editSession: ProfileEditSessionService;

  const openMenu = (selector: string): HTMLElement => {
    (fixture.nativeElement.querySelector(selector) as HTMLButtonElement).click();
    fixture.detectChanges();
    const panels = document.querySelectorAll('.cdk-overlay-pane .mat-mdc-menu-panel');
    const panel = panels[panels.length - 1] as HTMLElement | null;
    expect(panel).not.toBeNull();
    return panel!;
  };

  const closeMenu = (): void => {
    const panels = document.querySelectorAll('.cdk-overlay-pane .mat-mdc-menu-panel');
    panels[panels.length - 1]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    localStorage.setItem(SHELL_SIDEBAR_COLLAPSED_STORAGE_KEY, 'false');
    auth = {
      user: signal({ id: 1, email: 'minh@example.com', username: 'Minh Anh', role: 'MEMBER' }),
      logoutError: signal<string | null>(null),
      logout: jasmine.createSpy('logout').and.returnValue(of(undefined)),
    };
    profileContext = {
      summaries: signal([]),
      summariesLoading: signal(false),
      summariesError: signal(null),
      selectedId: signal(null),
      detail: signal(null),
      detailLoading: signal(false),
      managedMember: signal(null),
      managedSummaries: signal([]),
      managedSummariesLoading: signal(false),
      managedSummariesError: signal(null),
      managedSelectedId: signal(null),
      managedDetail: signal(null),
      beginSelection: jasmine.createSpy('beginSelection').and.callFake((id: string | null) => profileContext.selectedId.set(id)),
      clearManagedContext: jasmine.createSpy('clearManagedContext'),
      loadSummaries: jasmine.createSpy('loadSummaries'),
      refreshSummariesAndSelect: jasmine.createSpy('refreshSummariesAndSelect').and.returnValue(of(undefined)),
    };
    await TestBed.configureTestingModule({
      imports: [ApplicationShellComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        provideHttpClient(),
        { provide: AuthService, useValue: auth },
        { provide: ProfileContextService, useValue: profileContext },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ApplicationShellComponent);
    editSession = TestBed.inject(ProfileEditSessionService);
    TestBed.inject(NotificationService).clear();
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    try {
      localStorage.removeItem(SHELL_SIDEBAR_COLLAPSED_STORAGE_KEY);
    } catch {
      // A storage guard is covered by the preference service tests.
    }
  });

  it('renders identity and keeps account actions in a Material menu', async () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.avatar')?.textContent?.trim()).toBe('MA');
    expect(element.querySelector('.account-copy strong')?.textContent?.trim()).toBe('Minh Anh');
    expect(element.querySelector('.account-copy small')?.textContent?.trim()).toBe('MEMBER');

    const menu = openMenu('.account-btn');
    expect(menu.querySelector('.menu-heading')?.textContent?.trim()).toBe('minh@example.com');
    expect(menu.textContent).toContain('Account Settings');
    expect(menu.textContent).toContain('Sign out');
    closeMenu();
    await fixture.whenStable();
    expect(fixture.componentInstance.accountMenuOpen).toBeFalse();
  });

  it('links the workspace logo to the homepage', () => {
    const brand = fixture.nativeElement.querySelector('.brand') as HTMLAnchorElement;

    expect(brand.getAttribute('href')).toBe('/');
    expect(brand.getAttribute('aria-label')).toBe('iBOM Homepage');
  });

  it('keeps mobile drawer state local and closes it from the backdrop and Escape', () => {
    const component = fixture.componentInstance;
    component.mobileViewport.set(true);
    fixture.detectChanges();

    const toggle = fixture.nativeElement.querySelector('.mobile-nav-toggle') as HTMLButtonElement;
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(component.navigationOpen()).toBeTrue();
    expect(fixture.nativeElement.querySelector('.sidebar').classList).toContain('mobile-open');

    (fixture.nativeElement.querySelector('.drawer-backdrop') as HTMLElement).click();
    fixture.detectChanges();
    expect(component.navigationOpen()).toBeFalse();

    toggle.click();
    fixture.detectChanges();
    component.onEscape();
    fixture.detectChanges();
    expect(component.navigationOpen()).toBeFalse();
  });

  it('shows semantic icons, accessible names, and persists the user-controlled rail state', () => {
    const component = fixture.componentInstance;
    const preferences = TestBed.inject(ShellPreferencesService);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.nav-glyph')).toBeNull();
    expect(element.querySelectorAll('app-shell-icon').length).toBeGreaterThan(0);

    preferences.setSidebarCollapsed(true);
    fixture.detectChanges();
    expect(element.querySelector('.application-shell')?.classList).toContain('sidebar-collapsed');
    expect(element.querySelector('.nav-btn[aria-label="Dashboard"]')).not.toBeNull();
    expect(element.querySelector('.sidebar-collapse')?.getAttribute('aria-label')).toBe('Expand navigation');

    component.toggleSidebar();
    fixture.detectChanges();
    expect(preferences.sidebarCollapsed()).toBeFalse();
    expect(localStorage.getItem(SHELL_SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe('false');
  });

  it('shows role-aware Management navigation without changing role visibility', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.management-group')).toBeNull();

    auth.user.set({ id: 1, email: 'minh@example.com', username: 'Minh Anh', role: 'MANAGER' });
    fixture.detectChanges();
    expect(element.querySelector('.management-group')).not.toBeNull();
    expect(element.querySelector('a[routerLink="/members"]')).not.toBeNull();
    expect(element.querySelector('a[routerLink="/users"]')).not.toBeNull();
    expect(element.querySelector('a[routerLink="/dashboard/manager"]')).not.toBeNull();

    auth.user.set({ id: 1, email: 'minh@example.com', username: 'Minh Anh', role: 'ADMIN' });
    fixture.detectChanges();
    expect(element.querySelector('.management-group')).not.toBeNull();

    auth.user.set({ id: 1, email: 'minh@example.com', username: 'Minh Anh', role: 'MEMBER' });
    fixture.detectChanges();
    expect(element.querySelector('.management-group')).toBeNull();
  });

  it('keeps nested Member routes active and preserves Master Data child state when its accordion is closed', () => {
    const router = TestBed.inject(Router);
    spyOnProperty(router, 'url', 'get').and.returnValue('/master-data/skills');
    auth.user.set({ id: 1, email: 'minh@example.com', username: 'Minh Anh', role: 'MANAGER' });
    const component = fixture.componentInstance;
    component.masterDataExpanded = true;
    fixture.detectChanges();

    const parent = fixture.nativeElement.querySelector('.nav-parent') as HTMLButtonElement;
    const children = fixture.nativeElement.querySelector('.nav-children') as HTMLElement;
    expect(parent.classList).toContain('active');
    expect(parent.getAttribute('aria-current')).toBe('page');
    expect(children.getAttribute('aria-hidden')).toBe('false');

    parent.click();
    fixture.detectChanges();
    expect(router.url).toBe('/master-data/skills');
    expect(component.masterDataExpanded).toBeFalse();
    expect(children.getAttribute('aria-hidden')).toBe('true');
    expect(parent.getAttribute('aria-expanded')).toBe('false');

  });

  it('opens the collapsed Master Data rail menu with real child routes', () => {
    const preferences = TestBed.inject(ShellPreferencesService);
    preferences.setSidebarCollapsed(true);
    auth.user.set({ id: 1, email: 'minh@example.com', username: 'Minh Anh', role: 'MANAGER' });
    fixture.detectChanges();

    const menu = openMenu('.nav-parent');
    expect(menu.getAttribute('aria-label')).toBe('Master Data navigation');
    expect(menu.querySelector('a[routerLink="/master-data/skills"]')).not.toBeNull();
    expect(menu.querySelector('a[routerLink="/master-data/file-name-formats"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.nav-children')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('shows the personal Profile menu with Create and Copy only in own context', () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    spyOnProperty(router, 'url', 'get').and.returnValue('/profiles/1');
    profileContext.summaries.set([
      { id: 1, profileName: 'Backend CV', firstName: 'A', lastName: 'User', jobTitle: 'Engineer', updatedAt: '2026-01-01' },
      { id: 2, profileName: 'Frontend CV', firstName: 'A', lastName: 'User', jobTitle: 'Engineer', updatedAt: '2026-01-01' },
    ]);
    profileContext.selectedId.set('1');
    fixture.detectChanges();

    const menu = openMenu('.profile-trigger');
    expect(menu.textContent).toContain('My Profiles');
    expect(menu.textContent).toContain('Create Profile');
    expect(menu.textContent).toContain('Copy Profile');
    expect(menu.querySelectorAll('.profile-option').length).toBe(2);

    (menu.querySelectorAll('.profile-option')[1] as HTMLButtonElement).click();
    expect(router.navigate).toHaveBeenCalledWith(['/profiles', 2]);
  });

  it('shows a direct Create Profile action when no own Profile exists', () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    spyOnProperty(router, 'url', 'get').and.returnValue('/profiles');
    fixture.detectChanges();

    const cta = fixture.nativeElement.querySelector('.profile-create-cta') as HTMLButtonElement;
    expect(cta).not.toBeNull();
    cta.click();
    expect(router.navigate).toHaveBeenCalledWith(['/profiles/new']);
  });

  it('keeps managed Member context isolated and omits own Profile actions', () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    spyOnProperty(router, 'url', 'get').and.returnValue('/members/10/profiles/2');
    profileContext.managedMember.set({ id: '10', username: 'managed-user' });
    profileContext.managedSummaries.set([
      { id: 2, profileName: 'Managed Backend CV', firstName: 'A', lastName: 'Member', jobTitle: 'Engineer', updatedAt: '2026-01-01T00:00:00Z' },
      { id: 3, profileName: 'Managed Frontend CV', firstName: 'A', lastName: 'Member', jobTitle: 'Engineer', updatedAt: '2026-01-02T23:30:00Z' },
    ]);
    profileContext.managedSelectedId.set('2');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.member-context')?.textContent).toContain('managed-user');
    expect(fixture.nativeElement.textContent).not.toContain('Create Profile');
    expect(fixture.nativeElement.textContent).not.toContain('Copy Profile');

    const menu = openMenu('.profile-trigger');
    expect(menu.textContent).toContain('Managed Member Profiles');
    expect(menu.textContent).not.toContain('Create Profile');
    expect(menu.textContent).not.toContain('Copy Profile');
    expect(menu.querySelectorAll('.profile-option')[0].querySelector('time')?.getAttribute('datetime')).toBe('2026-01-01T00:00:00Z');
    (menu.querySelectorAll('.profile-option')[1] as HTMLButtonElement).click();

    expect(router.navigate).toHaveBeenCalledWith(['/members', '10', 'profiles', 3]);
  });

  it('keeps the managed context on Preview and Project routes', () => {
    const router = TestBed.inject(Router);
    spyOnProperty(router, 'url', 'get').and.returnValue('/members/10/profiles/2/projects/7');
    profileContext.managedMember.set({ id: '10', username: 'managed-user' });
    profileContext.managedSummaries.set([{ id: 2, profileName: 'Managed CV', firstName: 'A', lastName: 'Member', jobTitle: 'Engineer', updatedAt: '2026-01-01' }]);
    profileContext.managedSelectedId.set('2');
    fixture.detectChanges();

    expect(fixture.componentInstance.isManagedProfileRoute()).toBeTrue();
    expect(fixture.componentInstance.contextLabel).toBe('Workspace');

    expect(fixture.componentInstance.isManagedProfileRoute()).toBeTrue();
    expect(fixture.nativeElement.querySelector('.member-context')).not.toBeNull();
  });

  it('submits sign out once, closes the Material menu, and navigates after success', async () => {
    const pendingLogout = new Subject<void>();
    auth.logout.and.returnValue(pendingLogout);
    const router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    openMenu('.account-btn');

    const button = document.querySelector('.cdk-overlay-pane button.menu-item') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(auth.logout).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.accountMenuOpen).toBeFalse();

    await fixture.whenStable();
    openMenu('.account-btn');
    const pendingButton = document.querySelector('.cdk-overlay-pane button.menu-item') as HTMLButtonElement;
    expect(pendingButton.disabled).toBeTrue();
    pendingButton.click();
    expect(auth.logout).toHaveBeenCalledTimes(1);
    pendingLogout.next();
    pendingLogout.complete();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('does not log out when a dirty Profile edit is kept', async () => {
    const component = fixture.componentInstance;
    editSession.setDirty(true);
    component.signOut();

    expect(auth.logout).not.toHaveBeenCalled();
    expect(editSession.pendingNavigation()).toEqual({ url: '/login' });
    editSession.resolveNavigation(false);
    await fixture.whenStable();

    expect(auth.logout).not.toHaveBeenCalled();
    expect(component.logoutInProgress).toBeFalse();
  });

  it('logs out after a dirty Profile edit is discarded', async () => {
    const pendingLogout = new Subject<void>();
    auth.logout.and.returnValue(pendingLogout);
    const router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    const component = fixture.componentInstance;
    editSession.setDirty(true);
    component.signOut();

    editSession.setDirty(false);
    editSession.resolveNavigation(true);
    await fixture.whenStable();
    expect(auth.logout).toHaveBeenCalledTimes(1);
    pendingLogout.next();
    pendingLogout.complete();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('re-enables sign out after a failed logout', () => {
    const failedLogout = new Subject<void>();
    auth.logout.and.returnValue(failedLogout);
    openMenu('.account-btn');
    (document.querySelector('.cdk-overlay-pane button.menu-item') as HTMLButtonElement).click();
    failedLogout.error(new Error('failed'));
    fixture.detectChanges();

    openMenu('.account-btn');
    expect((document.querySelector('.cdk-overlay-pane button.menu-item') as HTMLButtonElement).disabled).toBeFalse();
  });

  it('opens Copy Profile from Dashboard without navigating', () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    spyOnProperty(router, 'url', 'get').and.returnValue('/dashboard');
    profileContext.summaries.set([{ id: 2, profileName: 'Frontend CV', firstName: 'A', lastName: 'User', jobTitle: 'Engineer', updatedAt: '2026-01-01' }]);
    profileContext.selectedId.set('2');
    fixture.detectChanges();

    fixture.componentInstance.openCopyProfile();
    fixture.detectChanges();
    const modal = fixture.debugElement.query(By.directive(ProfileCopyComponent));
    expect(modal).not.toBeNull();
    expect(modal.componentInstance.sourceProfileId).toBe('2');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('does not start own-Profile Copy from a managed Member route', async () => {
    const router = TestBed.inject(Router);
    spyOnProperty(router, 'url', 'get').and.returnValue('/members/10/profiles/2');
    profileContext.summaries.set([{ id: 1, profileName: 'My CV', firstName: 'A', lastName: 'User', jobTitle: 'Engineer', updatedAt: '2026-01-01' }]);
    profileContext.selectedId.set('1');
    profileContext.managedMember.set({ id: '10', username: 'managed-user' });
    fixture.detectChanges();

    fixture.componentInstance.openCopyProfile();
    await fixture.whenStable();

    expect(fixture.componentInstance.copyModalOpen).toBeFalse();
    expect(fixture.debugElement.query(By.directive(ProfileCopyComponent))).toBeNull();
  });

  it('refreshes, selects, navigates, and notifies after a successful Copy', async () => {
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
  });

  it('keeps the Copy modal open until Open copied Profile is chosen', async () => {
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

  it('reports Copy success when Profile reconciliation fails', async () => {
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

    expect(notifications.showSuccess).toHaveBeenCalledWith('Profile copied successfully, but the Profile workspace could not be refreshed. Please try again.');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('preserves toast status and alert semantics', () => {
    const notifications = TestBed.inject(NotificationService);
    notifications.showSuccess('Project added successfully.');
    fixture.detectChanges();
    let toast = fixture.nativeElement.querySelector('[data-notification-toast]') as HTMLElement;
    expect(toast.getAttribute('role')).toBe('status');
    expect(toast.getAttribute('aria-live')).toBe('polite');
    expect(toast.getAttribute('aria-atomic')).toBe('true');

    notifications.showError('You do not have permission to access Member Management.');
    fixture.detectChanges();
    toast = fixture.nativeElement.querySelector('[data-notification-toast]') as HTMLElement;
    expect(toast.getAttribute('role')).toBe('alert');
    expect(toast.getAttribute('aria-live')).toBe('assertive');
    expect(toast.classList).toContain('error');
  });
});
