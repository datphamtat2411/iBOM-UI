import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, shareReplay, Subject, takeUntil } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { ProfileDetail, ProfileSummary } from '../models/profile.models';
import { ProfileService } from './profile.service';

@Injectable({ providedIn: 'root' })
export class ProfileContextService {
  private readonly profileService = inject(ProfileService);
  private readonly authService = inject(AuthService);
  private readonly detailRequestCancel = new Subject<void>();
  private summariesRequest?: Observable<ProfileSummary[]>;
  private summariesGeneration = 0;
  private detailGeneration = 0;

  readonly summaries = signal<ProfileSummary[]>([]);
  readonly summariesLoading = signal(false);
  readonly summariesError = signal<unknown | null>(null);
  readonly selectedId = signal<string | null>(null);
  readonly detail = signal<ProfileDetail | null>(null);
  readonly detailLoading = signal(false);
  readonly detailError = signal<unknown | null>(null);

  constructor() {
    this.authService.sessionEnded$().subscribe(() => this.reset());
  }

  loadSummaries(): void {
    if (this.summariesRequest) return;
    const generation = this.summariesGeneration;
    this.summariesLoading.set(true);
    this.summariesError.set(null);
    const request = this.profileService.list().pipe(shareReplay(1));
    this.summariesRequest = request;
    request.subscribe({
      next: (summaries) => {
        if (generation === this.summariesGeneration && this.summariesRequest === request) {
          this.summaries.set(summaries);
          this.summariesLoading.set(false);
        }
      },
      error: (error) => {
        if (generation === this.summariesGeneration && this.summariesRequest === request) {
          this.summariesError.set(error);
          this.summariesLoading.set(false);
          this.summariesRequest = undefined;
        }
      },
    });
  }

  invalidateSummaries(): void {
    this.summariesGeneration++;
    this.summariesRequest = undefined;
    this.summaries.set([]);
    this.summariesLoading.set(false);
    this.summariesError.set(null);
  }

  beginSelection(profileId: string | null): void {
    this.detailRequestCancel.next();
    this.detailGeneration++;
    this.selectedId.set(profileId);
    this.detail.set(null);
    this.detailError.set(null);
    this.detailLoading.set(false);
  }

  loadDetail(profileId: string): void {
    this.beginSelection(profileId);
    const generation = this.detailGeneration;
    this.detailLoading.set(true);
    this.profileService.get(profileId).pipe(takeUntil(this.detailRequestCancel)).subscribe({
      next: (detail) => {
        if (this.detailGeneration === generation && this.selectedId() === profileId) { this.detail.set(detail); this.detailLoading.set(false); }
      },
      error: (error) => {
        if (this.detailGeneration === generation && this.selectedId() === profileId) { this.detailError.set(error); this.detailLoading.set(false); }
      },
    });
  }

  private reset(): void {
    this.invalidateSummaries();
    this.beginSelection(null);
  }

  isNotFound(error: unknown): boolean {
    return error instanceof HttpErrorResponse && error.status === 404 && error.error?.errorCode === 'PROFILE_NOT_FOUND';
  }
}
