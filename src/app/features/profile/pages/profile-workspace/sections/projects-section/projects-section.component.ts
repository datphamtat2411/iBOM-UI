import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, inject } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

import { ApiErrorResponse } from '../../../../../../core/http/api.models';
import { NotificationService } from '../../../../../../core/notifications/notification.service';
import { ProfileDetail, Project } from '../../../../models/profile.models';
import { ProfileContextService } from '../../../../services/profile-context.service';
import { ProfileService } from '../../../../services/profile.service';
import { ProjectNavigationRequest } from '../profile-section-events';

@Component({
  selector: 'app-projects-section',
  standalone: true,
  templateUrl: './projects-section.component.html',
  styleUrl: './projects-section.component.scss',
})
export class ProjectsSectionComponent implements OnChanges, OnDestroy {
  private readonly profileService = inject(ProfileService);
  private readonly notifications = inject(NotificationService);
  readonly context = inject(ProfileContextService);

  @Input({ required: true }) profile!: ProfileDetail;
  @Input() mutationBlocked = false;
  @Output() readonly interactionActiveChange = new EventEmitter<boolean>();
  @Output() readonly navigationRequested = new EventEmitter<ProjectNavigationRequest>();

  projects: Project[] = [];
  projectLoading = false;
  projectError: unknown | null = null;
  projectMessage = '';
  isProjectDeleting = false;
  projectDeleteConfirmation = false;
  projectDeleteTarget: Project | null = null;
  projectDeleteErrorMessage = '';
  isReloading = false;

  private readonly listCancel = new Subject<void>();
  private activeProfileId: string | null = null;
  private activeMemberId: string | null = null;
  private listGeneration = 0;
  private mutationGeneration = 0;
  private deleteRecoveryGeneration = 0;
  private deleteConflict = false;
  private readonly expandedProjectIds = new Set<string>();
  private interactionActive = false;

  ngOnChanges(changes: SimpleChanges): void {
    const profileChange = changes['profile'];
    if (!profileChange || !this.profile) return;
    const nextProfileId = String(this.profile.id);
    if (profileChange.firstChange || this.activeProfileId !== nextProfileId || this.activeMemberId !== this.currentMemberId()) this.resetForProfile();
  }

  ngOnDestroy(): void {
    this.listCancel.next();
    this.listCancel.complete();
    this.setInteractionActive(false);
  }

  resetForProfile(): void {
    this.listCancel.next();
    this.listGeneration++;
    this.mutationGeneration++;
    this.deleteRecoveryGeneration++;
    this.activeProfileId = this.profile ? String(this.profile.id) : null;
    this.activeMemberId = this.currentMemberId();
    this.projects = [];
    this.expandedProjectIds.clear();
    this.projectLoading = false;
    this.projectError = null;
    this.projectMessage = '';
    this.isReloading = false;
    this.closeProjectDeleteConfirmation();
    if (this.activeProfileId) this.loadProjects(this.activeProfileId);
  }

  retryProjects(): void {
    if (this.activeProfileId) this.loadProjects(this.activeProfileId);
  }

  requestProjectCreate(): void {
    this.requestProjectNavigation(null);
  }

  requestProjectEdit(project: Project): void {
    this.requestProjectNavigation(project.id);
  }

  isProjectExpanded(project: Project): boolean {
    return this.expandedProjectIds.has(String(project.id));
  }

  toggleProjectDetails(project: Project): void {
    const projectId = String(project.id);
    if (this.expandedProjectIds.has(projectId)) {
      this.expandedProjectIds.delete(projectId);
    } else if (this.projects.some((item) => String(item.id) === projectId)) {
      this.expandedProjectIds.add(projectId);
    }
  }

  projectDateRange(project: Project): string {
    const start = project.startDate ? this.formatProjectDate(project.startDate) : 'Date not set';
    const end = project.status === 'ONGOING' || !project.endDate ? 'Present' : this.formatProjectDate(project.endDate);
    return `${start} – ${end}`;
  }

  projectRecordLabel(project: Project): string {
    return `${project.name} (${project.position})`;
  }

  openProjectDeleteConfirmation(project: Project): void {
    if (this.mutationBlocked || !this.isCurrentProjectRecord(project)) return;
    this.projectDeleteTarget = project;
    this.projectDeleteErrorMessage = '';
    this.projectDeleteConfirmation = true;
    this.syncInteraction();
  }

  cancelProjectDelete(): void {
    if (this.isProjectDeleting) return;
    this.closeProjectDeleteConfirmation();
  }

  confirmProjectDelete(): void {
    const target = this.projectDeleteTarget;
    const profileId = this.selectedProfileId();
    const profile = this.selectedProfile();
    if (!this.projectDeleteConfirmation || !target || this.isProjectDeleting || this.deleteConflict || !profileId || !profile) return;
    if (String(profile.id) !== profileId || !this.isCurrentProjectRecord(target)) {
      this.closeProjectDeleteConfirmation();
      return;
    }

    const operationGeneration = ++this.mutationGeneration;
    this.isProjectDeleting = true;
    this.projectDeleteErrorMessage = '';
    this.syncInteraction();
    this.profileService.deleteProject(profileId, target.id, profile.version).subscribe({
      next: (result) => {
        if (!this.isCurrentProjectOperation(profileId, operationGeneration)) return;
        if (!this.context.applyMutationVersion(profileId, result.profileVersion)) {
          this.isProjectDeleting = false;
          this.syncInteraction();
          return;
        }
        this.refreshManagedProfile(profileId);

        this.isProjectDeleting = false;
        this.expandedProjectIds.delete(String(target.id));
        this.closeProjectDeleteConfirmation();
        this.projectMessage = 'Project deleted successfully.';
        this.notifications.showSuccess(this.projectMessage);
        this.loadProjects(profileId);
      },
      error: (error: unknown) => {
        if (!this.isCurrentProjectOperation(profileId, operationGeneration)) return;
        this.isProjectDeleting = false;
        if (this.isProfileVersionConflict(error)) {
          this.deleteConflict = true;
          this.projectDeleteErrorMessage = this.deleteConflictMessage();
          this.deleteRecoveryGeneration++;
          this.syncInteraction();
          return;
        }
        this.projectDeleteErrorMessage = this.apiError(error)?.message?.trim() || 'Unable to delete this Project right now. The record is still here and you can retry.';
        this.syncInteraction();
      },
    });
  }

  reloadLatest(): void {
    if (!this.deleteConflict || this.isReloading) return;
    this.fetchLatestDeleteConflict();
  }

  hasDeleteConflict(): boolean {
    return this.deleteConflict;
  }

  private requestProjectNavigation(projectId: number | string | null): void {
    if (this.mutationBlocked || !this.profile) return;
    const profileId = this.selectedProfileId();
    const currentProfile = this.selectedProfile();
    if (!profileId || !currentProfile || String(currentProfile.id) !== profileId || this.activeProfileId !== profileId) return;
    if (projectId !== null && !this.projects.some((project) => String(project.id) === String(projectId))) return;
    this.navigationRequested.emit({ projectId });
  }

  private loadProjects(profileId: string, onLoaded?: () => void, onError?: () => void): void {
    this.listCancel.next();
    const generation = ++this.listGeneration;
    this.projects = [];
    this.projectLoading = true;
    this.projectError = null;
    this.profileService.listProjects(profileId).pipe(takeUntil(this.listCancel)).subscribe({
      next: (projects) => {
        if (!this.isCurrentProjectProfile(profileId, generation)) return;
        this.projects = projects;
        for (const projectId of this.expandedProjectIds) {
          if (!projects.some((project) => String(project.id) === projectId)) this.expandedProjectIds.delete(projectId);
        }
        this.projectLoading = false;
        onLoaded?.();
      },
      error: (error: unknown) => {
        if (!this.isCurrentProjectProfile(profileId, generation)) return;
        this.projectError = error;
        this.projectLoading = false;
        onError?.();
      },
    });
  }

  private fetchLatestDeleteConflict(): void {
    const profileId = this.selectedProfileId();
    if (!profileId || !this.deleteConflict) return;

    const recoveryGeneration = ++this.deleteRecoveryGeneration;
    this.isReloading = true;
    this.projectDeleteErrorMessage = '';
    this.syncInteraction();
    this.context.reloadDetail(profileId).subscribe({
      next: () => {
        if (!this.isCurrentDeleteRecovery(profileId, recoveryGeneration)) return;
        this.loadProjects(profileId, () => this.completeDeleteRecovery(profileId, recoveryGeneration), () => this.failDeleteRecovery(profileId, recoveryGeneration));
      },
      error: (error: unknown) => {
        if (!this.isCurrentDeleteRecovery(profileId, recoveryGeneration)) return;
        this.isReloading = false;
        this.projectDeleteErrorMessage = `Latest Profile data could not be loaded. ${this.apiError(error)?.message?.trim() || 'Please try Reload Latest again.'}`;
        this.syncInteraction();
      },
    });
  }

  private completeDeleteRecovery(profileId: string, recoveryGeneration: number): void {
    if (!this.isCurrentDeleteRecovery(profileId, recoveryGeneration)) return;
    this.isReloading = false;
    const target = this.projectDeleteTarget;
    const current = target && this.projects.find((project) => String(project.id) === String(target.id));
    if (!current) {
      this.deleteConflict = false;
      this.closeProjectDeleteConfirmation();
      this.projectMessage = 'Latest Profile and Project data loaded. The record is no longer available.';
      return;
    }
    this.projectDeleteTarget = current;
    this.deleteConflict = false;
    this.projectDeleteErrorMessage = '';
    this.projectMessage = 'Latest Profile and Project data loaded. Confirm the deletion again if it is still wanted.';
    this.syncInteraction();
  }

  private failDeleteRecovery(profileId: string, recoveryGeneration: number): void {
    if (!this.isCurrentDeleteRecovery(profileId, recoveryGeneration)) return;
    this.isReloading = false;
    this.projectDeleteErrorMessage = 'Latest Project data could not be loaded. Please try Reload Latest again.';
    this.syncInteraction();
  }

  private closeProjectDeleteConfirmation(): void {
    this.projectDeleteConfirmation = false;
    this.deleteConflict = false;
    this.projectDeleteTarget = null;
    this.projectDeleteErrorMessage = '';
    this.isProjectDeleting = false;
    this.syncInteraction();
  }

  private isCurrentProjectRecord(project: Project): boolean {
    return this.projects.some((item) => String(item.id) === String(project.id));
  }

  private isCurrentProjectProfile(profileId: string, generation: number): boolean {
    return this.activeProfileId === profileId
      && this.listGeneration === generation
      && this.isCurrentProfileContext(profileId);
  }

  private isCurrentProjectOperation(profileId: string, generation: number): boolean {
    return this.activeProfileId === profileId
      && this.isCurrentProfileContext(profileId)
      && this.mutationGeneration === generation;
  }

  private isCurrentProfileContext(profileId: string): boolean {
    return this.activeMemberId === this.currentMemberId()
      && this.selectedProfileId() === profileId
      && String(this.selectedProfile()?.id) === profileId;
  }

  private isCurrentDeleteRecovery(profileId: string, generation: number): boolean {
    return this.deleteConflict
      && this.deleteRecoveryGeneration === generation
      && this.isCurrentProjectProfile(profileId, this.listGeneration);
  }

  private formatProjectDate(value: string): string {
    const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
  }

  private syncInteraction(): void {
    this.setInteractionActive(this.projectDeleteConfirmation || this.isProjectDeleting || this.isReloading || this.deleteConflict);
  }

  private setInteractionActive(active: boolean): void {
    if (this.interactionActive === active) return;
    this.interactionActive = active;
    this.interactionActiveChange.emit(active);
  }

  private isProfileVersionConflict(error: unknown): boolean {
    return this.apiError(error)?.errorCode === 'PROFILE_VERSION_CONFLICT';
  }

  private deleteConflictMessage(): string {
    return 'The Profile changed before this Project could be deleted. Reload Latest to refresh the current Project data before deciding again.';
  }

  private apiError(error: unknown): ApiErrorResponse | undefined {
    return error instanceof HttpErrorResponse ? error.error as ApiErrorResponse : undefined;
  }

  private currentMemberId(): string | null {
    const member = this.context.managedMember?.();
    return member ? String(member.id) : null;
  }

  private selectedProfileId(): string | null {
    return this.context.managedMember?.() ? this.context.managedSelectedId() : this.context.selectedId();
  }

  private selectedProfile(): ProfileDetail | null {
    return this.context.managedMember?.() ? this.context.managedDetail() : this.context.detail();
  }

  private refreshManagedProfile(profileId: string): void {
    const refresh$ = this.context.refreshManagedProfile?.(profileId);
    refresh$?.subscribe({ error: () => undefined });
  }
}
