import { HttpErrorResponse } from '@angular/common/http';
import { Component, effect, inject, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { ProfileDetail } from '../../models/profile.models';
import { ProfileContextService } from '../../services/profile-context.service';
import { ProfileService } from '../../services/profile.service';

type PreviewState = 'loading' | 'required' | 'generating' | 'valid' | 'failure' | 'unavailable';

interface PendingDocument {
  blob: Blob;
  profileId: string;
  version: number;
  generation: number;
}

@Component({
  selector: 'app-cv-preview',
  standalone: true,
  templateUrl: './cv-preview.component.html',
  styleUrl: './cv-preview.component.scss',
})
export class CvPreviewComponent implements OnDestroy {
  private readonly profileService = inject(ProfileService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  readonly context = inject(ProfileContextService);

  activeProfileId: string | null = null;
  previewState: PreviewState = 'loading';
  previewError = '';
  documentUrl: SafeResourceUrl | null = null;

  private readonly routeSubscription: Subscription;
  private previewSubscription: Subscription | null = null;
  private reconciliationSubscription: Subscription | null = null;
  private activePreviewGeneration: number | null = null;
  private activeReconciliationGeneration: number | null = null;
  private previewGeneration = 0;
  private observedProfileVersion: number | null = null;
  private documentObjectUrl: string | null = null;
  private documentProfileId: string | null = null;
  private documentVersion: number | null = null;
  private pendingDocument: PendingDocument | null = null;

  constructor() {
    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      this.activateProfile(params.get('profileId'));
    });

    effect(() => {
      this.observeProfileContext();
    }, { allowSignalWrites: true });
  }

  ngOnDestroy(): void {
    this.routeSubscription.unsubscribe();
    this.invalidatePreview('loading');
  }

  generatePreview(): void {
    const detail = this.currentDetail();
    if (!detail || this.previewState === 'generating') return;
    this.startPreview(detail);
  }

  retryPreview(): void {
    this.generatePreview();
  }

  returnToProfile(): void {
    if (this.activeProfileId) void this.router.navigate(['/profiles', this.activeProfileId]);
  }

  private activateProfile(profileId: string | null): void {
    this.invalidatePreview('loading');
    this.activeProfileId = profileId;
    this.observedProfileVersion = null;

    if (profileId) this.context.loadDetail(profileId);
    else this.context.beginSelection(null);
  }

  private observeProfileContext(): void {
    const profileId = this.activeProfileId;
    const selectedId = this.context.selectedId();
    const detailError = this.context.detailError();
    const detail = this.context.detail();

    if (!profileId) return;

    if (selectedId !== profileId) {
      this.invalidatePreview('loading');
      return;
    }

    if (detailError) {
      const unavailable = this.isUnavailableError(detailError);
      this.invalidatePreview(unavailable ? 'unavailable' : 'failure');
      this.previewError = unavailable
        ? 'This Profile is not available to your account.'
        : 'We could not load this Profile. Please try again later.';
      return;
    }

    if (!detail || String(detail.id) !== profileId) return;

    if (this.observedProfileVersion !== null && this.observedProfileVersion !== detail.version) {
      this.invalidatePreview(detail.hasPreviewed ? 'loading' : 'required');
    }
    this.observedProfileVersion = detail.version;

    if (!detail.hasPreviewed) {
      if (this.activePreviewGeneration !== null || this.activeReconciliationGeneration !== null) {
        this.invalidatePreview('required');
      } else {
        this.clearDocument();
        this.previewState = 'required';
        this.previewError = '';
      }
      return;
    }

    if (this.activePreviewGeneration !== null || this.activeReconciliationGeneration !== null || this.previewState === 'valid') return;
    if (this.previewState === 'failure' || this.previewState === 'unavailable') return;
    this.startPreview(detail);
  }

  private startPreview(detail: ProfileDetail): void {
    const profileId = this.activeProfileId;
    if (!profileId || String(detail.id) !== profileId || this.activePreviewGeneration !== null || this.activeReconciliationGeneration !== null) return;

    const generation = ++this.previewGeneration;
    const capturedVersion = detail.version;
    const capturedHasPreviewed = detail.hasPreviewed;
    this.activePreviewGeneration = generation;
    this.previewState = 'generating';
    this.previewError = '';
    this.clearDocument();

    const request = this.profileService.preview(profileId);
    this.previewSubscription = request.subscribe({
      next: (blob) => {
        if (!this.isCurrentPreview(profileId, capturedVersion, capturedHasPreviewed, generation)) return;

        this.activePreviewGeneration = null;
        this.previewSubscription = null;
        this.pendingDocument = { blob, profileId, version: capturedVersion, generation };
        this.activeReconciliationGeneration = generation;
        this.previewState = 'generating';
        const reconciliation = this.context.reloadDetail(profileId);
        this.reconciliationSubscription = reconciliation.subscribe({
          next: (reconciled) => this.finishReconciliation(reconciled, profileId, capturedVersion, generation),
          error: (error: unknown) => this.reconciliationFailed(error, profileId, generation),
        });
      },
      error: (error: unknown) => {
        if (!this.isCurrentPreview(profileId, capturedVersion, capturedHasPreviewed, generation)) return;
        this.activePreviewGeneration = null;
        this.previewSubscription = null;
        this.pendingDocument = null;
        this.clearDocument();
        this.setPreviewFailure(error);
      },
    });
  }

  private finishReconciliation(detail: ProfileDetail, profileId: string, capturedVersion: number, generation: number): void {
    if (!this.isCurrentReconciliation(profileId, generation)) return;

    this.activeReconciliationGeneration = null;
    this.reconciliationSubscription = null;
    const pending = this.pendingDocument;
    this.pendingDocument = null;

    if (!pending || String(detail.id) !== profileId || detail.version !== capturedVersion || !detail.hasPreviewed) {
      this.clearDocument();
      this.previewState = detail.hasPreviewed ? 'failure' : 'required';
      this.previewError = detail.hasPreviewed
        ? 'The Profile changed while Preview was generated. Please retry Preview.'
        : '';
      return;
    }

    this.observedProfileVersion = detail.version;
    this.previewError = '';
    this.replaceDocument(pending.blob, profileId, capturedVersion);
    this.previewState = 'valid';
  }

  private reconciliationFailed(error: unknown, profileId: string, generation: number): void {
    if (!this.isCurrentReconciliation(profileId, generation)) return;

    this.activeReconciliationGeneration = null;
    this.reconciliationSubscription = null;
    this.pendingDocument = null;
    this.clearDocument();
    this.setPreviewFailure(error);
  }

  private setPreviewFailure(error: unknown): void {
    if (this.isUnavailableError(error)) {
      this.previewState = 'unavailable';
      this.previewError = 'This Profile is not available to your account.';
      return;
    }

    this.previewState = 'failure';
    this.previewError = this.isVersionConflict(error)
      ? 'The Profile changed while Preview was generated. Review the Profile and retry.'
      : 'Preview could not be generated right now. Please retry.';
  }

  private isCurrentPreview(profileId: string, version: number, hasPreviewed: boolean, generation: number): boolean {
    const detail = this.context.detail();
    return this.activePreviewGeneration === generation
      && this.previewGeneration === generation
      && this.activeProfileId === profileId
      && this.context.selectedId() === profileId
      && !!detail
      && String(detail.id) === profileId
      && detail.version === version
      && detail.hasPreviewed === hasPreviewed;
  }

  private isCurrentReconciliation(profileId: string, generation: number): boolean {
    return this.activeReconciliationGeneration === generation
      && this.previewGeneration === generation
      && this.activeProfileId === profileId
      && this.context.selectedId() === profileId;
  }

  private currentDetail(): ProfileDetail | null {
    const detail = this.context.detail();
    return this.activeProfileId && detail && String(detail.id) === this.activeProfileId ? detail : null;
  }

  private invalidatePreview(nextState: PreviewState): void {
    this.previewGeneration++;
    this.activePreviewGeneration = null;
    this.activeReconciliationGeneration = null;
    this.previewSubscription?.unsubscribe();
    this.reconciliationSubscription?.unsubscribe();
    this.previewSubscription = null;
    this.reconciliationSubscription = null;
    this.pendingDocument = null;
    this.clearDocument();
    this.previewState = nextState;
    this.previewError = '';
  }

  private replaceDocument(blob: Blob, profileId: string, version: number): void {
    this.clearDocument();
    this.documentObjectUrl = URL.createObjectURL(blob);
    this.documentUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.documentObjectUrl);
    this.documentProfileId = profileId;
    this.documentVersion = version;
  }

  private clearDocument(): void {
    if (this.documentObjectUrl) URL.revokeObjectURL(this.documentObjectUrl);
    this.documentObjectUrl = null;
    this.documentUrl = null;
    this.documentProfileId = null;
    this.documentVersion = null;
  }

  isUnavailableError(error: unknown): boolean {
    return this.context.isNotFound(error)
      || (error instanceof HttpErrorResponse && error.status === 404);
  }

  private isVersionConflict(error: unknown): boolean {
    return error instanceof HttpErrorResponse
      && (error.status === 409 || error.error?.errorCode === 'PROFILE_VERSION_CONFLICT');
  }
}
