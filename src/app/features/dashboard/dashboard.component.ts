import { Component, effect, inject, OnDestroy, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { MemberDashboardStats, DashboardCompletenessSection } from './models/dashboard.models';
import { DashboardService } from './services/dashboard.service';
import { ProfileDetail, ProfileSummary } from '../profile/models/profile.models';
import { ProfileContextService } from '../profile/services/profile-context.service';

type PreviewState = 'loading' | 'valid' | 'required' | 'unavailable';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnDestroy {
  private readonly dashboardService = inject(DashboardService);
  private readonly router = inject(Router);
  readonly context = inject(ProfileContextService);
  readonly user = inject(AuthService).user;
  readonly stats = signal<MemberDashboardStats | null>(null);
  readonly statsLoading = signal(false);
  readonly statsError = signal<unknown | null>(null);

  readonly sectionLabels: Readonly<Record<string, string>> = {
    aboutMe: 'About Me',
    education: 'Education',
    language: 'Languages',
    certificate: 'Certificates',
    project: 'Projects',
    skills: 'Skills',
  };

  private readonly timestampFormatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  });
  private readonly percentageFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  });
  private statsSubscription: Subscription | null = null;
  private statsGeneration = 0;
  private statsProfileId: string | null = null;

  constructor() {
    this.context.loadSummariesAndResolveSelection();
    effect(() => {
      const selectedId = this.context.selectedId();
      if (selectedId !== this.statsProfileId) this.clearStats();
      if (!selectedId || this.context.summariesLoading() || this.context.summariesError()) return;

      this.observeSelectedProfile(selectedId);
    }, { allowSignalWrites: true });
  }

  ngOnDestroy(): void {
    this.statsGeneration++;
    this.statsSubscription?.unsubscribe();
  }

  selectedSummary(): ProfileSummary | null {
    const selectedId = this.context.selectedId();
    return this.context.summaries().find((summary) => String(summary.id) === selectedId) ?? null;
  }

  selectedProfile(): ProfileSummary | MemberDashboardStats['selectedProfile'] | null {
    return this.stats()?.selectedProfile ?? this.selectedSummary();
  }

  selectedDetail(): ProfileDetail | null {
    const selectedId = this.context.selectedId();
    const detail = this.context.detail();
    return selectedId && detail && String(detail.id) === selectedId ? detail : null;
  }

  formatPercentage(value: number | null | undefined): string {
    return value === null || value === undefined || !Number.isFinite(value) ? '—' : `${this.percentageFormatter.format(value)}%`;
  }

  formatTimestamp(value: string | null | undefined): string {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : this.timestampFormatter.format(date);
  }

  formatLatestExport(value: string | null | undefined): string {
    return value ? this.formatTimestamp(value) : 'Never exported';
  }

  profileIdentity(profile: ProfileSummary | MemberDashboardStats['selectedProfile']): string {
    const identity = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
    return identity ? `${identity} · ${profile.jobTitle}` : profile.jobTitle;
  }

  sectionLabel(section: DashboardCompletenessSection): string {
    return this.sectionLabels[section.key] ?? section.key;
  }

  sectionPercentage(section: DashboardCompletenessSection): number {
    if (section.validFieldCount !== undefined && section.fieldCount !== undefined) {
      return section.fieldCount > 0 ? (section.validFieldCount / section.fieldCount) * section.weight : 0;
    }
    if (section.hasQualifyingRecord !== undefined) return section.hasQualifyingRecord ? section.weight : 0;
    return section.completed ? section.weight : 0;
  }

  formatSectionPercentage(section: DashboardCompletenessSection): string {
    return `${this.percentageFormatter.format(this.sectionPercentage(section))}%`;
  }

  sectionCount(section: DashboardCompletenessSection): string | null {
    if (section.validFieldCount !== undefined && section.fieldCount !== undefined) {
      return `${section.validFieldCount} / ${section.fieldCount} fields`;
    }
    if (section.validFieldCount !== undefined) return `${section.validFieldCount} valid fields`;
    if (section.fieldCount !== undefined) return `${section.fieldCount} fields`;
    if (section.hasQualifyingRecord !== undefined) {
      return section.hasQualifyingRecord ? 'Qualifying record present' : 'No qualifying record';
    }
    return null;
  }

  previewState(): PreviewState {
    if (this.context.detailLoading() || (!this.selectedDetail() && !this.context.detailError())) return 'loading';
    if (this.context.detailError() || !this.selectedDetail()) return 'unavailable';
    return this.selectedDetail()?.hasPreviewed ? 'valid' : 'required';
  }

  previewStateLabel(): string {
    switch (this.previewState()) {
      case 'valid': return 'Preview valid';
      case 'required': return 'Preview required';
      case 'unavailable': return 'Preview unavailable';
      default: return 'Loading Preview';
    }
  }

  selectProfile(profileId: number | string): void {
    this.context.beginSelection(String(profileId));
  }

  isSelectedProfile(profileId: number | string): boolean {
    return this.context.selectedId() === String(profileId);
  }

  retryProfiles(): void {
    this.context.loadSummariesAndResolveSelection();
  }

  retryStats(): void {
    const selectedId = this.context.selectedId();
    if (!selectedId || this.statsLoading()) return;
    this.loadStats(selectedId);
  }

  createProfile(): void {
    void this.router.navigate(['/profiles/new']);
  }

  openWorkspace(): void {
    const selectedId = this.context.selectedId();
    if (selectedId) void this.router.navigate(['/profiles', selectedId]);
  }

  openPreview(): void {
    const selectedId = this.context.selectedId();
    if (selectedId) void this.router.navigate(['/profiles', selectedId, 'preview']);
  }

  private observeSelectedProfile(profileId: string): void {
    if (this.statsProfileId !== profileId) this.loadStats(profileId);

    const detail = this.context.detail();
    if (detail && String(detail.id) === profileId) return;
    if (this.context.detailLoading() || this.context.detailError()) return;
    this.context.loadDetail(profileId);
  }

  private loadStats(profileId: string): void {
    const generation = ++this.statsGeneration;
    this.statsSubscription?.unsubscribe();
    this.statsProfileId = profileId;
    this.stats.set(null);
    this.statsError.set(null);
    this.statsLoading.set(true);

    this.statsSubscription = this.dashboardService.getMemberStats(profileId).subscribe({
      next: (stats) => {
        if (!this.isCurrentStatsRequest(profileId, generation)) return;
        if (!stats?.selectedProfile || String(stats.selectedProfile.id) !== profileId) {
          this.statsLoading.set(false);
          this.statsError.set(new Error('Dashboard statistics did not match the selected Profile.'));
          return;
        }
        this.stats.set(stats);
        this.statsLoading.set(false);
        this.statsError.set(null);
      },
      error: (error: unknown) => {
        if (!this.isCurrentStatsRequest(profileId, generation)) return;
        this.statsLoading.set(false);
        this.statsError.set(error);
      },
    });
  }

  private isCurrentStatsRequest(profileId: string, generation: number): boolean {
    return this.statsGeneration === generation
      && this.statsProfileId === profileId
      && this.context.selectedId() === profileId;
  }

  private clearStats(): void {
    if (this.statsProfileId === null && !this.stats() && !this.statsLoading() && !this.statsError()) return;
    this.statsGeneration++;
    this.statsSubscription?.unsubscribe();
    this.statsSubscription = null;
    this.statsProfileId = null;
    this.stats.set(null);
    this.statsLoading.set(false);
    this.statsError.set(null);
  }
}
