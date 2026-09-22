import { Component, computed, HostListener, inject } from '@angular/core';
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
  readonly logoutError = this.authService.logoutError;
  readonly avatarInitials = computed(() => {
    const username = this.user()?.username?.trim() || this.user()?.email || 'User';
    const words = username.split(/[\s._-]+/).filter(Boolean);
    return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase();
  });

  navigationOpen = false;
  accountMenuOpen = false;
  logoutInProgress = false;
  copyModalOpen = false;
  copySource: { id: string; name: string } | null = null;

  constructor() {
    this.profileContext.loadSummaries();
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) this.accountMenuOpen = false;
    });
  }

  toggleNavigation(): void {
    this.navigationOpen = !this.navigationOpen;
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
    if (this.router.url.startsWith('/profiles')) return 'Profile Workspace';
    return this.router.url.includes('/account-settings') ? 'Account Settings' : 'Dashboard';
  }

  get selectedProfileName(): string {
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
    void this.router.navigate(['/profiles', id]);
  }
  createProfile(): void {
    this.closeProfileMenu();
    void this.router.navigate(['/profiles/new']);
  }
  openCopyProfile(): void {
    this.closeProfileMenu();
    const source = this.currentCopySource();
    if (!source) return;

    this.profileEditSession.requestNavigation(`/profiles/${source.id}`).then((allow) => {
      if (!allow || !this.currentCopySource() || this.currentCopySource()?.id !== source.id) return;
      this.copySource = source;
      this.copyModalOpen = true;
    });
  }
  closeCopyProfile(): void {
    this.copyModalOpen = false;
    this.copySource = null;
  }
  profileCopied(copied: ProfileResponse): void {
    const source = this.copySource;
    if (!source || !this.currentCopySource() || this.currentCopySource()?.id !== source.id) {
      this.closeCopyProfile();
      return;
    }

    this.closeCopyProfile();
    this.profileContext.refreshSummariesAndSelect(copied.id).subscribe({
      next: () => {
        this.notifications.showSuccess('Profile copied successfully.');
        void this.router.navigate(['/profiles', copied.id]);
      },
    });
  }
  isSelectedProfile(id: number | string): boolean { return String(id) === this.profileContext.selectedId(); }

  private currentCopySource(): { id: string; name: string } | null {
    const selectedId = this.profileContext.selectedId();
    const summary = this.profileContext.summaries().find((profile) => String(profile.id) === selectedId);
    const detail = this.profileContext.detail();
    if (!selectedId || !summary || (detail && String(detail.id) !== selectedId)) return null;
    return { id: selectedId, name: detail?.profileName ?? summary.profileName };
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
