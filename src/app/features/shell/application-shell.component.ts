import { Component, computed, effect, HostListener, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { NotificationService } from '../../core/notifications/notification.service';
import { ProfileCopyComponent } from '../profile/components/profile-copy/profile-copy.component';
import { ProfileResponse } from '../profile/models/profile.models';
import { ProfileContextService } from '../profile/services/profile-context.service';
import { ProfileEditSessionService } from '../profile/services/profile-edit-session.service';

@Component({
  selector: 'app-application-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ProfileCopyComponent],
  templateUrl: './application-shell.component.html',
  styleUrl: './application-shell.component.scss',
})
export class ApplicationShellComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly profileEditSession = inject(ProfileEditSessionService);
  readonly profileContext = inject(ProfileContextService);
  readonly notifications = inject(NotificationService);

  readonly user = this.authService.user;
  readonly managementVisible = computed(() => ['MANAGER', 'ADMIN'].includes(this.user()?.role ?? ''));
  readonly logoutError = this.authService.logoutError;
  readonly avatarInitials = computed(() => {
    const username = this.user()?.username?.trim() || this.user()?.email || 'User';
    const words = username.split(/[\s._-]+/).filter(Boolean);
    return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase();
  });

  navigationOpen = false;
  masterDataExpanded = this.isMasterDataRoute();
  accountMenuOpen = false;
  logoutInProgress = false;
  copyModalOpen = false;
  copySource: { id: string; name: string } | null = null;
  private copyWorkflowGeneration = 0;
  private activeCopyWorkflow: { generation: number; sourceId: string; routeUrl: string } | null = null;

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
      this.accountMenuOpen = false;
      if (this.isMasterDataRoute(event.urlAfterRedirects) && !this.isMasterDataRoute(previousUrl)) {
        this.masterDataExpanded = true;
      }
      previousUrl = event.urlAfterRedirects;
      if (this.activeCopyWorkflow && event.urlAfterRedirects !== this.activeCopyWorkflow.routeUrl) this.invalidateCopyWorkflow();
    });
  }

  toggleNavigation(): void {
    this.navigationOpen = !this.navigationOpen;
  }

  toggleMasterData(): void { this.masterDataExpanded = !this.masterDataExpanded; }

  isMasterDataRoute(url = this.router.url): boolean {
    const path = url.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
    return path === '/master-data' || path.startsWith('/master-data/');
  }

  isMemberManagementRoute(url = this.router.url): boolean {
    const path = url.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
    return path === '/members' || path.startsWith('/members/');
  }

  isManagedProfileRoute(url = this.router.url): boolean {
    const path = url.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
    return /^\/members\/[^/]+\/profiles(?:\/[^/]+)?$/.test(path);
  }

  toggleAccountMenu(): void { this.accountMenuOpen = !this.accountMenuOpen; }
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
  get contextTitle(): string {
    if (this.isManagedProfileRoute()) return 'Profile Workspace';
    if (this.isMemberManagementRoute()) return 'Member Management';
    if (this.isMasterDataRoute()) return 'Master Data';
    if (this.router.url.startsWith('/profiles')) return 'Profile Workspace';
    return this.router.url.includes('/account-settings') ? 'Account Settings' : 'Dashboard';
  }

  get selectedProfileName(): string {
    if (this.isManagedProfileRoute()) {
      const detail = this.profileContext.managedDetail();
      if (detail) return detail.profileName;
      const selected = this.profileContext.managedSummaries().find((summary) => String(summary.id) === this.profileContext.managedSelectedId());
      return selected?.profileName ?? 'No Profile selected';
    }

    const detail = this.profileContext.detail();
    if (detail) return detail.profileName;
    const selected = this.profileContext.summaries().find((summary) => String(summary.id) === this.profileContext.selectedId());
    return selected?.profileName ?? 'Select a Profile';
  }

  toggleProfileMenu(): void { this.profileMenuOpen = !this.profileMenuOpen; }
  closeProfileMenu(): void { this.profileMenuOpen = false; }
  profileMenuOpen = false;
  selectProfile(id: number | string): void {
    this.closeProfileMenu();
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
    if (!source) return;

    this.profileEditSession.requestNavigation(`/profiles/${source.id}`).then((allow) => {
      const routeUrl = this.router.url;
      if (!allow || !this.currentCopySource() || this.currentCopySource()?.id !== source.id || !this.isCurrentProfileRoute(source.id, routeUrl)) return;
      const generation = ++this.copyWorkflowGeneration;
      this.activeCopyWorkflow = { generation, sourceId: source.id, routeUrl };
      this.copySource = source;
      this.copyModalOpen = true;
    });
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

  private managedMemberId(url = this.router.url): string | null {
    const path = url.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
    const match = path.match(/^\/members\/([^/]+)\/profiles(?:\/[^/]+)?$/);
    if (!match) return null;
    return decodeURIComponent(match[1]);
  }

  private routeUrl(commands: (number | string)[]): string {
    return `/${commands.map((command) => encodeURIComponent(String(command))).join('/')}`;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
     if (this.accountMenuOpen && !target.closest('.account-menu') && !target.closest('.account-btn')) this.closeAccountMenu();
     if (this.profileMenuOpen && !target.closest('.profile-menu') && !target.closest('.profile-trigger')) this.closeProfileMenu();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { if (this.accountMenuOpen) this.closeAccountMenu(); if (this.profileMenuOpen) this.closeProfileMenu(); }
}
