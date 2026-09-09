import { Component, computed, HostListener, inject } from '@angular/core';
import { NavigationEnd, NavigationStart, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { ProfileContextService } from '../profile/services/profile-context.service';

@Component({
  selector: 'app-application-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './application-shell.component.html',
  styleUrl: './application-shell.component.scss',
})
export class ApplicationShellComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly profileContext = inject(ProfileContextService);

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

  constructor() {
    this.profileContext.loadSummaries();
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart && event.url.startsWith('/profiles')) {
        const profileId = event.url.split('/')[2]?.split('?')[0] || null;
        if (profileId !== 'new') this.profileContext.beginSelection(profileId);
      }
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
  isSelectedProfile(id: number | string): boolean { return String(id) === this.profileContext.selectedId(); }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
     if (this.accountMenuOpen && !target.closest('.account-menu') && !target.closest('.account-btn')) this.closeAccountMenu();
     if (this.profileMenuOpen && !target.closest('.profile-menu') && !target.closest('.profile-trigger')) this.closeProfileMenu();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { if (this.accountMenuOpen) this.closeAccountMenu(); if (this.profileMenuOpen) this.closeProfileMenu(); }
}
