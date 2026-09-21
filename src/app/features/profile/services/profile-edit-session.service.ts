import { Injectable, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export interface PendingProfileNavigation {
  url: string;
}

@Injectable({ providedIn: 'root' })
export class ProfileEditSessionService {
  readonly dirty = signal(false);
  readonly pendingNavigation = signal<PendingProfileNavigation | null>(null);
  private readonly navigationDiscarded = new Subject<void>();

  private pendingDecision: Promise<boolean> | null = null;
  private resolveDecision: ((allow: boolean) => void) | null = null;

  setDirty(dirty: boolean): void {
    this.dirty.set(dirty);
  }

  navigationDiscarded$(): Observable<void> {
    return this.navigationDiscarded.asObservable();
  }

  requestNavigation(url: string): Promise<boolean> {
    if (!this.dirty()) return Promise.resolve(true);
    if (this.pendingDecision) return this.pendingDecision;

    this.pendingNavigation.set({ url });
    this.pendingDecision = new Promise<boolean>((resolve) => { this.resolveDecision = resolve; });
    return this.pendingDecision;
  }

  resolveNavigation(allow: boolean): void {
    if (allow) this.navigationDiscarded.next();
    const resolve = this.resolveDecision;
    this.resolveDecision = null;
    this.pendingDecision = null;
    this.pendingNavigation.set(null);
    resolve?.(allow);
  }
}
