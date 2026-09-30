import { Component, ElementRef, effect, inject, OnDestroy, signal, ViewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { ProfileSummary } from '../../models/profile.models';
import { ProfileContextService } from '../../services/profile-context.service';
import { ProfileService } from '../../services/profile.service';
import { PdfDocumentRenderer, PdfRenderHandle } from '../cv-preview/pdf-document-renderer.service';
import { WorkspaceModalDirective } from '../profile-workspace/sections/workspace-modal.directive';

type PreviewReadiness = 'checking' | 'ready' | 'required' | 'unavailable';
type ProfileViewMode = 'grid' | 'list';

@Component({
  selector: 'app-cv-management',
  standalone: true,
  imports: [DatePipe, WorkspaceModalDirective],
  templateUrl: './cv-management.component.html',
  styleUrl: './cv-management.component.scss',
})
export class CvManagementComponent implements OnDestroy {
  private readonly profileService = inject(ProfileService);
  private readonly router = inject(Router);
  private readonly pdfRenderer = inject(PdfDocumentRenderer);
  readonly context = inject(ProfileContextService);

  searchTerm = '';
  sortOrder: 'recent' | 'name' = 'recent';
  viewMode: ProfileViewMode = 'grid';
  quickPreviewProfile: ProfileSummary | null = null;
  quickPreviewLoading = false;
  quickPreviewError = '';
  quickPreviewBlob: Blob | null = null;
  quickPreviewRendered = false;

  private previewGeneration = 0;
  private quickPreviewSubscription: Subscription | null = null;
  private quickPreviewPagesElement: HTMLElement | null = null;
  private quickPreviewResizeObserver: ResizeObserver | null = null;
  private pdfRenderHandle: PdfRenderHandle | null = null;
  private readonly previewReadiness = signal(new Map<string, PreviewReadiness>());
  private readonly previewReadinessSubscriptions = new Map<string, Subscription>();

  @ViewChild('quickPreviewPages')
  set quickPreviewPages(reference: ElementRef<HTMLDivElement> | undefined) {
    const element = reference?.nativeElement ?? null;
    if (element === this.quickPreviewPagesElement) return;

    this.cleanupPdfRendering();
    this.quickPreviewPagesElement = element;
    this.quickPreviewRendered = false;
    if (element && this.quickPreviewBlob) this.renderQuickPreview(this.quickPreviewBlob, element);
  }

  constructor() {
    this.context.clearManagedContext();
    this.context.loadSummaries();

    effect(() => {
      const profiles = this.context.summaries();
      const loading = this.context.summariesLoading();
      const error = this.context.summariesError();
      if (loading || error) return;
      this.loadPreviewReadiness(profiles);
    }, { allowSignalWrites: true });
  }

  ngOnDestroy(): void {
    this.previewGeneration++;
    this.quickPreviewSubscription?.unsubscribe();
    this.previewReadinessSubscriptions.forEach((subscription) => subscription.unsubscribe());
    this.previewReadinessSubscriptions.clear();
    this.cleanupPdfRendering();
  }

  visibleProfiles(): ProfileSummary[] {
    const query = this.searchTerm.trim().toLocaleLowerCase();
    const profiles = this.context.summaries().filter((profile) => {
      if (!query) return true;
      return [profile.profileName, profile.firstName, profile.lastName, profile.jobTitle]
        .some((value) => value?.toLocaleLowerCase().includes(query));
    });

    return profiles.sort((first, second) => this.sortOrder === 'name'
      ? first.profileName.localeCompare(second.profileName, undefined, { sensitivity: 'base' })
      : this.timestamp(second.updatedAt) - this.timestamp(first.updatedAt));
  }

  updateSearch(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement).value;
  }

  updateSort(event: Event): void {
    this.sortOrder = (event.target as HTMLSelectElement).value === 'name' ? 'name' : 'recent';
  }

  setViewMode(mode: ProfileViewMode): void {
    this.viewMode = mode;
  }

  retryProfiles(): void {
    if (this.context.summariesLoading()) return;
    this.clearPreviewReadiness();
    this.context.invalidateSummaries();
    this.context.loadSummaries();
  }

  createProfile(): void {
    void this.router.navigate(['/profiles/new']);
  }

  openProfile(profile: ProfileSummary): void {
    void this.router.navigate(['/profiles', profile.id]);
  }

  openPreviewForProfile(profile: ProfileSummary): void {
    const readiness = this.previewReadinessFor(profile);
    if (readiness === 'checking') return;
    if (readiness === 'ready') {
      this.openQuickPreview(profile);
      return;
    }
    this.openFullPreview(profile);
  }

  openQuickPreview(profile: ProfileSummary): void {
    if (this.previewReadinessFor(profile) !== 'ready') {
      this.openFullPreview(profile);
      return;
    }

    this.closeQuickPreview();
    this.quickPreviewProfile = profile;
    this.quickPreviewLoading = true;
    this.quickPreviewError = '';

    const generation = ++this.previewGeneration;
    this.quickPreviewSubscription = this.profileService.preview(String(profile.id)).subscribe({
      next: (blob) => {
        if (!this.isCurrentPreview(generation)) return;
        this.quickPreviewSubscription = null;
        this.quickPreviewLoading = false;
        this.quickPreviewBlob = blob;
      },
      error: () => {
        if (!this.isCurrentPreview(generation)) return;
        this.quickPreviewSubscription = null;
        this.quickPreviewLoading = false;
        this.quickPreviewError = 'A current PDF is not available yet. Open the full preview to generate one for this CV.';
      },
    });
  }

  closeQuickPreview(): void {
    this.previewGeneration++;
    this.quickPreviewSubscription?.unsubscribe();
    this.quickPreviewSubscription = null;
    this.cleanupPdfRendering();
    this.quickPreviewPagesElement = null;
    this.quickPreviewProfile = null;
    this.quickPreviewLoading = false;
    this.quickPreviewError = '';
    this.quickPreviewBlob = null;
    this.quickPreviewRendered = false;
  }

  openFullPreview(profile: ProfileSummary): void {
    this.closeQuickPreview();
    void this.router.navigate(['/profiles', profile.id, 'preview']);
  }

  profileInitials(profile: ProfileSummary): string {
    return `${profile.firstName?.trim().charAt(0) ?? ''}${profile.lastName?.trim().charAt(0) ?? ''}`.toUpperCase() || 'CV';
  }

  completeness(profile: ProfileSummary): number | null {
    if (profile.completeness === undefined || !Number.isFinite(profile.completeness)) return null;
    return Math.min(100, Math.max(0, profile.completeness));
  }

  previewReadinessFor(profile: ProfileSummary): PreviewReadiness {
    return this.previewReadiness().get(String(profile.id)) ?? 'checking';
  }

  private renderQuickPreview(blob: Blob, element: HTMLElement): void {
    this.quickPreviewRendered = false;
    const handle = this.pdfRenderer.render(blob, element, element.clientWidth, {
      rendered: () => {
        if (this.quickPreviewBlob === blob && this.quickPreviewPagesElement === element) {
          this.quickPreviewRendered = true;
        }
      },
      failed: () => {
        if (this.quickPreviewBlob !== blob || this.quickPreviewPagesElement !== element) return;
        this.quickPreviewError = 'This PDF could not be displayed. Open the full preview to try again.';
        this.quickPreviewBlob = null;
        this.cleanupPdfRendering();
      },
    });
    this.pdfRenderHandle = handle;

    if (typeof ResizeObserver !== 'undefined') {
      this.quickPreviewResizeObserver = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect.width ?? element.clientWidth;
        if (width > 0) handle.resize(width);
      });
      this.quickPreviewResizeObserver.observe(element);
    }
  }

  private cleanupPdfRendering(): void {
    this.quickPreviewResizeObserver?.disconnect();
    this.quickPreviewResizeObserver = null;
    this.pdfRenderHandle?.destroy();
    this.pdfRenderHandle = null;
  }

  private loadPreviewReadiness(profiles: ProfileSummary[]): void {
    const currentIds = new Set(profiles.map((profile) => String(profile.id)));
    for (const profileId of this.previewReadiness().keys()) {
      if (currentIds.has(profileId)) continue;
      this.previewReadinessSubscriptions.get(profileId)?.unsubscribe();
      this.previewReadinessSubscriptions.delete(profileId);
      this.updatePreviewReadiness(profileId, null);
    }

    for (const profile of profiles) {
      const profileId = String(profile.id);
      if (this.previewReadiness().has(profileId)) continue;
      this.updatePreviewReadiness(profileId, 'checking');

      const subscription = this.profileService.get(profileId).subscribe({
        next: (detail) => {
          this.previewReadinessSubscriptions.delete(profileId);
          if (!this.context.summaries().some((item) => String(item.id) === profileId)) return;
          this.updatePreviewReadiness(profileId, detail.hasPreviewed ? 'ready' : 'required');
        },
        error: () => {
          this.previewReadinessSubscriptions.delete(profileId);
          if (!this.context.summaries().some((item) => String(item.id) === profileId)) return;
          this.updatePreviewReadiness(profileId, 'unavailable');
        },
      });
      if (!subscription.closed) this.previewReadinessSubscriptions.set(profileId, subscription);
    }
  }

  private clearPreviewReadiness(): void {
    this.previewReadinessSubscriptions.forEach((subscription) => subscription.unsubscribe());
    this.previewReadinessSubscriptions.clear();
    this.previewReadiness.set(new Map());
  }

  private updatePreviewReadiness(profileId: string, readiness: PreviewReadiness | null): void {
    this.previewReadiness.update((current) => {
      const updated = new Map(current);
      if (readiness === null) updated.delete(profileId);
      else updated.set(profileId, readiness);
      return updated;
    });
  }

  private isCurrentPreview(generation: number): boolean {
    return this.previewGeneration === generation && this.quickPreviewProfile !== null;
  }

  private timestamp(value: string): number {
    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }
}
