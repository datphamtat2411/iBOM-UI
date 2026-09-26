import { A11yModule } from '@angular/cdk/a11y';
import { Component, computed, effect, ElementRef, HostListener, inject, QueryList, signal, ViewChild, ViewChildren } from '@angular/core';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { NotificationService } from '../../core/notifications/notification.service';
import { ProfileCopyComponent } from '../profile/components/profile-copy/profile-copy.component';
import { ProfileResponse, ProfileSummary } from '../profile/models/profile.models';
import { ProfileContextService } from '../profile/services/profile-context.service';
import { ProfileEditSessionService } from '../profile/services/profile-edit-session.service';
import { ShellPreferencesService } from './services/shell-preferences.service';
import { ShellIconComponent } from './shell-icon.component';

@Component({
  selector: 'app-application-shell',
  standalone: true,
  imports: [A11yModule, MatMenuModule, MatTooltipModule, RouterLink, RouterLinkActive, RouterOutlet, ProfileCopyComponent, ShellIconComponent],
  templateUrl: './application-shell.component.html',
  styleUrl: './application-shell.component.scss',
})
export class ApplicationShellComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly profileEditSession = inject(ProfileEditSessionService);
  private readonly shellPreferences = inject(ShellPreferencesService);
  readonly profileContext = inject(ProfileContextService);
  readonly notifications = inject(NotificationService);

  readonly user = this.authService.user;
  readonly sidebarCollapsed = this.shellPreferences.sidebarCollapsed;
  readonly mobileViewport = signal(this.shellPreferences.isMobileViewport());
  readonly managementVisible = computed(() => ['MANAGER', 'ADMIN'].includes(this.user()?.role ?? ''));
  readonly logoutError = this.authService.logoutError;
  private readonly timestampFormatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  });
  readonly avatarInitials = computed(() => {
    const username = this.user()?.username?.trim() || this.user()?.email || 'User';
    const words = username.split(/[\s._-]+/).filter(Boolean);
    return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase();
  });

  navigationOpen = signal(false);
  masterDataExpanded = this.isMasterDataRoute();
  masterDataMenuOpen = false;
  accountMenuOpen = false;
  logoutInProgress = false;
  copyModalOpen = false;
  copySource: { id: string; name: string } | null = null;
  private copyWorkflowGeneration = 0;
  private activeCopyWorkflow: { generation: number; sourceId: string; routeUrl: string } | null = null;

  @ViewChild('mobileNavToggle', { read: ElementRef }) private mobileNavToggle?: ElementRef<HTMLButtonElement>;
  @ViewChildren(MatMenuTrigger) private menuTriggers?: QueryList<MatMenuTrigger>;

  constructor() {
    let previousUrl = this.router.url;
    effect(() => {
      const currentSource = this.currentCopySource();
      const workflow = this.activeCopyWorkflow;
      if (!workflow || !this.copyModalOpen) return;
      if (!currentSource || currentSource.id !== workflow.sourceId) this.invalidateCopyWorkflow();
    });
    this.router.events.subscribe((event) => {
      if (!(event instanceof NavigationEnd)) return;
      this.closeAllMenus();
      this.closeNavigation(false);
      if (this.isMasterDataRoute(event.urlAfterRedirects) && !this.isMasterDataRoute(previousUrl)) {
        this.masterDataExpanded = true;
      }
      previousUrl = event.urlAfterRedirects;
      if (this.activeCopyWorkflow && event.urlAfterRedirects !== this.activeCopyWorkflow.routeUrl) this.invalidateCopyWorkflow();
    });
  }

  toggleNavigation(): void {
    if (this.navigationOpen()) {
      this.closeNavigation();
      return;
    }

    this.navigationOpen.set(true);
  }

  closeNavigation(restoreFocus = true): void {
    const wasOpen = this.navigationOpen();
    this.navigationOpen.set(false);
    if (!restoreFocus || !wasOpen || !this.mobileViewport()) return;

    queueMicrotask(() => this.mobileNavToggle?.nativeElement.focus());
  }

  toggleSidebar(): void {
    if (this.mobileViewport()) return;
    this.shellPreferences.toggleSidebar();
  }

  @HostListener('window:resize')
  onViewportResize(): void {
    this.shellPreferences.syncResponsiveDefault();
    const isMobile = this.shellPreferences.isMobileViewport();
    if (this.mobileViewport() === isMobile) return;
    this.mobileViewport.set(isMobile);
    if (!isMobile) this.closeNavigation(false);
  }

  toggleMasterData(): void {
    if (this.sidebarCollapsed()) return;
    this.masterDataExpanded = !this.masterDataExpanded;
  }

  isMasterDataRoute(url = this.router.url): boolean {
    const path = url.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
    return path === '/master-data' || path.startsWith('/master-data/');
  }

  isMemberManagementRoute(url = this.router.url): boolean {
    const path = url.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
    return path === '/members' || path.startsWith('/members/');
  }

  isUserManagementRoute(url = this.router.url): boolean {
    const path = url.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
    return path === '/users' || path.startsWith('/users/');
  }

  isDashboardRoute(url = this.router.url): boolean {
    const path = url.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
    return path === '/dashboard';
  }

  isManagedProfileRoute(url = this.router.url): boolean {
    const path = url.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
    return /^\/members\/[^/]+\/profiles(?:\/[^/]+(?:\/preview|\/projects(?:\/[^/]+)?)?)?$/.test(path);
  }

  onAccountMenuOpened(): void { this.accountMenuOpen = true; }
  onAccountMenuClosed(): void { this.accountMenuOpen = false; }
  closeAccountMenu(): void { this.accountMenuOpen = false; }
  signOut(): void {
    if (this.logoutInProgress) return;
    this.logoutInProgress = true;
    this.closeAccountMenu();
    if (this.profileEditSession.dirty()) {
      this.profileEditSession.requestNavigation('/login').then((allow) => {
        if (!allow) {
          this.logoutInProgress = false;
          return;
        }
        this.executeLogout();
      });
      return;
    }

    this.executeLogout();
  }
  private executeLogout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => { this.logoutInProgress = false; },
    });
  }
  get contextLabel(): string {
    if (this.router.url.includes('/account-settings')) return 'Account';
    if (this.isManagedProfileRoute()) return 'Workspace';
    if (this.isMemberManagementRoute() || this.isUserManagementRoute() || this.isMasterDataRoute()) return 'Management';
    if (this.router.url.startsWith('/dashboard/manager')) return 'Management';
    return 'Workspace';
  }

  get contextTitle(): string {
    return this.contextLabel;
  }

  isOwnProfileContext(): boolean {
    return !this.isManagedProfileRoute() && (this.isDashboardRoute() || this.router.url.startsWith('/profiles'));
  }

  get selectedProfileName(): string {
    if (this.isManagedProfileRoute()) {
      const selected = this.selectedManagedSummary();
      if (selected) return selected.profileName;
      const detail = this.profileContext.managedDetail();
      if (detail) return detail.profileName;
      return 'No Profile selected';
    }

    const detail = this.profileContext.detail();
    if (detail) return detail.profileName;
    const selected = this.profileContext.summaries().find((summary) => String(summary.id) === this.profileContext.selectedId());
    return selected?.profileName ?? 'Select a Profile';
  }

  onProfileMenuOpened(): void { this.profileMenuOpen = true; }
  onProfileMenuClosed(): void { this.profileMenuOpen = false; }
  closeProfileMenu(): void { this.profileMenuOpen = false; }
  profileMenuOpen = false;
  selectProfile(id: number | string): void {
    this.closeProfileMenu();
    if (this.isDashboardRoute()) {
      const select = (): void => this.profileContext.beginSelection(String(id));
      if (!this.profileEditSession.dirty()) {
        select();
        return;
      }
      this.profileEditSession.requestNavigation('/dashboard').then((allow) => { if (allow) select(); });
      return;
    }

    const commands = this.isManagedProfileRoute() && this.managedMemberId()
      ? ['/members', this.managedMemberId()!, 'profiles', id]
      : ['/profiles', id];
    if (!this.profileEditSession.dirty()) {
      void this.router.navigate(commands);
      return;
    }
    this.profileEditSession.requestNavigation(this.routeUrl(commands)).then((allow) => {
      if (allow) void this.router.navigate(commands);
    });
  }
  createProfile(): void {
    if (this.isManagedProfileRoute()) return;
    this.closeProfileMenu();
    void this.router.navigate(['/profiles/new']);
  }
  openCopyProfile(): void {
    if (this.isManagedProfileRoute()) return;
    this.closeProfileMenu();
    const source = this.currentCopySource();
    const sourceRouteUrl = this.router.url;
    if (!source || !this.isCopySourceRoute(source.id, sourceRouteUrl)) return;

    const openWorkflow = (allow: boolean): void => {
      const routeUrl = this.router.url;
      const currentSource = this.currentCopySource();
      if (!allow || routeUrl !== sourceRouteUrl || currentSource?.id !== source.id || !this.isCopySourceRoute(source.id, routeUrl)) return;
      const generation = ++this.copyWorkflowGeneration;
      this.activeCopyWorkflow = { generation, sourceId: source.id, routeUrl };
      this.copySource = source;
      this.copyModalOpen = true;
    };

    if (this.isDashboardRoute(sourceRouteUrl)) {
      openWorkflow(true);
      return;
    }

    this.profileEditSession.requestNavigation(`/profiles/${source.id}`).then(openWorkflow);
  }
  closeCopyProfile(): void {
    this.invalidateCopyWorkflow();
  }
  copyCompleted(copied: ProfileResponse): void {
    const source = this.copySource;
    const workflow = this.activeCopyWorkflow;
    if (!copied || !source || !workflow || workflow.sourceId !== source.id || !this.isCurrentCopyWorkflow(workflow) || !this.currentCopySource() || this.currentCopySource()?.id !== source.id) {
      this.invalidateCopyWorkflow();
    }
  }
  profileCopied(copied: ProfileResponse): void {
    const source = this.copySource;
    const workflow = this.activeCopyWorkflow;
    if (!source || !workflow || workflow.sourceId !== source.id || !this.isCurrentCopyWorkflow(workflow) || !this.currentCopySource() || this.currentCopySource()?.id !== source.id) {
      this.invalidateCopyWorkflow();
      return;
    }

    this.copyModalOpen = false;
    this.copySource = null;
    this.profileContext.refreshSummariesAndSelect(copied.id).subscribe({
      next: () => {
        if (!this.isCurrentCopyWorkflow(workflow)) {
          this.invalidateCopyWorkflow();
          return;
        }
        this.activeCopyWorkflow = null;
        this.notifications.showSuccess('Profile copied successfully.');
        void this.router.navigate(['/profiles', copied.id]);
      },
      error: () => {
        if (!this.isCurrentCopyWorkflow(workflow)) {
          this.invalidateCopyWorkflow();
          return;
        }
        this.activeCopyWorkflow = null;
        this.notifications.showSuccess('Profile copied successfully, but the Profile workspace could not be refreshed. Please try again.');
      },
    });
  }
  isSelectedProfile(id: number | string): boolean {
    return String(id) === (this.isManagedProfileRoute() ? this.profileContext.managedSelectedId() : this.profileContext.selectedId());
  }

  managedMemberLabel(): string {
    const member = this.profileContext.managedMember();
    if (member?.username?.trim()) return member.username;
    if (member?.email?.trim()) return member.email;
    return member ? `Member ${member.id}` : `Member ${this.managedMemberId() ?? '—'}`;
  }

  managedProfilesLoading(): boolean { return this.profileContext.managedSummariesLoading(); }
  managedProfilesError(): unknown | null { return this.profileContext.managedSummariesError(); }
  managedProfiles() { return this.profileContext.managedSummaries(); }
  selectedManagedSummary(): ProfileSummary | null {
    return this.managedProfiles().find((summary) => String(summary.id) === this.profileContext.managedSelectedId()) ?? null;
  }
  formatTimestamp(value: string | null | undefined): string {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : this.timestampFormatter.format(date);
  }

  exitManagedMember(): void {
    const ownerProfileId = this.profileContext.selectedId()
      && this.profileContext.summaries().some((summary) => String(summary.id) === this.profileContext.selectedId())
      ? this.profileContext.selectedId()
      : null;
    const navigate = (): void => {
      this.profileContext.clearManagedContext();
      void this.router.navigate(ownerProfileId ? ['/profiles', ownerProfileId] : ['/profiles']);
    };
    if (!this.profileEditSession.dirty()) {
      navigate();
      return;
    }
    this.profileEditSession.requestNavigation('/profiles').then((allow) => { if (allow) navigate(); });
  }

  private currentCopySource(): { id: string; name: string } | null {
    if (this.isManagedProfileRoute()) return null;
    const selectedId = this.profileContext.selectedId();
    const summary = this.profileContext.summaries().find((profile) => String(profile.id) === selectedId);
    const detail = this.profileContext.detail();
    if (!selectedId || !summary || (detail && String(detail.id) !== selectedId)) return null;
    return { id: selectedId, name: detail?.profileName ?? summary.profileName };
  }

  private invalidateCopyWorkflow(): void {
    this.copyWorkflowGeneration++;
    this.activeCopyWorkflow = null;
    this.copyModalOpen = false;
    this.copySource = null;
  }

  private isCurrentCopyWorkflow(workflow: { generation: number; sourceId: string; routeUrl: string }): boolean {
    return this.activeCopyWorkflow?.generation === workflow.generation && this.router.url === workflow.routeUrl;
  }

  private isCurrentProfileRoute(profileId: string, routeUrl: string): boolean {
    const path = routeUrl.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
    return path === `/profiles/${profileId}`;
  }

  private isCopySourceRoute(profileId: string, routeUrl: string): boolean {
    return this.isDashboardRoute(routeUrl) || this.isCurrentProfileRoute(profileId, routeUrl);
  }

  private managedMemberId(url = this.router.url): string | null {
    const path = url.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
    const match = path.match(/^\/members\/([^/]+)\/profiles(?:\/[^/]+(?:\/preview|\/projects(?:\/[^/]+)?)?)?$/);
    if (!match) return null;
    return decodeURIComponent(match[1]);
  }

  private routeUrl(commands: (number | string)[]): string {
    return `/${commands.map((command) => encodeURIComponent(String(command))).join('/')}`;
  }

  private closeAllMenus(): void {
    this.accountMenuOpen = false;
    this.profileMenuOpen = false;
    this.masterDataMenuOpen = false;
    this.menuTriggers?.forEach((trigger) => trigger.closeMenu());
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.accountMenuOpen) {
      this.accountMenuOpen = false;
      return;
    }
    if (this.profileMenuOpen) {
      this.profileMenuOpen = false;
      return;
    }
    if (this.navigationOpen()) this.closeNavigation();
  }
}
