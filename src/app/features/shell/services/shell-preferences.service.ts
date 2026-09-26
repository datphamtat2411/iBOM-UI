import { Injectable, signal } from '@angular/core';

export const SHELL_SIDEBAR_COLLAPSED_STORAGE_KEY = 'ibom.shell.sidebar-collapsed';

const MOBILE_BREAKPOINT = 768;
const EXPANDED_BREAKPOINT = 1100;

@Injectable({ providedIn: 'root' })
export class ShellPreferencesService {
  static readonly sidebarCollapsedStorageKey = SHELL_SIDEBAR_COLLAPSED_STORAGE_KEY;

  readonly sidebarCollapsed = signal(false);
  private hasExplicitPreference = false;

  constructor() {
    const storedPreference = this.readStoredPreference();
    if (storedPreference !== null) {
      this.sidebarCollapsed.set(storedPreference);
      this.hasExplicitPreference = true;
      return;
    }

    this.sidebarCollapsed.set(this.defaultSidebarCollapsed(this.viewportWidth()));
  }

  setSidebarCollapsed(collapsed: boolean): void {
    this.hasExplicitPreference = true;
    this.sidebarCollapsed.set(collapsed);

    try {
      this.storage()?.setItem(SHELL_SIDEBAR_COLLAPSED_STORAGE_KEY, String(collapsed));
    } catch {
      // Storage can be unavailable in privacy-restricted or server environments.
    }
  }

  toggleSidebar(): void {
    this.setSidebarCollapsed(!this.sidebarCollapsed());
  }

  syncResponsiveDefault(): void {
    if (this.hasExplicitPreference) return;
    this.sidebarCollapsed.set(this.defaultSidebarCollapsed(this.viewportWidth()));
  }

  isMobileViewport(width = this.viewportWidth()): boolean {
    return width < MOBILE_BREAKPOINT;
  }

  private defaultSidebarCollapsed(width: number): boolean {
    return width >= MOBILE_BREAKPOINT && width < EXPANDED_BREAKPOINT;
  }

  private viewportWidth(): number {
    if (typeof window === 'undefined' || !Number.isFinite(window.innerWidth)) return EXPANDED_BREAKPOINT;
    return window.innerWidth;
  }

  private readStoredPreference(): boolean | null {
    try {
      const value = this.storage()?.getItem(SHELL_SIDEBAR_COLLAPSED_STORAGE_KEY);
      if (value === 'true') return true;
      if (value === 'false') return false;
    } catch {
      // Storage can be unavailable in privacy-restricted or server environments.
    }

    return null;
  }

  private storage(): Storage | null {
    if (typeof window === 'undefined') return null;

    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }
}
