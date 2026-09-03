import { Component, computed, HostListener, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';

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

  readonly user = this.authService.user;
  readonly avatarInitials = computed(() => {
    const username = this.user()?.username?.trim() || this.user()?.email || 'User';
    const words = username.split(/[\s._-]+/).filter(Boolean);
    return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase();
  });

  navigationOpen = false;
  accountMenuOpen = false;

  constructor() {
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe(() => this.accountMenuOpen = false);
  }

  toggleNavigation(): void {
    this.navigationOpen = !this.navigationOpen;
  }

  toggleAccountMenu(): void { this.accountMenuOpen = !this.accountMenuOpen; }
  closeAccountMenu(): void { this.accountMenuOpen = false; }
  get contextTitle(): string { return this.router.url.includes('/account-settings') ? 'Account Settings' : 'Dashboard'; }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.accountMenuOpen && !target.closest('.account-menu') && !target.closest('.account-btn')) this.closeAccountMenu();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { if (this.accountMenuOpen) this.closeAccountMenu(); }
}
