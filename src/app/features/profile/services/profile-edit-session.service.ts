import { Injectable, signal } from '@angular/core';

export interface PendingProfileNavigation {
  url: string;
}

@Injectable({ providedIn: 'root' })
export class ProfileEditSessionService {
  readonly dirty = signal(false);
  readonly pendingNavigation = signal<PendingProfileNavigation | null>(null);

  private pendingDecision: Promise<boolean> | null = null;
  private resolveDecision: ((allow: boolean) => void) | null = null;

  setDirty(dirty: boolean): void {
    this.dirty.set(dirty);
  }

  requestNavigation(url: string): Promise<boolean> {
    if (!this.dirty()) return Promise.resolve(true);
    if (this.pendingDecision) return this.pendingDecision;

    this.pendingNavigation.set({ url });
    this.pendingDecision = new Promise<boolean>((resolve) => { this.resolveDecision = resolve; });
    return this.pendingDecision;
  }

  resolveNavigation(allow: boolean): void {
    const resolve = this.resolveDecision;
    this.resolveDecision = null;
    this.pendingDecision = null;
    this.pendingNavigation.set(null);
    resolve?.(allow);
  }
}
