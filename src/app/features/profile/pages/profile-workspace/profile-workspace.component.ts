import { HttpErrorResponse } from '@angular/common/http';
import { Component, effect, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ApiErrorResponse } from '../../../../core/http/api.models';
import { ProfileDetail, UpdateProfileRequest } from '../../models/profile.models';
import { ProfileContextService } from '../../services/profile-context.service';
import { ProfileEditSessionService } from '../../services/profile-edit-session.service';
import { ProfileService } from '../../services/profile.service';

type EditableAboutMeField = Exclude<keyof UpdateProfileRequest, 'profileName' | 'version'>;

@Component({
  selector: 'app-profile-workspace',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './profile-workspace.component.html',
  styleUrl: './profile-workspace.component.scss',
})
export class ProfileWorkspaceComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly context = inject(ProfileContextService);
  readonly editSession = inject(ProfileEditSessionService);

  readonly sections = [
    ['about', 'About Me'],
    ['education', 'Education'],
    ['languages', 'Languages'],
    ['certificates', 'Certificates'],
    ['projects', 'Projects'],
    ['skills', 'Skills'],
  ] as const;
  readonly editForm = this.formBuilder.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    jobTitle: ['', [Validators.required, Validators.maxLength(100)]],
    yearsOfExperience: [0, [Validators.required, Validators.min(0)]],
    personality: ['', [Validators.required, Validators.maxLength(4000)]],
    technicalSummary: ['', [Validators.required, Validators.maxLength(4000)]],
  });

  activeSection = 'about';
  isEditing = false;
  isSubmitting = false;
  isReloading = false;
  isDeleting = false;
  conflict = false;
  cancelConfirmation = false;
  reloadConfirmation = false;
  deleteConfirmation = false;
  deleteTarget: { id: string; name: string } | null = null;
  errorMessage = '';
  saveMessage = '';
  deleteErrorMessage = '';
  previewInvalidated = false;

  constructor() {
    this.context.loadSummaries();
    this.editForm.valueChanges.subscribe(() => this.syncDirtyState());
    this.route.paramMap.subscribe((params) => {
      this.closeEditor();
      this.closeDeleteConfirmation();
      const profileId = params.get('profileId');
      if (profileId) {
        this.context.loadDetail(profileId);
      } else {
        this.context.beginSelection(null);
      }
    });
    effect(() => {
      const summaries = this.context.summaries();
      if (!this.context.summariesLoading() && !this.context.summariesError() && !this.context.selectedId() && summaries.length) {
        void this.router.navigate(['/profiles', summaries[0].id]);
      }
    });
  }

  selectProfile(profileId: number | string): void {
    void this.router.navigate(['/profiles', profileId]);
  }

  openDeleteConfirmation(): void {
    if (this.isDeleting || this.context.summaries().length <= 1) return;
    const profileId = this.context.selectedId();
    const profile = this.context.detail();
    if (!profileId || !profile || String(profile.id) !== profileId) return;

    this.syncDirtyState();
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
    if (!this.deleteConfirmation || !target || this.isDeleting) return;
    if (this.context.selectedId() !== target.id || String(this.context.detail()?.id) !== target.id) {
      this.closeDeleteConfirmation();
      return;
    }

    this.isDeleting = true;
    this.deleteErrorMessage = '';
    this.profileService.delete(target.id).subscribe({
      next: () => this.finishDelete(),
      error: (error: unknown) => {
        if (this.context.isNotFound(error)) {
          this.finishDelete();
          return;
        }
        this.isDeleting = false;
        this.deleteErrorMessage = this.apiError(error)?.message?.trim() || 'Unable to delete this Profile right now. Your current Profile and changes are still here.';
      },
    });
  }

  scrollToSection(sectionId: string): void {
    this.activeSection = sectionId;
    document.getElementById(`workspace-section-${sectionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  profileName(): string {
    return this.context.detail()?.profileName ?? this.selectedSummary()?.profileName ?? 'Profile Workspace';
  }

  selectedSummary() {
    return this.context.summaries().find((summary) => String(summary.id) === this.context.selectedId()) ?? null;
  }

  startEditing(): void {
    const profile = this.context.detail();
    if (!profile || this.conflict) return;
    this.editForm.reset(this.formValues(profile));
    this.editForm.markAsPristine();
    this.editForm.markAsUntouched();
    this.isEditing = true;
    this.cancelConfirmation = false;
    this.errorMessage = '';
    this.saveMessage = '';
    this.previewInvalidated = false;
    this.syncDirtyState();
  }

  cancelEditing(): void {
    if (!this.isEditing || this.isSubmitting) return;
    if (this.editForm.dirty) {
      this.cancelConfirmation = true;
      return;
    }
    this.closeEditor();
  }

  keepEditing(): void {
    this.cancelConfirmation = false;
    this.reloadConfirmation = false;
  }

  discardEditing(): void {
    this.cancelConfirmation = false;
    this.closeEditor();
  }

  submit(): void {
    this.errorMessage = '';
    this.saveMessage = '';
    if (this.isSubmitting || this.conflict) return;

    this.clearBackendErrors();
    this.trimFormValues();
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      this.syncDirtyState();
      return;
    }

    const profile = this.context.detail();
    const profileId = this.context.selectedId();
    if (!profile || !profileId) return;

    const value = this.editForm.getRawValue();
    const update: UpdateProfileRequest = {
      profileName: profile.profileName,
      firstName: value.firstName,
      lastName: value.lastName,
      jobTitle: value.jobTitle,
      yearsOfExperience: value.yearsOfExperience,
      personality: value.personality,
      technicalSummary: value.technicalSummary,
      version: profile.version,
    };

    this.isSubmitting = true;
    this.profileService.update(profileId, update).subscribe({
      next: (updated) => {
        this.context.replaceDetail(updated);
        this.isSubmitting = false;
        this.conflict = false;
        this.previewInvalidated = !updated.hasPreviewed;
        this.saveMessage = this.previewInvalidated
          ? 'About Me saved. Preview is no longer current; generate a new preview before exporting.'
          : 'About Me saved.';
        this.closeEditor();
      },
      error: (error: unknown) => this.handleSaveError(error),
    });
  }

  reloadLatest(): void {
    if (this.isReloading || !this.conflict) return;
    if (this.editForm.dirty) {
      this.reloadConfirmation = true;
      return;
    }
    this.fetchLatest();
  }

  confirmReloadLatest(): void {
    this.reloadConfirmation = false;
    this.fetchLatest();
  }

  fieldError(field: EditableAboutMeField): string {
    const errors = this.editForm.controls[field].errors;
    if (!errors) return '';
    if (errors['backend']) return errors['backend'];
    if (errors['required']) return 'This field is required.';
    if (errors['maxlength']) return `Use ${errors['maxlength'].requiredLength} characters or fewer.`;
    if (errors['min']) return 'Enter a non-negative number.';
    return 'This value is not valid.';
  }

  discardPendingNavigation(): void {
    this.closeEditor();
    this.editSession.resolveNavigation(true);
  }

  keepPendingNavigation(): void {
    this.editSession.resolveNavigation(false);
  }

  private fetchLatest(): void {
    const profileId = this.context.selectedId();
    if (!profileId) return;

    const current = this.context.detail();
    if (current) this.editForm.reset(this.formValues(current));
    this.editForm.markAsPristine();
    this.editForm.markAsUntouched();
    this.isEditing = false;
    this.isReloading = true;
    this.isSubmitting = false;
    this.errorMessage = '';
    this.saveMessage = '';
    this.editSession.setDirty(false);

    this.context.reloadDetail(profileId).subscribe({
      next: (latest) => {
        this.editForm.reset(this.formValues(latest));
        this.editForm.markAsPristine();
        this.editForm.markAsUntouched();
        this.isReloading = false;
        this.conflict = false;
        this.saveMessage = 'Latest Profile data loaded. Review it before editing.';
      },
      error: (error: unknown) => {
        this.isReloading = false;
        this.conflict = true;
        this.errorMessage = this.apiError(error)?.message?.trim() || 'Unable to reload the latest Profile right now. Please try again.';
      },
    });
  }

  private closeEditor(): void {
    this.isEditing = false;
    this.isSubmitting = false;
    this.cancelConfirmation = false;
    this.reloadConfirmation = false;
    this.conflict = false;
    this.editSession.setDirty(false);
    const profile = this.context.detail();
    if (profile) {
      this.editForm.reset(this.formValues(profile));
      this.editForm.markAsPristine();
      this.editForm.markAsUntouched();
    }
  }

  private closeDeleteConfirmation(): void {
    this.deleteConfirmation = false;
    this.deleteTarget = null;
    this.deleteErrorMessage = '';
  }

  private finishDelete(): void {
    this.closeEditor();
    this.closeDeleteConfirmation();
    this.isDeleting = false;

    this.context.refreshSummariesAndSelectFirst().subscribe({
      next: (first) => void this.router.navigate(first ? ['/profiles', first.id] : ['/profiles']),
      error: () => void this.router.navigate(['/profiles']),
    });
  }

  private handleSaveError(error: unknown): void {
    this.isSubmitting = false;
    const response = this.apiError(error);
    if (response?.errorCode === 'PROFILE_VERSION_CONFLICT') {
      this.conflict = true;
      this.errorMessage = response.message?.trim() || 'This Profile changed elsewhere. Reload the latest version before saving again.';
      this.syncDirtyState();
      return;
    }
    if (response?.errorCode === 'VALIDATION_ERROR') {
      this.applyFieldErrors(response.data);
      this.errorMessage = 'Please correct the highlighted fields.';
      this.syncDirtyState();
      return;
    }
    this.errorMessage = response?.message?.trim() || 'Unable to save this Profile right now. Your changes are still here.';
    this.syncDirtyState();
  }

  private trimFormValues(): void {
    const value = this.editForm.getRawValue();
    this.editForm.patchValue({
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      jobTitle: value.jobTitle.trim(),
      personality: value.personality.trim(),
      technicalSummary: value.technicalSummary.trim(),
    }, { emitEvent: false });
    this.editForm.updateValueAndValidity({ emitEvent: false });
  }

  private applyFieldErrors(data: unknown): void {
    const errors = (data as { errors?: unknown } | undefined)?.errors;
    if (!Array.isArray(errors)) return;
    for (const error of errors) {
      if (!error || typeof error !== 'object') continue;
      const { field, message } = error as { field?: unknown; message?: unknown };
      if (typeof field === 'string' && typeof message === 'string' && field in this.editForm.controls) {
        this.setBackendFieldError(field as EditableAboutMeField, message);
      }
    }
  }

  private clearBackendErrors(): void {
    for (const control of Object.values(this.editForm.controls)) {
      if (!control.errors?.['backend']) continue;
      const errors = { ...control.errors };
      delete errors['backend'];
      control.setErrors(Object.keys(errors).length ? errors : null);
    }
  }

  private setBackendFieldError(field: EditableAboutMeField, message: string): void {
    const control = this.editForm.controls[field];
    control.setErrors({ ...control.errors, backend: message.trim() || 'This value is not valid.' });
    control.markAsTouched();
  }

  private formValues(profile: ProfileDetail) {
    return {
      firstName: profile.firstName,
      lastName: profile.lastName,
      jobTitle: profile.jobTitle,
      yearsOfExperience: profile.yearsOfExperience,
      personality: profile.personality ?? '',
      technicalSummary: profile.technicalSummary ?? '',
    };
  }

  private apiError(error: unknown): ApiErrorResponse | undefined {
    return error instanceof HttpErrorResponse ? error.error as ApiErrorResponse : undefined;
  }

  private syncDirtyState(): void {
    this.editSession.setDirty(this.isEditing && this.editForm.dirty);
  }
}
