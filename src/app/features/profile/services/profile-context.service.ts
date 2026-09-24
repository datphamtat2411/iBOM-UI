import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { filter, map, Observable, of, shareReplay, Subject, switchMap, takeUntil, tap, throwError } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { ManagedMemberContext, ProfileDetail, ProfileSummary } from '../models/profile.models';
import { ProfileService } from './profile.service';

@Injectable({ providedIn: 'root' })
export class ProfileContextService {
  private readonly profileService = inject(ProfileService);
  private readonly authService = inject(AuthService);
  private readonly detailRequestCancel = new Subject<void>();
  private readonly managedDetailRequestCancel = new Subject<void>();
  private summariesRequest?: Observable<ProfileSummary[]>;
  private managedSummariesRequest?: Observable<ProfileSummary[]>;
  private summariesGeneration = 0;
  private detailGeneration = 0;
  private managedSummariesGeneration = 0;
  private managedDetailGeneration = 0;
  private managedRefreshGeneration = 0;
  private managedRequestedProfileId: string | null = null;

  readonly summaries = signal<ProfileSummary[]>([]);
  readonly summariesLoading = signal(false);
  readonly summariesError = signal<unknown | null>(null);
  readonly selectedId = signal<string | null>(null);
  readonly detail = signal<ProfileDetail | null>(null);
  readonly detailLoading = signal(false);
  readonly detailError = signal<unknown | null>(null);

  readonly managedMember = signal<ManagedMemberContext | null>(null);
  readonly managedSummaries = signal<ProfileSummary[]>([]);
  readonly managedSummariesLoading = signal(false);
  readonly managedSummariesLoaded = signal(false);
  readonly managedSummariesError = signal<unknown | null>(null);
  readonly managedSelectedId = signal<string | null>(null);
  readonly managedDetail = signal<ProfileDetail | null>(null);
  readonly managedDetailLoading = signal(false);
  readonly managedDetailError = signal<unknown | null>(null);
  readonly managedProfileMissing = signal(false);

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

  loadManagedMember(member: ManagedMemberContext, profileId: string | null = null): void {
    const normalizedMember: ManagedMemberContext = { ...member, id: String(member.id) };
    const currentMember = this.managedMember();
    const sameMember = currentMember !== null && String(currentMember.id) === normalizedMember.id;
    this.managedRequestedProfileId = profileId === null ? null : String(profileId);

    if (sameMember) {
      this.managedMember.set({ ...currentMember, ...normalizedMember });
      if (this.managedSummariesLoaded()) {
        const selectedId = this.managedRequestedProfileId ?? (this.managedSummaries()[0] ? String(this.managedSummaries()[0].id) : null);
        const selectionAlreadyActive = this.managedSelectedId() === selectedId
          && (selectedId === null || this.managedDetailLoading() || this.managedDetail() !== null || this.managedDetailError() !== null || this.managedProfileMissing());
        if (!selectionAlreadyActive) this.selectManagedProfile(selectedId);
      } else if (this.managedSummariesError()) {
        this.requestManagedSummaries(normalizedMember);
      }
      return;
    }

    this.managedMember.set(normalizedMember);
    this.clearManagedSelection();
    this.requestManagedSummaries(normalizedMember);
  }

  retryManagedMember(): void {
    const member = this.managedMember();
    if (!member || this.managedSummariesLoading()) return;
    this.clearManagedSelection();
    this.requestManagedSummaries(member);
  }

  selectManagedProfile(profileId: number | string | null): void {
    const normalizedProfileId = profileId === null ? null : String(profileId);
    this.beginManagedSelection(normalizedProfileId);
    if (!normalizedProfileId) return;

    const summary = this.managedSummaries().find((item) => String(item.id) === normalizedProfileId);
    if (!summary) {
      this.managedProfileMissing.set(true);
      return;
    }

    this.requestManagedDetail(normalizedProfileId);
  }

  clearManagedContext(): void {
    this.managedSummariesGeneration++;
    this.managedRefreshGeneration++;
    this.managedSummariesRequest = undefined;
    this.managedRequestedProfileId = null;
    this.managedMember.set(null);
    this.managedSummaries.set([]);
    this.managedSummariesLoading.set(false);
    this.managedSummariesLoaded.set(false);
    this.managedSummariesError.set(null);
    this.clearManagedSelection();
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
    if (this.managedMember()) {
      this.selectManagedProfile(profileId);
      return;
    }
    this.requestDetail(profileId);
  }

  reloadDetail(profileId: string): Observable<ProfileDetail> {
    if (this.managedMember()) return this.reloadManagedDetail(profileId);
    return this.requestDetail(profileId);
  }

  replaceDetail(updated: ProfileDetail): void {
    if (this.managedMember() && this.managedSelectedId() === String(updated.id)) {
      this.managedDetail.set(updated);
      this.managedSummaries.update((summaries) => summaries.map((summary) => {
        if (String(summary.id) !== String(updated.id)) return summary;
        const next = { ...summary, profileName: updated.profileName, firstName: updated.firstName, lastName: updated.lastName, jobTitle: updated.jobTitle, updatedAt: updated.updatedAt };
        return updated.completeness === undefined ? next : { ...next, completeness: updated.completeness };
      }));
      return;
    }

    if (this.selectedId() !== String(updated.id)) return;
    this.detail.set(updated);
    this.summaries.update((summaries) => summaries.map((summary) => {
      if (String(summary.id) !== String(updated.id)) return summary;
      const next = { ...summary, profileName: updated.profileName, firstName: updated.firstName, lastName: updated.lastName, jobTitle: updated.jobTitle, updatedAt: updated.updatedAt };
      return updated.completeness === undefined ? next : { ...next, completeness: updated.completeness };
    }));
  }

  applyMutationVersion(profileId: string, profileVersion: number): boolean {
    const managedCurrent = this.managedDetail();
    if (this.managedMember() && this.managedSelectedId() === String(profileId) && managedCurrent && String(managedCurrent.id) === String(profileId)) {
      this.managedDetail.set({ ...managedCurrent, version: profileVersion, hasPreviewed: false });
      return true;
    }

    const current = this.detail();
    if (this.selectedId() !== String(profileId) || !current || String(current.id) !== String(profileId)) return false;
    this.detail.set({ ...current, version: profileVersion, hasPreviewed: false });
    return true;
  }

  private requestDetail(profileId: string): Observable<ProfileDetail> {
    this.beginSelection(profileId);
    const generation = this.detailGeneration;
    this.detailLoading.set(true);
    const request = this.profileService.get(profileId).pipe(
      takeUntil(this.detailRequestCancel),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    request.subscribe({
      next: (detail) => {
        if (this.detailGeneration === generation && this.selectedId() === profileId) { this.detail.set(detail); this.detailLoading.set(false); }
      },
      error: (error) => {
        if (this.detailGeneration === generation && this.selectedId() === profileId) { this.detailError.set(error); this.detailLoading.set(false); }
      },
    });
    return request;
  }

  private requestManagedSummaries(member: ManagedMemberContext): Observable<ProfileSummary[]> {
    const generation = ++this.managedSummariesGeneration;
    this.managedRefreshGeneration++;
    this.managedSummariesRequest = undefined;
    this.managedSummaries.set([]);
    this.managedSummariesLoading.set(true);
    this.managedSummariesLoaded.set(false);
    this.managedSummariesError.set(null);

    const request = this.profileService.listForMember(String(member.id)).pipe(shareReplay(1));
    this.managedSummariesRequest = request;
    request.subscribe({
      next: (summaries) => {
        if (generation !== this.managedSummariesGeneration || this.managedSummariesRequest !== request) return;

        this.managedSummaries.set(summaries);
        this.managedSummariesLoading.set(false);
        this.managedSummariesLoaded.set(true);
        this.selectManagedProfile(this.managedRequestedProfileId ?? (summaries[0] ? String(summaries[0].id) : null));
      },
      error: (error) => {
        if (generation !== this.managedSummariesGeneration || this.managedSummariesRequest !== request) return;

        this.managedSummariesLoading.set(false);
        this.managedSummariesLoaded.set(false);
        this.managedSummariesError.set(error);
        this.managedSummariesRequest = undefined;
      },
    });
    return request;
  }

  loadManagedProfile(member: ManagedMemberContext, profileId: string): Observable<ProfileDetail> {
    const normalizedMember: ManagedMemberContext = { ...member, id: String(member.id) };
    const normalizedProfileId = String(profileId);
    this.loadManagedMember(normalizedMember, normalizedProfileId);

    const currentDetail = this.managedDetail();
    if (this.managedSummariesLoaded()) {
      const summary = this.managedSummaries().find((item) => String(item.id) === normalizedProfileId);
      if (!summary) {
        this.selectManagedProfile(normalizedProfileId);
        return throwError(() => new Error('Managed Profile is no longer available.'));
      }
      if (this.managedSelectedId() === normalizedProfileId && currentDetail && String(currentDetail.id) === normalizedProfileId) {
        return of(currentDetail);
      }
      return this.reloadManagedDetail(normalizedProfileId);
    }

    const summariesRequest = this.managedSummariesRequest;
    if (!summariesRequest) return throwError(() => new Error('Managed Profile list is not available.'));
    return summariesRequest.pipe(
      switchMap((summaries) => {
        if (!summaries.some((summary) => String(summary.id) === normalizedProfileId)) {
          this.selectManagedProfile(normalizedProfileId);
          return throwError(() => new Error('Managed Profile is no longer available.'));
        }
        return this.reloadManagedDetail(normalizedProfileId);
      }),
    );
  }

  private beginManagedSelection(profileId: string | null): void {
    this.managedDetailRequestCancel.next();
    this.managedDetailGeneration++;
    this.managedRefreshGeneration++;
    this.managedSelectedId.set(profileId);
    this.managedDetail.set(null);
    this.managedDetailError.set(null);
    this.managedDetailLoading.set(false);
    this.managedProfileMissing.set(false);
  }

  private requestManagedDetail(profileId: string): Observable<ProfileDetail> {
    const generation = this.managedDetailGeneration;
    this.managedDetailLoading.set(true);
    const request = this.profileService.get(profileId).pipe(
      takeUntil(this.managedDetailRequestCancel),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    request.subscribe({
      next: (detail) => {
        if (this.managedDetailGeneration === generation && this.managedSelectedId() === profileId) {
          this.managedDetail.set(detail);
          this.managedDetailLoading.set(false);
        }
      },
      error: (error) => {
        if (this.managedDetailGeneration === generation && this.managedSelectedId() === profileId) {
          this.managedDetailError.set(error);
          this.managedDetailLoading.set(false);
        }
      },
    });
    return request;
  }

  private reloadManagedDetail(profileId: string): Observable<ProfileDetail> {
    this.beginManagedSelection(profileId);
    return this.requestManagedDetail(profileId);
  }

  private clearManagedSelection(): void {
    this.managedDetailRequestCancel.next();
    this.managedDetailGeneration++;
    this.managedRefreshGeneration++;
    this.managedSelectedId.set(null);
    this.managedDetail.set(null);
    this.managedDetailLoading.set(false);
    this.managedDetailError.set(null);
    this.managedProfileMissing.set(false);
  }

  refreshSummariesAndSelect(profileId: number | string): Observable<void> {
    this.summariesGeneration++;
    const generation = this.summariesGeneration;
    this.summariesRequest = undefined;
    this.summariesLoading.set(true);
    this.summariesError.set(null);
    return this.profileService.list().pipe(
      tap({
        next: (summaries) => {
          if (generation === this.summariesGeneration) {
            this.summaries.set(summaries);
            this.summariesLoading.set(false);
            this.beginSelection(String(profileId));
          }
        },
        error: (error) => {
          if (generation === this.summariesGeneration) {
            this.summariesError.set(error);
            this.summariesLoading.set(false);
          }
        },
      }),
      filter(() => generation === this.summariesGeneration),
      map(() => undefined),
    );
  }

  refreshSummariesAndSelectFirst(): Observable<ProfileSummary | null> {
    this.beginSelection(null);
    this.invalidateSummaries();
    const generation = this.summariesGeneration;
    this.summariesLoading.set(true);
    const request = this.profileService.list().pipe(shareReplay(1));
    this.summariesRequest = request;
    return request.pipe(
      tap({
        next: (summaries) => {
          if (generation !== this.summariesGeneration || this.summariesRequest !== request) return;
          this.summaries.set(summaries);
          this.summariesLoading.set(false);
          this.beginSelection(summaries.length ? String(summaries[0].id) : null);
        },
        error: (error) => {
          if (generation !== this.summariesGeneration || this.summariesRequest !== request) return;
          this.summariesError.set(error);
          this.summariesLoading.set(false);
          this.summariesRequest = undefined;
        },
      }),
      filter(() => generation === this.summariesGeneration && this.summariesRequest === request),
      map((summaries) => summaries[0] ?? null),
    );
  }

  refreshManagedProfile(profileId: string): Observable<ProfileDetail> {
    const member = this.managedMember();
    if (!member) return throwError(() => new Error('Managed Member context is not active.'));

    const memberId = String(member.id);
    const normalizedProfileId = String(profileId);
    const generation = ++this.managedRefreshGeneration;
    this.managedSummariesLoading.set(true);
    this.managedSummariesError.set(null);

    return this.profileService.listForMember(memberId).pipe(
      tap({
        next: (summaries) => {
          if (!this.isCurrentManagedRefresh(memberId, normalizedProfileId, generation)) return;

          this.managedSummaries.set(summaries);
          this.managedSummariesLoading.set(false);
          this.managedSummariesLoaded.set(true);
          const selected = summaries.some((summary) => String(summary.id) === normalizedProfileId);
          this.managedProfileMissing.set(!selected);
          if (selected) {
            this.managedSelectedId.set(normalizedProfileId);
            this.managedDetailLoading.set(true);
          } else {
            this.managedDetail.set(null);
          }
        },
        error: (error) => {
          if (!this.isCurrentManagedRefresh(memberId, normalizedProfileId, generation)) return;
          this.managedSummariesLoading.set(false);
          this.managedSummariesError.set(error);
        },
      }),
      switchMap((summaries) => {
        if (!this.isCurrentManagedRefresh(memberId, normalizedProfileId, generation)
          || !summaries.some((summary) => String(summary.id) === normalizedProfileId)) {
          return throwError(() => new Error('Managed Profile is no longer available.'));
        }
        return this.profileService.get(normalizedProfileId);
      }),
      tap({
        next: (detail) => {
          if (!this.isCurrentManagedRefresh(memberId, normalizedProfileId, generation)) return;
          this.managedDetail.set(detail);
          this.managedDetailLoading.set(false);
          this.managedDetailError.set(null);
          this.managedProfileMissing.set(false);
        },
        error: (error) => {
          if (!this.isCurrentManagedRefresh(memberId, normalizedProfileId, generation)) return;
          this.managedDetailLoading.set(false);
          this.managedDetailError.set(error);
        },
      }),
    );
  }

  refreshManagedSummariesAndSelectFirst(): Observable<ProfileSummary | null> {
    const member = this.managedMember();
    if (!member) return of(null);

    const memberId = String(member.id);
    const generation = ++this.managedRefreshGeneration;
    this.managedRequestedProfileId = null;
    this.managedDetailRequestCancel.next();
    this.managedDetailGeneration++;
    this.managedSelectedId.set(null);
    this.managedDetail.set(null);
    this.managedDetailLoading.set(false);
    this.managedDetailError.set(null);
    this.managedProfileMissing.set(false);
    this.managedSummariesRequest = undefined;
    this.managedSummaries.set([]);
    this.managedSummariesLoading.set(true);
    this.managedSummariesLoaded.set(false);
    this.managedSummariesError.set(null);

    const request = this.profileService.listForMember(memberId).pipe(shareReplay(1));
    this.managedSummariesRequest = request;
    return request.pipe(
      tap({
        next: (summaries) => {
          if (!this.isCurrentManagedSummaryRefresh(memberId, generation, request)) return;

          this.managedSummaries.set(summaries);
          this.managedSummariesLoading.set(false);
          this.managedSummariesLoaded.set(true);
          const first = summaries[0] ? String(summaries[0].id) : null;
          this.managedRequestedProfileId = first;
          this.managedSelectedId.set(first);
          this.managedProfileMissing.set(false);
          if (first) this.requestManagedDetail(first);
        },
        error: (error) => {
          if (!this.isCurrentManagedSummaryRefresh(memberId, generation, request)) return;
          this.managedSummariesLoading.set(false);
          this.managedSummariesLoaded.set(false);
          this.managedSummariesError.set(error);
          this.managedSummariesRequest = undefined;
        },
      }),
      filter(() => this.isCurrentManagedSummaryRefresh(memberId, generation, request)),
      map((summaries) => summaries[0] ?? null),
    );
  }

  private isCurrentManagedRefresh(memberId: string, profileId: string, generation: number): boolean {
    return this.managedRefreshGeneration === generation
      && String(this.managedMember()?.id) === memberId
      && this.managedSelectedId() === profileId;
  }

  private isCurrentManagedSummaryRefresh(memberId: string, generation: number, request: Observable<ProfileSummary[]>): boolean {
    return this.managedRefreshGeneration === generation
      && this.managedSummariesRequest === request
      && String(this.managedMember()?.id) === memberId;
  }

  private reset(): void {
    this.invalidateSummaries();
    this.beginSelection(null);
    this.clearManagedContext();
  }

  isNotFound(error: unknown): boolean {
    return error instanceof HttpErrorResponse && error.status === 404 && error.error?.errorCode === 'PROFILE_NOT_FOUND';
  }
}
