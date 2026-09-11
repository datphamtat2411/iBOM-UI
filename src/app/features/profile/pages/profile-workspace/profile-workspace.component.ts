import { HttpErrorResponse } from '@angular/common/http';
import { Component, effect, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { ApiErrorResponse } from '../../../../core/http/api.models';
import {
  Education,
  EducationRequest,
  EducationStatus,
  ProfileDetail,
  UpdateProfileRequest,
} from '../../models/profile.models';
import { ProfileContextService } from '../../services/profile-context.service';
import { ProfileEditSessionService } from '../../services/profile-edit-session.service';
import { ProfileService } from '../../services/profile.service';

type EditableAboutMeField = Exclude<keyof UpdateProfileRequest, 'profileName' | 'version'>;
type EditableAboutMeValues = Pick<UpdateProfileRequest, EditableAboutMeField>;
type EducationEditorMode = 'create' | 'edit' | null;
type EditableEducationField = keyof EditableEducationValues;
type EditableEducationValues = {
  schoolName: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
  status: EducationStatus;
};

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
    personality: ['', [Validators.maxLength(4000)]],
    technicalSummary: ['', [Validators.maxLength(4000)]],
  });
  readonly educationForm = this.formBuilder.nonNullable.group({
    schoolName: ['', [Validators.required, Validators.maxLength(255)]],
    degree: ['', [Validators.required, Validators.maxLength(255)]],
    fieldOfStudy: ['', [Validators.maxLength(255)]],
    startDate: ['', [Validators.required]],
    endDate: [''],
    status: this.formBuilder.nonNullable.control<EducationStatus>('ONGOING', [Validators.required]),
  }, { validators: this.educationDateRangeValidator() });

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
  private notFoundRecoveryInProgress = false;
  private lastNotFoundProfileId: string | null = null;
  private originalAboutMeValues: EditableAboutMeValues | null = null;
  errorMessage = '';
  saveMessage = '';
  deleteErrorMessage = '';
  previewInvalidated = false;
  educations: Education[] = [];
  educationLoading = false;
  educationError: unknown | null = null;
  educationEditorMode: EducationEditorMode = null;
  educationConflict = false;
  isEducationSubmitting = false;
  educationErrorMessage = '';
  educationMessage = '';
  isEducationDeleting = false;
  educationDeleteConfirmation = false;
  educationDeleteTarget: Education | null = null;
  educationDeleteErrorMessage = '';
  private readonly educationListCancel = new Subject<void>();
  private educationListGeneration = 0;
  private educationMutationGeneration = 0;
  private activeProfileId: string | null = null;
  private editingEducationId: number | string | null = null;
  private originalEducationValues: EditableEducationValues | null = null;

  constructor() {
    this.context.loadSummaries();
    this.editForm.valueChanges.subscribe(() => this.syncDirtyState());
    this.educationForm.valueChanges.subscribe(() => this.syncDirtyState());
    this.educationForm.controls.status.valueChanges.subscribe(() => this.updateEducationDateValidation());
    this.route.paramMap.subscribe((params) => {
      this.closeEditor();
      this.closeDeleteConfirmation();
      this.closeEducationDeleteConfirmation();
      this.resetEducationState();
      const profileId = params.get('profileId');
      this.activeProfileId = profileId;
      if (profileId) {
        this.context.loadDetail(profileId);
        this.loadEducations(profileId);
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

  retryEducations(): void {
    const profileId = this.activeProfileId ?? this.context.selectedId();
    if (profileId) this.loadEducations(profileId);
  }

  openEducationDeleteConfirmation(education: Education): void {
    if (this.isEducationDeleting || this.educationEditorMode) return;
    const profileId = this.context.selectedId();
    const profile = this.context.detail();
    if (!profileId || !profile || String(profile.id) !== profileId) return;

    this.educationDeleteTarget = education;
    this.educationDeleteErrorMessage = '';
    this.educationDeleteConfirmation = true;
  }

  cancelEducationDelete(): void {
    if (this.isEducationDeleting) return;
    this.closeEducationDeleteConfirmation();
  }

  confirmEducationDelete(): void {
    const target = this.educationDeleteTarget;
    const profileId = this.context.selectedId();
    const profile = this.context.detail();
    if (!this.educationDeleteConfirmation || !target || this.isEducationDeleting || !profileId || !profile) return;
    if (String(profile.id) !== profileId) {
      this.closeEducationDeleteConfirmation();
      return;
    }

    const operationGeneration = ++this.educationMutationGeneration;
    this.isEducationDeleting = true;
    this.educationDeleteErrorMessage = '';
    this.profileService.deleteEducation(profileId, target.id, profile.version).subscribe({
      next: (result) => {
        if (!this.isCurrentEducationOperation(profileId, operationGeneration, false)) return;
        if (!this.context.applyMutationVersion(profileId, result.profileVersion)) return;

        this.educations = this.educations.filter((education) => String(education.id) !== String(target.id));
        this.isEducationDeleting = false;
        this.previewInvalidated = true;
        this.educationMessage = 'Education deleted. Preview is no longer current; generate a new preview before exporting.';
        this.closeEducationDeleteConfirmation();
      },
      error: (error: unknown) => {
        if (!this.isCurrentEducationOperation(profileId, operationGeneration, false)) return;
        this.isEducationDeleting = false;
        this.educationDeleteErrorMessage = this.apiError(error)?.message?.trim() || 'Unable to delete this Education right now. The record is still here and you can retry.';
      },
    });
  }

  startEditing(): void {
    const profile = this.context.detail();
    if (!profile || this.conflict || this.educationEditorMode) return;
    const values = this.formValues(profile);
    this.originalAboutMeValues = this.normalizeAboutMeValues(values);
    this.editForm.reset(values);
    this.editForm.markAsPristine();
    this.editForm.markAsUntouched();
    this.isEditing = true;
    this.cancelConfirmation = false;
    this.errorMessage = '';
    this.saveMessage = '';
    this.syncDirtyState();
  }

  startEducationCreate(): void {
    this.openEducationEditor();
  }

  startEducationEdit(education: Education): void {
    this.openEducationEditor(education);
  }

  cancelEditing(): void {
    if (this.educationEditorMode) {
      if (this.isEducationSubmitting) return;
      if (this.educationForm.dirty) {
        this.cancelConfirmation = true;
        return;
      }
      this.closeEducationEditor();
      return;
    }
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
    if (this.educationEditorMode) {
      this.closeEducationEditor();
      return;
    }
    this.closeEditor();
  }

  submit(): void {
    this.errorMessage = '';
    this.saveMessage = '';
    if (this.isSubmitting || this.conflict) return;

    this.clearBackendErrors();
    this.trimFormValues();
    if (!this.hasAboutMeChanges()) return;
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

  submitEducation(): void {
    const mode = this.educationEditorMode;
    if (!mode || this.isEducationSubmitting || this.educationConflict) return;

    this.educationErrorMessage = '';
    this.educationMessage = '';
    this.clearEducationBackendErrors();
    this.trimEducationFormValues();
    this.updateEducationDateValidation();
    if (!this.hasEducationChanges()) return;
    if (this.educationForm.invalid) {
      this.educationForm.markAllAsTouched();
      this.syncDirtyState();
      return;
    }

    const profile = this.context.detail();
    const profileId = this.context.selectedId();
    if (!profile || !profileId || String(profile.id) !== profileId) return;

    const value = this.educationForm.getRawValue();
    const request: EducationRequest = {
      schoolName: value.schoolName,
      degree: value.degree,
      fieldOfStudy: value.fieldOfStudy || null,
      startDate: value.startDate,
      endDate: value.status === 'ONGOING' ? null : value.endDate || null,
      status: value.status,
      version: profile.version,
    };
    const educationId = this.editingEducationId;
    const operationGeneration = this.educationMutationGeneration;
    this.isEducationSubmitting = true;
    const request$ = mode === 'edit' && educationId !== null
      ? this.profileService.updateEducation(profileId, educationId, request)
      : this.profileService.createEducation(profileId, request);

    request$.subscribe({
      next: (result) => {
        if (!this.isCurrentEducationOperation(profileId, operationGeneration)) return;
        if (!this.context.applyMutationVersion(profileId, result.profileVersion)) return;

        this.educations = mode === 'edit' && educationId !== null
          ? this.educations.map((education) => String(education.id) === String(educationId) ? result.education : education)
          : this.sortEducations([...this.educations, result.education]);
        this.isEducationSubmitting = false;
        this.educationConflict = false;
        this.previewInvalidated = true;
        this.educationMessage = mode === 'edit'
          ? 'Education updated. Preview is no longer current; generate a new preview before exporting.'
          : 'Education added. Preview is no longer current; generate a new preview before exporting.';
        this.closeEducationEditor();
      },
      error: (error: unknown) => {
        if (!this.isCurrentEducationOperation(profileId, operationGeneration)) return;
        this.handleEducationSaveError(error);
      },
    });
  }

  reloadLatest(): void {
    if (this.educationEditorMode) {
      if (this.isReloading || !this.educationConflict) return;
      if (this.educationForm.dirty) {
        this.reloadConfirmation = true;
        return;
      }
      this.fetchLatestEducation();
      return;
    }
    if (this.isReloading || !this.conflict) return;
    if (this.editForm.dirty) {
      this.reloadConfirmation = true;
      return;
    }
    this.fetchLatest();
  }

  confirmReloadLatest(): void {
    this.reloadConfirmation = false;
    if (this.educationEditorMode) {
      this.fetchLatestEducation();
    } else {
      this.fetchLatest();
    }
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

  educationFieldError(field: EditableEducationField): string {
    const errors = this.educationForm.controls[field].errors;
    if (errors?.['backend']) return errors['backend'];
    if (errors?.['required']) return 'This field is required.';
    if (errors?.['maxlength']) return `Use ${errors['maxlength'].requiredLength} characters or fewer.`;
    if (field === 'endDate' && this.educationForm.errors?.['dateRange']) return 'End date must be on or after the start date.';
    return errors ? 'This value is not valid.' : '';
  }

  educationFieldInvalid(field: EditableEducationField): boolean {
    const control = this.educationForm.controls[field];
    return control.invalid && control.touched || field === 'endDate' && !!this.educationForm.errors?.['dateRange'] && control.touched;
  }

  educationDateLabel(education: Education): string {
    return `${education.startDate} - ${education.endDate ?? 'Present'}`;
  }

  educationRecordLabel(education: Education): string {
    return `${education.degree} at ${education.schoolName}`;
  }

  discardPendingNavigation(): void {
    this.closeEditor();
    this.editSession.resolveNavigation(true);
  }

  keepPendingNavigation(): void {
    this.editSession.resolveNavigation(false);
  }

  private loadEducations(profileId: string): void {
    this.educationListCancel.next();
    const generation = ++this.educationListGeneration;
    this.educations = [];
    this.educationLoading = true;
    this.educationError = null;
    this.profileService.listEducations(profileId).pipe(takeUntil(this.educationListCancel)).subscribe({
      next: (educations) => {
        if (!this.isCurrentEducationProfile(profileId, generation)) return;
        this.educations = educations;
        this.educationLoading = false;
      },
      error: (error: unknown) => {
        if (!this.isCurrentEducationProfile(profileId, generation)) return;
        this.educationError = error;
        this.educationLoading = false;
      },
    });
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

  private fetchLatestEducation(): void {
    const profileId = this.context.selectedId();
    if (!profileId) return;

    this.closeEducationEditor();
    this.isReloading = true;
    this.educationErrorMessage = '';
    this.educationMessage = '';
    this.context.reloadDetail(profileId).subscribe({
      next: () => {
        if (this.context.selectedId() !== profileId) return;
        this.isReloading = false;
        this.educationConflict = false;
        this.educationMessage = 'Latest Profile and Education data loaded. Review it before editing.';
        this.loadEducations(profileId);
      },
      error: (error: unknown) => {
        this.isReloading = false;
        this.educationErrorMessage = this.apiError(error)?.message?.trim() || 'Unable to reload the latest Profile right now. Please try again.';
      },
    });
  }

  private closeEditor(): void {
    this.originalAboutMeValues = null;
    this.isEditing = false;
    this.isSubmitting = false;
    this.cancelConfirmation = false;
    this.reloadConfirmation = false;
    this.conflict = false;
    this.editSession.setDirty(false);
    this.closeEducationEditor();
    const profile = this.context.detail();
    if (profile) {
      this.editForm.reset(this.formValues(profile));
      this.editForm.markAsPristine();
      this.editForm.markAsUntouched();
    }
  }

  private closeEducationEditor(): void {
    this.educationMutationGeneration++;
    this.educationEditorMode = null;
    this.editingEducationId = null;
    this.originalEducationValues = null;
    this.isEducationSubmitting = false;
    this.educationConflict = false;
    this.cancelConfirmation = false;
    this.reloadConfirmation = false;
    this.educationForm.reset(this.emptyEducationValues());
    this.educationForm.markAsPristine();
    this.educationForm.markAsUntouched();
    this.updateEducationDateValidation();
    this.syncDirtyState();
  }

  private closeDeleteConfirmation(): void {
    this.deleteConfirmation = false;
    this.deleteTarget = null;
    this.deleteErrorMessage = '';
  }

  private closeEducationDeleteConfirmation(): void {
    this.educationDeleteConfirmation = false;
    this.educationDeleteTarget = null;
    this.educationDeleteErrorMessage = '';
    this.isEducationDeleting = false;
  }

  private resetEducationState(): void {
    this.educationListCancel.next();
    this.educationListGeneration++;
    this.educationMutationGeneration++;
    this.educations = [];
    this.educationLoading = false;
    this.educationError = null;
    this.educationMessage = '';
    this.educationErrorMessage = '';
    this.previewInvalidated = false;
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

  private openEducationEditor(education?: Education): void {
    const profile = this.context.detail();
    if (!profile || this.isEditing || this.educationEditorMode) return;

    const values = education ? this.educationFormValues(education) : this.emptyEducationValues();
    this.educationEditorMode = education ? 'edit' : 'create';
    this.editingEducationId = education ? education.id : null;
    this.originalEducationValues = this.normalizeEducationValues(values);
    this.educationForm.reset(values);
    this.educationForm.markAsPristine();
    this.educationForm.markAsUntouched();
    this.educationMutationGeneration++;
    this.educationConflict = false;
    this.cancelConfirmation = false;
    this.reloadConfirmation = false;
    this.educationErrorMessage = '';
    this.educationMessage = '';
    this.updateEducationDateValidation();
    this.syncDirtyState();
  }

  private handleEducationSaveError(error: unknown): void {
    this.isEducationSubmitting = false;
    const response = this.apiError(error);
    if (response?.errorCode === 'PROFILE_VERSION_CONFLICT') {
      this.educationConflict = true;
      this.educationErrorMessage = response.message?.trim() || 'This Profile changed elsewhere. Reload the latest version before saving again.';
      this.syncDirtyState();
      return;
    }
    if (response?.errorCode === 'VALIDATION_ERROR') {
      this.applyEducationFieldErrors(response.data);
      this.educationErrorMessage = 'Please correct the highlighted fields.';
      this.syncDirtyState();
      return;
    }

    const businessField: Record<string, EditableEducationField> = {
      EDUCATION_INVALID_STATUS: 'status',
      EDUCATION_END_DATE_REQUIRED: 'endDate',
      EDUCATION_DATE_RANGE_INVALID: 'endDate',
    };
    const field = response?.errorCode ? businessField[response.errorCode] : undefined;
    if (field) this.setEducationFieldError(field, response?.message || 'This value is not valid.');
    this.educationErrorMessage = response?.message?.trim() || 'Unable to save this Education right now. Your changes are still here.';
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

  private trimEducationFormValues(): void {
    const value = this.educationForm.getRawValue();
    this.educationForm.patchValue({
      schoolName: value.schoolName.trim(),
      degree: value.degree.trim(),
      fieldOfStudy: value.fieldOfStudy.trim(),
      startDate: value.startDate.trim(),
      endDate: value.endDate.trim(),
    }, { emitEvent: false });
    this.educationForm.updateValueAndValidity({ emitEvent: false });
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

  private applyEducationFieldErrors(data: unknown): void {
    const errors = (data as { errors?: unknown } | undefined)?.errors;
    if (!Array.isArray(errors)) return;
    for (const error of errors) {
      if (!error || typeof error !== 'object') continue;
      const { field, message } = error as { field?: unknown; message?: unknown };
      const normalizedField = typeof field === 'string' ? field.split('.').pop() : undefined;
      if (normalizedField && typeof message === 'string' && normalizedField in this.educationForm.controls) {
        this.setEducationFieldError(normalizedField as EditableEducationField, message);
      }
    }
  }

  private clearEducationBackendErrors(): void {
    for (const control of Object.values(this.educationForm.controls)) {
      if (!control.errors?.['backend']) continue;
      const errors = { ...control.errors };
      delete errors['backend'];
      control.setErrors(Object.keys(errors).length ? errors : null);
    }
  }

  private setEducationFieldError(field: EditableEducationField, message: string): void {
    const control = this.educationForm.controls[field];
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

  private emptyEducationValues(): EditableEducationValues {
    return { schoolName: '', degree: '', fieldOfStudy: '', startDate: '', endDate: '', status: 'ONGOING' };
  }

  private educationFormValues(education: Education): EditableEducationValues {
    return {
      schoolName: education.schoolName,
      degree: education.degree,
      fieldOfStudy: education.fieldOfStudy ?? '',
      startDate: education.startDate,
      endDate: education.endDate ?? '',
      status: education.status,
    };
  }

  private educationDateRangeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value as Partial<EditableEducationValues> | null;
      if (value?.status === 'COMPLETED' && value.startDate && value.endDate && value.startDate > value.endDate) {
        return { dateRange: true };
      }
      return null;
    };
  }

  private updateEducationDateValidation(): void {
    const endDate = this.educationForm.controls.endDate;
    endDate.setValidators(this.educationForm.controls.status.value === 'COMPLETED' ? [Validators.required] : []);
    endDate.updateValueAndValidity({ emitEvent: false });
    this.educationForm.updateValueAndValidity({ emitEvent: false });
  }

  private normalizeEducationValues(value: EditableEducationValues): EditableEducationValues {
    return {
      schoolName: value.schoolName.trim(),
      degree: value.degree.trim(),
      fieldOfStudy: value.fieldOfStudy.trim(),
      startDate: value.startDate.trim(),
      endDate: value.endDate.trim(),
      status: value.status,
    };
  }

  hasEducationChanges(): boolean {
    const original = this.originalEducationValues;
    if (!original) return false;
    const current = this.normalizeEducationValues(this.educationForm.getRawValue());
    return current.schoolName !== original.schoolName
      || current.degree !== original.degree
      || current.fieldOfStudy !== original.fieldOfStudy
      || current.startDate !== original.startDate
      || current.endDate !== original.endDate
      || current.status !== original.status;
  }

  private isCurrentEducationProfile(profileId: string, generation: number): boolean {
    return this.activeProfileId === profileId
      && this.educationListGeneration === generation;
  }

  private isCurrentEducationOperation(profileId: string, generation: number, requiresEditor = true): boolean {
    return this.activeProfileId === profileId
      && this.context.selectedId() === profileId
      && String(this.context.detail()?.id) === profileId
      && this.educationMutationGeneration === generation
      && (!requiresEditor || this.educationEditorMode !== null);
  }

  private sortEducations(educations: Education[]): Education[] {
    return educations.sort((left, right) => {
      const leftId = Number(left.id);
      const rightId = Number(right.id);
      if (Number.isFinite(leftId) && Number.isFinite(rightId)) return leftId - rightId;
      return String(left.id).localeCompare(String(right.id));
    });
  }

  hasAboutMeChanges(): boolean {
    const original = this.originalAboutMeValues;
    if (!original) return false;

    const current = this.normalizeAboutMeValues(this.editForm.getRawValue());
    return current.firstName !== original.firstName
      || current.lastName !== original.lastName
      || current.jobTitle !== original.jobTitle
      || current.yearsOfExperience !== original.yearsOfExperience
      || current.personality !== original.personality
      || current.technicalSummary !== original.technicalSummary;
  }

  private normalizeAboutMeValues(value: EditableAboutMeValues): EditableAboutMeValues {
    return {
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      jobTitle: value.jobTitle.trim(),
      yearsOfExperience: value.yearsOfExperience,
      personality: value.personality.trim(),
      technicalSummary: value.technicalSummary.trim(),
    };
  }

  private apiError(error: unknown): ApiErrorResponse | undefined {
    return error instanceof HttpErrorResponse ? error.error as ApiErrorResponse : undefined;
  }

  private syncDirtyState(): void {
    this.editSession.setDirty((this.isEditing && (this.editForm.dirty || this.hasAboutMeChanges()))
      || (this.educationEditorMode !== null && (this.educationForm.dirty || this.hasEducationChanges())));
  }
}
