import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Component, effect, inject, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, expand, reduce, Subscription } from 'rxjs';

import { CvExportFormat, FileNameFormat, FileNameFormatPage, ProfileDetail } from '../../models/profile.models';
import { ProfileContextService } from '../../services/profile-context.service';
import { ProfileService } from '../../services/profile.service';

type PreviewState = 'loading' | 'required' | 'generating' | 'valid' | 'failure' | 'unavailable';

interface PendingDocument {
  blob: Blob;
  profileId: string;
  version: number;
  generation: number;
}

interface PendingExport {
  profileId: string;
  version: number;
  hasPreviewed: boolean;
  fileNameFormatId: string | null;
  format: CvExportFormat;
  generation: number;
  detail: ProfileDetail;
}

interface BackendErrorDetails {
  errorCode: string | null;
  message: string | null;
  blobBody?: boolean;
  decoded?: boolean;
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
  fileNameFormats: FileNameFormat[] = [];
  fileNameFormatsLoading = false;
  fileNameFormatsError = '';
  selectedFileNameFormatId: string | null = null;
  exportingFormat: CvExportFormat | null = null;
  exportError = '';
  exportSuccess = '';

  private readonly lastExportedAtFormatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  });

  private readonly routeSubscription: Subscription;
  private fileNameFormatsSubscription: Subscription | null = null;
  private previewSubscription: Subscription | null = null;
  private reconciliationSubscription: Subscription | null = null;
  private exportSubscription: Subscription | null = null;
  private exportReconciliationSubscription: Subscription | null = null;
  private activePreviewGeneration: number | null = null;
  private activeReconciliationGeneration: number | null = null;
  private activeExportGeneration: number | null = null;
  private previewGeneration = 0;
  private exportGeneration = 0;
  private observedProfileVersion: number | null = null;
  private fileNameFormatsLoaded = false;
  private documentObjectUrl: string | null = null;
  private documentProfileId: string | null = null;
  private documentVersion: number | null = null;
  private pendingDocument: PendingDocument | null = null;
  private pendingExport: PendingExport | null = null;

  constructor() {
    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      this.activateProfile(params.get('profileId'));
    });

    effect(() => {
      this.observeProfileContext();
    }, { allowSignalWrites: true });

    this.loadFileNameFormats();
  }

  ngOnDestroy(): void {
    this.routeSubscription.unsubscribe();
    this.fileNameFormatsSubscription?.unsubscribe();
    this.fileNameFormatsSubscription = null;
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

  get canExport(): boolean {
    const detail = this.currentDetail();
    return this.activeExportGeneration === null
      && this.activePreviewGeneration === null
      && this.activeReconciliationGeneration === null
      && this.previewState === 'valid'
      && !!this.documentUrl
      && !!detail
      && detail.hasPreviewed
      && this.documentProfileId === this.activeProfileId
      && this.documentVersion === detail.version
      && this.observedProfileVersion === detail.version;
  }

  get isExporting(): boolean {
    return this.activeExportGeneration !== null;
  }

  selectFileNameFormat(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedFileNameFormatId = value || null;
  }

  formatLastExportedAt(value: string | null | undefined): string | null {
    if (!value) return null;

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : this.lastExportedAtFormatter.format(date);
  }

  exportDocument(format: CvExportFormat): void {
    const detail = this.currentDetail();
    if (!this.canExport || !detail || !this.activeProfileId) return;

    const profileId = this.activeProfileId;
    const pending: PendingExport = {
      profileId,
      version: detail.version,
      hasPreviewed: detail.hasPreviewed,
      fileNameFormatId: this.selectedFileNameFormatId,
      format,
      generation: ++this.exportGeneration,
      detail,
    };
    this.pendingExport = pending;
    this.activeExportGeneration = pending.generation;
    this.exportingFormat = format;
    this.exportError = '';
    this.exportSuccess = '';

    const request = pending.fileNameFormatId === null
      ? this.profileService.download(profileId, format)
      : this.profileService.download(profileId, format, pending.fileNameFormatId);
    this.exportSubscription = request.subscribe({
      next: (response) => this.exportSucceeded(response, pending),
      error: (error: unknown) => this.exportFailed(error, pending),
    });
  }

  returnToProfile(): void {
    if (this.activeProfileId) void this.router.navigate(['/profiles', this.activeProfileId]);
  }

  private activateProfile(profileId: string | null): void {
    this.invalidatePreview('loading');
    this.activeProfileId = profileId;
    this.observedProfileVersion = null;
    this.selectedFileNameFormatId = null;
    this.exportError = '';
    this.exportSuccess = '';

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
        this.exportSuccess = '';
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
    this.exportSuccess = '';
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
        this.previewFailed(error, profileId, capturedVersion, capturedHasPreviewed, generation);
      },
    });
  }

  private previewFailed(error: unknown, profileId: string, capturedVersion: number, capturedHasPreviewed: boolean, generation: number): void {
    const body = error instanceof HttpErrorResponse ? error.error : error;
    if (typeof Blob !== 'undefined' && body instanceof Blob) {
      void this.readBackendError(error).then((details) => {
        this.finishPreviewFailure(error, details, profileId, capturedVersion, capturedHasPreviewed, generation);
      });
      return;
    }

    this.finishPreviewFailure(error, this.backendErrorDetails(error), profileId, capturedVersion, capturedHasPreviewed, generation);
  }

  private finishPreviewFailure(error: unknown, details: BackendErrorDetails, profileId: string, capturedVersion: number, capturedHasPreviewed: boolean, generation: number): void {
    if (!this.isCurrentPreview(profileId, capturedVersion, capturedHasPreviewed, generation)) return;

    this.activePreviewGeneration = null;
    this.previewSubscription = null;
    this.pendingDocument = null;
    this.clearDocument();
    this.setPreviewFailure(error, details);
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
      this.exportSuccess = '';
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

  private setPreviewFailure(error: unknown, details: BackendErrorDetails = this.backendErrorDetails(error)): void {
    if (this.isUnavailableError(error, details)) {
      this.previewState = 'unavailable';
      this.previewError = 'This Profile is not available to your account.';
      this.exportSuccess = '';
      return;
    }

    this.previewState = 'failure';
    this.previewError = this.isVersionConflict(error, details)
      ? 'The Profile changed while Preview was generated. Review the Profile and retry.'
      : 'Preview could not be generated right now. Please retry.';
    this.exportSuccess = '';
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
    this.exportGeneration++;
    this.activePreviewGeneration = null;
    this.activeReconciliationGeneration = null;
    this.previewSubscription?.unsubscribe();
    this.reconciliationSubscription?.unsubscribe();
    this.previewSubscription = null;
    this.reconciliationSubscription = null;
    this.exportSubscription?.unsubscribe();
    this.exportReconciliationSubscription?.unsubscribe();
    this.exportSubscription = null;
    this.exportReconciliationSubscription = null;
    this.activeExportGeneration = null;
    this.pendingExport = null;
    this.exportingFormat = null;
    this.exportSuccess = '';
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

  private loadFileNameFormats(): void {
    if (this.fileNameFormatsLoading || this.fileNameFormatsSubscription || this.fileNameFormatsLoaded) return;

    this.fileNameFormatsLoading = true;
    this.fileNameFormatsError = '';
    this.fileNameFormats = [];

    const request = this.profileService.listFileNameFormats(0, 10).pipe(
      expand((page: FileNameFormatPage) => {
        const nextPage = page.page + 1;
        return nextPage < page.totalPages
          ? this.profileService.listFileNameFormats(nextPage, page.size)
          : EMPTY;
      }, 1),
      reduce((formats, page) => formats.concat(page.content), [] as FileNameFormat[]),
    );
    const subscription = request.subscribe({
      next: (formats) => {
        this.fileNameFormats = formats;
        this.fileNameFormatsLoaded = true;
      },
      error: (error: unknown) => {
        this.fileNameFormats = [];
        this.fileNameFormatsLoading = false;
        this.fileNameFormatsError = this.backendMessage(error) || 'File Name Formats could not be loaded.';
        this.fileNameFormatsSubscription = null;
      },
      complete: () => {
        this.fileNameFormatsLoading = false;
        this.fileNameFormatsSubscription = null;
      },
    });
    this.fileNameFormatsSubscription = subscription.closed ? null : subscription;
  }

  private exportSucceeded(response: HttpResponse<Blob>, pending: PendingExport): void {
    if (!this.isCurrentExportPreview(pending)) return;

    const filename = this.serverFilename(response);
    if (!response.body || !filename) {
      this.finishExportFailure('The backend did not provide a usable export filename. Please retry.');
      return;
    }

    try {
      this.triggerDownload(response.body, filename);
    } catch {
      this.finishExportFailure('The export could not be downloaded. Please retry.');
      return;
    }

    if (!this.isCurrentExportContext(pending)) return;
    this.exportSubscription = null;
    this.exportReconciliationSubscription = this.context.reloadDetail(pending.profileId).subscribe({
      next: (detail) => this.finishExportReconciliation(detail, pending),
      error: (error: unknown) => this.exportReconciliationFailed(error, pending),
    });
  }

  private async exportFailed(error: unknown, pending: PendingExport): Promise<void> {
    if (!this.isCurrentExportContext(pending)) return;

    const details = await this.readBackendError(error);
    if (!this.isCurrentExportContext(pending)) return;

    if (this.isAuthoritativeExportError(details.errorCode)) {
      this.reconcileExportFailure(pending, details);
      return;
    }

    this.finishExportFailure(this.exportErrorMessage(details));
  }

  private reconcileExportFailure(pending: PendingExport, details: BackendErrorDetails): void {
    this.exportSubscription = null;
    if (!this.isCurrentExportContext(pending)) return;

    this.exportReconciliationSubscription = this.context.reloadDetail(pending.profileId).subscribe({
      next: (detail) => this.finishFailedExportReconciliation(detail, pending, details),
      error: (error: unknown) => this.exportReconciliationFailed(error, pending),
    });
  }

  private finishExportReconciliation(detail: ProfileDetail, pending: PendingExport): void {
    if (!this.isCurrentExportContext(pending)) return;

    this.clearExportState();
    if (String(detail.id) !== pending.profileId || detail.version !== pending.version || !detail.hasPreviewed) {
      this.invalidatePreview(String(detail.id) === pending.profileId && detail.hasPreviewed ? 'loading' : 'required');
      return;
    }

    this.observedProfileVersion = detail.version;
    this.previewError = '';
    this.exportError = '';
    this.exportSuccess = `${pending.format.toUpperCase()} export downloaded successfully.`;
    this.previewState = 'valid';
  }

  private finishFailedExportReconciliation(detail: ProfileDetail, pending: PendingExport, details: BackendErrorDetails): void {
    if (!this.isCurrentExportContext(pending)) return;

    this.clearExportState();
    if (String(detail.id) !== pending.profileId || detail.version !== pending.version || !detail.hasPreviewed) {
      this.invalidatePreview(String(detail.id) === pending.profileId && detail.hasPreviewed ? 'loading' : 'required');
      return;
    }

    this.observedProfileVersion = detail.version;
    this.exportError = this.exportErrorMessage(details);
    this.previewState = 'valid';
  }

  private exportReconciliationFailed(error: unknown, pending: PendingExport): void {
    if (!this.isCurrentExportContext(pending)) return;

    const details = this.backendErrorDetails(error);
    this.clearExportState();
    if (this.isAuthoritativeExportError(details.errorCode)) {
      this.invalidateAuthoritativeExportState(error, details.errorCode);
      return;
    }

    this.restoreDetailAfterExportFailure(pending);
    this.exportError = this.exportErrorMessage(details);
  }

  private invalidateAuthoritativeExportState(error: unknown, errorCode: string | null): void {
    if (errorCode === 'PROFILE_NOT_FOUND' || this.isUnavailableError(error)) {
      this.invalidatePreview('unavailable');
      this.previewError = 'This Profile is not available to your account.';
      return;
    }

    if (errorCode === 'CV_PREVIEW_REQUIRED') {
      this.invalidatePreview('required');
      return;
    }

    this.invalidatePreview('failure');
    this.previewError = this.isVersionConflict(error)
      ? 'The Profile changed while the export was prepared. Review the Profile and retry Preview.'
      : 'The export could not be completed. Please retry.';
  }

  private restoreDetailAfterExportFailure(pending: PendingExport): void {
    if (this.activeProfileId !== pending.profileId || this.context.selectedId() !== pending.profileId) return;
    this.context.beginSelection(pending.profileId);
    this.context.replaceDetail(pending.detail);
    this.observedProfileVersion = pending.version;
  }

  private finishExportFailure(message: string): void {
    this.clearExportState();
    this.exportError = message;
  }

  private clearExportState(): void {
    this.exportSubscription?.unsubscribe();
    this.exportReconciliationSubscription?.unsubscribe();
    this.exportSubscription = null;
    this.exportReconciliationSubscription = null;
    this.activeExportGeneration = null;
    this.pendingExport = null;
    this.exportingFormat = null;
    this.exportSuccess = '';
  }

  private isCurrentExportContext(pending: PendingExport): boolean {
    return this.activeExportGeneration === pending.generation
      && this.pendingExport === pending
      && this.activeProfileId === pending.profileId
      && this.context.selectedId() === pending.profileId;
  }

  private isCurrentExportPreview(pending: PendingExport): boolean {
    const detail = this.currentDetail();
    return this.isCurrentExportContext(pending)
      && this.previewState === 'valid'
      && !!detail
      && detail.version === pending.version
      && detail.hasPreviewed === pending.hasPreviewed
      && this.documentProfileId === pending.profileId
      && this.documentVersion === pending.version
      && this.observedProfileVersion === pending.version;
  }

  private serverFilename(response: HttpResponse<Blob>): string | null {
    const disposition = response.headers.get('Content-Disposition');
    if (!disposition) return null;

    const encoded = disposition.match(/filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i)?.[1];
    const plain = disposition.match(/filename\s*=\s*([^;]+)/i)?.[1];
    const raw = encoded ?? plain;
    if (!raw) return null;

    let filename = raw.trim().replace(/^"|"$/g, '');
    try {
      filename = decodeURIComponent(filename);
    } catch {
      return null;
    }

    return filename && filename !== '.' && filename !== '..' && !/[\\/\u0000-\u001f\u007f]/.test(filename)
      ? filename
      : null;
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const objectUrl = URL.createObjectURL(blob);
    try {
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.hidden = true;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  private async readBackendError(error: unknown): Promise<BackendErrorDetails> {
    const body = error instanceof HttpErrorResponse ? error.error : error;
    if (typeof Blob !== 'undefined' && body instanceof Blob) {
      try {
        return { ...this.backendErrorDetails(JSON.parse(await body.text())), blobBody: true, decoded: true };
      } catch {
        return { ...this.backendErrorDetails(error), blobBody: true, decoded: false };
      }
    }
    return this.backendErrorDetails(error);
  }

  private backendErrorDetails(error: unknown): BackendErrorDetails {
    const body = error instanceof HttpErrorResponse ? error.error : error;
    if (body && typeof body === 'object') {
      const candidate = body as { errorCode?: unknown; message?: unknown };
      return {
        errorCode: typeof candidate.errorCode === 'string' ? candidate.errorCode : null,
        message: typeof candidate.message === 'string' ? candidate.message : null,
      };
    }
    return { errorCode: null, message: null };
  }

  private backendMessage(error: unknown): string | null {
    return this.backendErrorDetails(error).message;
  }

  private errorCode(error: unknown): string | null {
    return this.backendErrorDetails(error).errorCode;
  }

  private exportErrorMessage(details: BackendErrorDetails): string {
    if (details.message) return details.message;
    if (details.errorCode === 'FILE_NAME_FORMAT_NOT_FOUND') return 'The selected File Name Format is no longer available. Choose Automatic or another format.';
    if (details.errorCode === 'FILE_NAME_FORMAT_INVALID' || details.errorCode === 'FILE_NAME_VALUE_INVALID') return 'The selected File Name Format is invalid. Choose Automatic or another format.';
    if (details.errorCode === 'CV_EXPORT_FORMAT_INVALID') return 'This export format is not available for the current Profile.';
    if (details.errorCode === 'CV_PREVIEW_REQUIRED') return 'Generate a current Preview before exporting this Profile.';
    if (details.errorCode === 'PROFILE_VERSION_CONFLICT') return 'The Profile changed while the export was prepared. Review the Profile and retry Preview.';
    return 'The export could not be completed. Please retry.';
  }

  private isAuthoritativeExportError(errorCode: string | null): boolean {
    return errorCode === 'CV_PREVIEW_REQUIRED'
      || errorCode === 'PROFILE_VERSION_CONFLICT'
      || errorCode === 'PROFILE_NOT_FOUND';
  }

  isUnavailableError(error: unknown, details?: BackendErrorDetails): boolean {
    if (details?.blobBody) return details.decoded === true && details.errorCode === 'PROFILE_NOT_FOUND';
    return this.context.isNotFound(error)
      || (error instanceof HttpErrorResponse && error.status === 404 && (details?.errorCode ?? this.errorCode(error)) === 'PROFILE_NOT_FOUND');
  }

  private isVersionConflict(error: unknown, details?: BackendErrorDetails): boolean {
    if (!(error instanceof HttpErrorResponse)) return false;
    if (details?.blobBody) return details.decoded === true && details.errorCode === 'PROFILE_VERSION_CONFLICT';
    return error.status === 409 || (details?.errorCode ?? error.error?.errorCode) === 'PROFILE_VERSION_CONFLICT';
  }
}
