import { HttpErrorResponse } from '@angular/common/http';
import { Component, effect, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ApiErrorResponse } from '../../../../core/http/api.models';
import { ManagedMemberContext, ProfileDetail, ProfileSummary } from '../../models/profile.models';
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
  private activeMemberId: string | null = null;
  private profileDeleteGeneration = 0;
  isManagedContext = false;

  constructor() {
    this.route.paramMap.subscribe((params) => {
      this.profileDeleteGeneration++;
      this.isDeleting = false;
      this.mutationOwner = null;
      this.closeDeleteConfirmation();
      this.activeSection = 'about';
      const profileId = params.get('profileId');
      const memberId = params.get('memberId');
      this.activeMemberId = memberId;
      this.activeProfileId = profileId;
      this.isManagedContext = memberId !== null;
      if (memberId) {
        this.context.loadManagedMember(this.managedMemberState(memberId), profileId);
      } else {
        this.context.clearManagedContext();
        this.context.loadSummaries();
        if (profileId) this.context.loadDetail(profileId);
        else this.context.beginSelection(null);
      }
    });
    effect(() => {
      if (this.isManagedContext) {
        const member = this.context.managedMember();
        const summaries = this.context.managedSummaries();
        if (!member || String(member.id) !== String(this.activeMemberId) || this.context.managedSummariesLoading() || this.context.managedSummariesError()) return;
        if (!this.activeProfileId && summaries.length && this.context.managedSelectedId()) {
          void this.router.navigate(['/members', member.id, 'profiles', this.context.managedSelectedId()]);
        }
        return;
      }

      const summaries = this.context.summaries();
      if (!this.context.summariesLoading() && !this.context.summariesError() && !this.context.selectedId() && summaries.length) {
        void this.router.navigate(['/profiles', summaries[0].id]);
      }
    }, { allowSignalWrites: true });
    effect(() => {
      const selectedId = this.context.selectedId();
      const detail = this.context.detail();
      if (detail && String(detail.id) === selectedId) this.lastNotFoundProfileId = null;

      if (this.isManagedContext) return;

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
    const commands = this.profileRoute(profileId);
    if (!this.editSession.dirty()) {
      void this.router.navigate(commands);
      return;
    }
    this.editSession.requestNavigation(this.profileRouteUrl(commands)).then((allow) => {
      if (allow) void this.router.navigate(commands);
    });
  }

  openPreview(): void {
    const profileId = this.workspaceSelectedId();
    const profile = this.workspaceDetail();
    if (!profileId || !profile || String(profile.id) !== profileId) return;
    void this.router.navigate(this.isManagedContext && this.activeMemberId
      ? ['/members', this.activeMemberId, 'profiles', profileId, 'preview']
      : ['/profiles', profileId, 'preview']);
  }

  openDeleteConfirmation(): void {
    if (this.isManagedContext) return;
    if (!this.canStartWorkspaceMutation() || this.context.summaries().length <= 1) return;
    const profileId = this.context.selectedId();
    const profile = this.workspaceDetail();
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
    return this.workspaceDetail()?.profileName ?? this.selectedSummary()?.profileName ?? 'Profile Workspace';
  }

  workspaceSummaries(): ProfileSummary[] {
    return this.isManagedContext ? this.context.managedSummaries() : this.context.summaries();
  }

  workspaceSummariesLoading(): boolean {
    return this.isManagedContext ? this.context.managedSummariesLoading() : this.context.summariesLoading();
  }

  workspaceSummariesError(): unknown | null {
    return this.isManagedContext ? this.context.managedSummariesError() : this.context.summariesError();
  }

  workspaceSelectedId(): string | null {
    return this.isManagedContext ? this.context.managedSelectedId() : this.context.selectedId();
  }

  workspaceDetail(): ProfileDetail | null {
    return this.isManagedContext ? this.context.managedDetail() : this.context.detail();
  }

  workspaceDetailLoading(): boolean {
    return this.isManagedContext ? this.context.managedDetailLoading() : this.context.detailLoading();
  }

  workspaceDetailError(): unknown | null {
    return this.isManagedContext ? this.context.managedDetailError() : this.context.detailError();
  }

  managedMemberLabel(): string {
    const member = this.context.managedMember();
    return member?.username?.trim() || member?.email?.trim() || (member ? `Member ${member.id}` : 'Managed Member');
  }

  retryWorkspace(): void {
    if (this.isManagedContext) {
      if (this.context.managedDetailError() && this.activeProfileId && !this.context.managedProfileMissing()) {
        this.context.selectManagedProfile(this.activeProfileId);
      } else {
        this.context.retryManagedMember();
      }
      return;
    }
    this.context.loadSummaries();
  }

  selectedSummary(): ProfileSummary | null {
    return this.workspaceSummaries().find((summary) => String(summary.id) === this.workspaceSelectedId()) ?? null;
  }

  workspaceMutationLocked(): boolean {
    return this.mutationOwner !== null || this.editSession.dirty() || this.isDeleteWorkflowActive();
  }

  canStartWorkspaceMutation(): boolean {
    return !this.workspaceMutationLocked();
  }

  mutationBlockedFor(section: ProfileWorkspaceSection): boolean {
    return this.isManagedContext
      || this.isDeleteWorkflowActive()
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
    if (this.isManagedContext) return;
    const profileId = this.context.selectedId();
    const profile = this.workspaceDetail();
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

  private profileRoute(profileId: number | string): (number | string)[] {
    return this.isManagedContext && this.activeMemberId
      ? ['/members', this.activeMemberId, 'profiles', profileId]
      : ['/profiles', profileId];
  }

  private profileRouteUrl(commands: (number | string)[]): string {
    return `/${commands.map((command) => encodeURIComponent(String(command))).join('/')}`;
  }

  private managedMemberState(memberId: string): ManagedMemberContext {
    const state = typeof history !== 'undefined' ? history.state?.managedMember : null;
    if (!state || String(state.id) !== memberId) return { id: memberId };
    return { id: memberId, username: state.username, email: state.email };
  }

  private apiError(error: unknown): ApiErrorResponse | undefined {
    return error instanceof HttpErrorResponse ? error.error as ApiErrorResponse : undefined;
  }
}
