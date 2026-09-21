import { HttpErrorResponse } from '@angular/common/http';
import { Component, effect, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ApiErrorResponse } from '../../../../core/http/api.models';
import { ProfileContextService } from '../../services/profile-context.service';
import { ProfileEditSessionService } from '../../services/profile-edit-session.service';
import { ProfileService } from '../../services/profile.service';
import { AboutMeSectionComponent } from './sections/about-me-section/about-me-section.component';
import { CertificateSectionComponent } from './sections/certificate-section/certificate-section.component';
import { EducationSectionComponent } from './sections/education-section/education-section.component';
import { LanguageSectionComponent } from './sections/language-section/language-section.component';
import { ProfileWorkspaceSection, ProjectNavigationRequest } from './sections/profile-section-events';
import { ProjectsSectionComponent } from './sections/projects-section/projects-section.component';
import { SkillSectionComponent } from './sections/skill-section/skill-section.component';

@Component({
  selector: 'app-profile-workspace',
  standalone: true,
  imports: [AboutMeSectionComponent, CertificateSectionComponent, EducationSectionComponent, LanguageSectionComponent, ProjectsSectionComponent, SkillSectionComponent],
  templateUrl: './profile-workspace.component.html',
  styleUrl: './profile-workspace.component.scss',
})
export class ProfileWorkspaceComponent {
  private readonly profileService = inject(ProfileService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly context = inject(ProfileContextService);
  readonly editSession = inject(ProfileEditSessionService);

  readonly sections: ReadonlyArray<readonly [ProfileWorkspaceSection, string]> = [
    ['about', 'About Me'],
    ['education', 'Education'],
    ['languages', 'Languages'],
    ['certificates', 'Certificates'],
    ['projects', 'Projects'],
    ['skills', 'Skills'],
  ] as const;

  activeSection: ProfileWorkspaceSection = 'about';
  mutationOwner: ProfileWorkspaceSection | null = null;
  isDeleting = false;
  deleteConfirmation = false;
  deleteTarget: { id: string; name: string } | null = null;
  deleteErrorMessage = '';

  private notFoundRecoveryInProgress = false;
  private lastNotFoundProfileId: string | null = null;
  private activeProfileId: string | null = null;
  private profileDeleteGeneration = 0;

  constructor() {
    this.context.loadSummaries();
    this.route.paramMap.subscribe((params) => {
      this.profileDeleteGeneration++;
      this.isDeleting = false;
      this.mutationOwner = null;
      this.closeDeleteConfirmation();
      this.activeSection = 'about';
      const profileId = params.get('profileId');
      this.activeProfileId = profileId;
      if (profileId) this.context.loadDetail(profileId);
      else this.context.beginSelection(null);
    });
    effect(() => {
      const summaries = this.context.summaries();
      if (!this.context.summariesLoading() && !this.context.summariesError() && !this.context.selectedId() && summaries.length) {
        void this.router.navigate(['/profiles', summaries[0].id]);
      }
    }, { allowSignalWrites: true });
    effect(() => {
      const selectedId = this.context.selectedId();
      const detail = this.context.detail();
      if (detail && String(detail.id) === selectedId) this.lastNotFoundProfileId = null;

      const error = this.context.detailError();
      if (!error || !this.context.isNotFound(error) || this.notFoundRecoveryInProgress) return;
      if (selectedId && this.lastNotFoundProfileId === selectedId) return;

      this.lastNotFoundProfileId = selectedId;
      this.notFoundRecoveryInProgress = true;
      this.context.refreshSummariesAndSelectFirst().subscribe({
        next: (first) => {
          this.notFoundRecoveryInProgress = false;
          void this.router.navigate(first ? ['/profiles', first.id] : ['/profiles']);
        },
        error: () => {
          this.notFoundRecoveryInProgress = false;
          void this.router.navigate(['/profiles']);
        },
      });
    }, { allowSignalWrites: true });
  }

  selectProfile(profileId: number | string): void {
    void this.router.navigate(['/profiles', profileId]);
  }

  openDeleteConfirmation(): void {
    if (!this.canStartWorkspaceMutation() || this.context.summaries().length <= 1) return;
    const profileId = this.context.selectedId();
    const profile = this.context.detail();
    if (!profileId || !profile || String(profile.id) !== profileId) return;

    this.deleteTarget = { id: profileId, name: profile.profileName };
    this.deleteErrorMessage = '';
    this.deleteConfirmation = true;
  }

  cancelDelete(): void {
    if (this.isDeleting) return;
    this.closeDeleteConfirmation();
  }

  confirmDelete(): void {
    const target = this.deleteTarget;
    if (!this.deleteConfirmation || !target || this.isDeleting || this.mutationOwner !== null || this.editSession.dirty()) return;
    if (this.context.selectedId() !== target.id || String(this.context.detail()?.id) !== target.id) {
      this.closeDeleteConfirmation();
      return;
    }

    const operationGeneration = ++this.profileDeleteGeneration;
    this.isDeleting = true;
    this.deleteErrorMessage = '';
    this.profileService.delete(target.id).subscribe({
      next: () => {
        if (!this.isCurrentProfileDeleteResponse(target.id, operationGeneration)) return;
        this.finishDelete(target.id, operationGeneration);
      },
      error: (error: unknown) => {
        if (!this.isCurrentProfileDeleteResponse(target.id, operationGeneration)) return;
        if (this.context.isNotFound(error)) {
          this.finishDelete(target.id, operationGeneration);
          return;
        }
        this.isDeleting = false;
        this.deleteErrorMessage = this.apiError(error)?.message?.trim() || 'Unable to delete this Profile right now. Your current Profile and changes are still here.';
      },
    });
  }

  scrollToSection(sectionId: ProfileWorkspaceSection): void {
    this.activeSection = sectionId;
    document.getElementById(`workspace-section-${sectionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  profileName(): string {
    return this.context.detail()?.profileName ?? this.selectedSummary()?.profileName ?? 'Profile Workspace';
  }

  selectedSummary() {
    return this.context.summaries().find((summary) => String(summary.id) === this.context.selectedId()) ?? null;
  }

  workspaceMutationLocked(): boolean {
    return this.mutationOwner !== null || this.editSession.dirty() || this.isDeleteWorkflowActive();
  }

  canStartWorkspaceMutation(): boolean {
    return !this.workspaceMutationLocked();
  }

  mutationBlockedFor(section: ProfileWorkspaceSection): boolean {
    return this.isDeleteWorkflowActive()
      || (this.mutationOwner !== null && this.mutationOwner !== section)
      || (this.editSession.dirty() && this.mutationOwner !== section);
  }

  mutationInteractionChanged(section: ProfileWorkspaceSection, active: boolean): void {
    if (active && (this.mutationOwner === null || this.mutationOwner === section)) {
      this.mutationOwner = section;
    } else if (this.mutationOwner === section) {
      this.mutationOwner = null;
    }
  }

  projectNavigationRequested(event: ProjectNavigationRequest): void {
    const profileId = this.context.selectedId();
    const profile = this.context.detail();
    if (!profileId || !profile || String(profile.id) !== profileId || !this.canStartWorkspaceMutation()) return;
    void this.router.navigate(event.projectId === null
      ? ['/profiles', profileId, 'projects', 'new']
      : ['/profiles', profileId, 'projects', event.projectId]);
  }

  discardPendingNavigation(): void {
    this.editSession.resolveNavigation(true);
  }

  keepPendingNavigation(): void {
    this.editSession.resolveNavigation(false);
  }

  private closeDeleteConfirmation(): void {
    this.deleteConfirmation = false;
    this.deleteTarget = null;
    this.deleteErrorMessage = '';
  }

  private finishDelete(profileId: string, operationGeneration: number): void {
    this.closeDeleteConfirmation();
    this.isDeleting = false;

    this.context.refreshSummariesAndSelectFirst().subscribe({
      next: (first) => {
        if (!this.isCurrentProfileDeleteFlow(profileId, operationGeneration)) return;
        void this.router.navigate(first ? ['/profiles', first.id] : ['/profiles']);
      },
      error: () => {
        if (!this.isCurrentProfileDeleteFlow(profileId, operationGeneration)) return;
        void this.router.navigate(['/profiles']);
      },
    });
  }

  private isCurrentProfileDeleteResponse(profileId: string, generation: number): boolean {
    return this.isCurrentProfileDeleteFlow(profileId, generation)
      && this.context.selectedId() === profileId
      && String(this.context.detail()?.id) === profileId;
  }

  private isCurrentProfileDeleteFlow(profileId: string, generation: number): boolean {
    return this.activeProfileId === profileId && this.profileDeleteGeneration === generation;
  }

  private isDeleteWorkflowActive(): boolean {
    return this.isDeleting || this.deleteConfirmation;
  }

  private apiError(error: unknown): ApiErrorResponse | undefined {
    return error instanceof HttpErrorResponse ? error.error as ApiErrorResponse : undefined;
  }
}
