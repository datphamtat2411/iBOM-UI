import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, shareReplay, Subject, takeUntil } from 'rxjs';

import { ProfileDetail, ProfileSummary } from '../models/profile.models';
import { ProfileService } from './profile.service';

@Injectable({ providedIn: 'root' })
export class ProfileContextService {
  private readonly profileService = inject(ProfileService);
  private readonly detailRequestCancel = new Subject<void>();
  private summariesRequest?: Observable<ProfileSummary[]>;

  readonly summaries = signal<ProfileSummary[]>([]);
  readonly summariesLoading = signal(false);
  readonly summariesError = signal<unknown | null>(null);
  readonly selectedId = signal<string | null>(null);
  readonly detail = signal<ProfileDetail | null>(null);
  readonly detailLoading = signal(false);
  readonly detailError = signal<unknown | null>(null);

  loadSummaries(): void {
    if (this.summariesRequest) return;
    this.summariesLoading.set(true);
    this.summariesRequest = this.profileService.list().pipe(shareReplay(1));
    this.summariesRequest.subscribe({
      next: (summaries) => { this.summaries.set(summaries); this.summariesLoading.set(false); },
      error: (error) => { this.summariesError.set(error); this.summariesLoading.set(false); },
    });
  }

  beginSelection(profileId: string | null): void {
    this.detailRequestCancel.next();
    this.selectedId.set(profileId);
    this.detail.set(null);
    this.detailError.set(null);
    this.detailLoading.set(false);
  }

  loadDetail(profileId: string): void {
    this.beginSelection(profileId);
    this.detailLoading.set(true);
    this.profileService.get(profileId).pipe(takeUntil(this.detailRequestCancel)).subscribe({
      next: (detail) => {
        if (this.selectedId() === profileId) { this.detail.set(detail); this.detailLoading.set(false); }
      },
      error: (error) => {
        if (this.selectedId() === profileId) { this.detailError.set(error); this.detailLoading.set(false); }
      },
    });
  }

  isNotFound(error: unknown): boolean {
    return error instanceof HttpErrorResponse && error.status === 404 && error.error?.errorCode === 'PROFILE_NOT_FOUND';
  }
}
