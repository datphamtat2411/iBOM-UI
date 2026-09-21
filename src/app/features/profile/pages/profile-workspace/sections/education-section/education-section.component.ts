import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { ApiErrorResponse } from '../../../../../../core/http/api.models';
import { NotificationService } from '../../../../../../core/notifications/notification.service';
import { Education, EducationRequest, EducationStatus, ProfileDetail } from '../../../../models/profile.models';
import { ProfileContextService } from '../../../../services/profile-context.service';
import { ProfileEditSessionService } from '../../../../services/profile-edit-session.service';
import { ProfileService } from '../../../../services/profile.service';
import { ProfileSectionMutationSuccess } from '../profile-section-events';

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
type MutationPostSaveIntent = 'close' | 'add-another';

@Component({
  selector: 'app-education-section',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './education-section.component.html',
  styleUrl: './education-section.component.scss',
})
export class EducationSectionComponent implements OnChanges, OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly notifications = inject(NotificationService);
  readonly context = inject(ProfileContextService);
  readonly editSession = inject(ProfileEditSessionService);

  @Input({ required: true }) profile!: ProfileDetail;
  @Input() mutationBlocked = false;
  @Output() readonly interactionActiveChange = new EventEmitter<boolean>();
  @Output() readonly mutationSucceeded = new EventEmitter<ProfileSectionMutationSuccess>();

  readonly educationForm = this.formBuilder.nonNullable.group({
    schoolName: ['', [Validators.required, Validators.maxLength(255)]],
    degree: ['', [Validators.required, Validators.maxLength(255)]],
    fieldOfStudy: ['', [Validators.maxLength(255)]],
    startDate: ['', [Validators.required]],
    endDate: [''],
    status: this.formBuilder.nonNullable.control<EducationStatus>('ONGOING', [Validators.required]),
  }, { validators: this.educationDateRangeValidator() });

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
  isReloading = false;
  cancelConfirmation = false;
  reloadConfirmation = false;

  private activeProfileId: string | null = null;
  private editingEducationId: number | string | null = null;
  private originalValues: EditableEducationValues | null = null;
  private readonly listCancel = new Subject<void>();
  private listGeneration = 0;
  private mutationGeneration = 0;
  private deleteRecoveryGeneration = 0;
  private deleteConflict = false;
  private interactionActive = false;

  constructor() {
    this.educationForm.valueChanges.subscribe(() => this.syncDirtyState());
    this.educationForm.controls.status.valueChanges.subscribe(() => this.updateEducationDateValidation());
  }

  ngOnChanges(changes: SimpleChanges): void {
    const profileChange = changes['profile'];
    if (!profileChange || !this.profile) return;
    const nextProfileId = String(this.profile.id);
    if (profileChange.firstChange || this.activeProfileId !== nextProfileId) this.resetForProfile();
  }

  ngOnDestroy(): void {
    this.listCancel.next();
    this.listCancel.complete();
    this.editSession.setDirty(false);
    this.setInteractionActive(false);
  }

  resetForProfile(): void {
    this.listCancel.next();
    this.listGeneration++;
    this.mutationGeneration++;
    this.deleteRecoveryGeneration++;
    this.activeProfileId = this.profile ? String(this.profile.id) : null;
    this.educations = [];
    this.educationLoading = false;
    this.educationError = null;
    this.educationMessage = '';
    this.educationErrorMessage = '';
    this.isReloading = false;
    this.deleteConflict = false;
    this.closeEducationEditor();
    this.closeEducationDeleteConfirmation();
    this.syncDirtyState();
    if (this.activeProfileId) this.loadEducations(this.activeProfileId);
  }

  retryEducations(): void {
    if (this.activeProfileId) this.loadEducations(this.activeProfileId);
  }

  startEducationCreate(): void {
    this.openEducationEditor();
  }

  startEducationEdit(education: Education): void {
    this.openEducationEditor(education);
  }

  cancelEditing(): void {
    if (!this.educationEditorMode || this.isEducationSubmitting) return;
    if (this.educationForm.dirty) {
      this.cancelConfirmation = true;
      this.syncDirtyState();
      return;
    }
    this.closeEducationEditor();
  }

  keepEditing(): void {
    this.cancelConfirmation = false;
    this.reloadConfirmation = false;
    this.syncDirtyState();
  }

  discardEditing(): void {
    this.cancelConfirmation = false;
    this.closeEducationEditor();
  }

  submitEducation(intent: MutationPostSaveIntent = 'close'): void {
    const mode = this.educationEditorMode;
    if (!mode || this.isEducationSubmitting || this.educationConflict) return;
    const addAnother = intent === 'add-another' && mode === 'create';

    this.educationErrorMessage = '';
    this.educationMessage = '';
    this.clearBackendErrors();
    this.trimEducationFormValues();
    this.updateEducationDateValidation();
    if (!this.hasChanges()) return;
    if (this.educationForm.invalid) {
      this.educationForm.markAllAsTouched();
      this.syncDirtyState();
      return;
    }

    const profileId = this.context.selectedId();
    const profile = this.context.detail();
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
    const operationGeneration = this.mutationGeneration;
    this.isEducationSubmitting = true;
    this.syncDirtyState();
    const request$ = mode === 'edit' && educationId !== null
      ? this.profileService.updateEducation(profileId, educationId, request)
      : this.profileService.createEducation(profileId, request);

    request$.subscribe({
      next: (result) => {
        if (!this.isCurrentEducationOperation(profileId, operationGeneration)) return;
        if (!this.context.applyMutationVersion(profileId, result.profileVersion)) {
          this.isEducationSubmitting = false;
          this.syncDirtyState();
          return;
        }

        this.educations = mode === 'edit' && educationId !== null
          ? this.educations.map((education) => String(education.id) === String(educationId) ? result.education : education)
          : this.sortEducations([...this.educations, result.education]);
        this.isEducationSubmitting = false;
        this.educationConflict = false;
        this.educationMessage = mode === 'edit' ? 'Education updated successfully.' : 'Education added successfully.';
        this.notifications.showSuccess(this.educationMessage);
        if (addAnother) this.resetEducationForAnother();
        else this.closeEducationEditor();
        this.mutationSucceeded.emit({ profileId, previewInvalidated: true });
      },
      error: (error: unknown) => {
        if (!this.isCurrentEducationOperation(profileId, operationGeneration)) return;
        this.handleEducationSaveError(error);
      },
    });
  }

  openEducationDeleteConfirmation(education: Education): void {
    if (this.mutationBlocked || !this.isCurrentEducationRecord(education)) return;
    this.educationDeleteTarget = education;
    this.educationDeleteErrorMessage = '';
    this.educationDeleteConfirmation = true;
    this.syncDirtyState();
  }

  cancelEducationDelete(): void {
    if (this.isEducationDeleting) return;
    this.closeEducationDeleteConfirmation();
  }

  confirmEducationDelete(): void {
    const target = this.educationDeleteTarget;
    const profileId = this.context.selectedId();
    const profile = this.context.detail();
    if (!this.educationDeleteConfirmation || !target || this.isEducationDeleting || this.hasDeleteConflict() || this.educationEditorMode || !profileId || !profile) return;
    if (String(profile.id) !== profileId || !this.isCurrentEducationRecord(target)) {
      this.closeEducationDeleteConfirmation();
      return;
    }

    const operationGeneration = ++this.mutationGeneration;
    this.isEducationDeleting = true;
    this.educationDeleteErrorMessage = '';
    this.syncDirtyState();
    this.profileService.deleteEducation(profileId, target.id, profile.version).subscribe({
      next: (result) => {
        if (!this.isCurrentEducationOperation(profileId, operationGeneration, false)) return;
        if (!this.context.applyMutationVersion(profileId, result.profileVersion)) {
          this.isEducationDeleting = false;
          this.syncDirtyState();
          return;
        }

        this.educations = this.educations.filter((education) => String(education.id) !== String(target.id));
        this.isEducationDeleting = false;
        this.educationMessage = 'Education deleted successfully.';
        this.notifications.showSuccess(this.educationMessage);
        this.closeEducationDeleteConfirmation();
        this.mutationSucceeded.emit({ profileId, previewInvalidated: true });
      },
      error: (error: unknown) => {
        if (!this.isCurrentEducationOperation(profileId, operationGeneration, false)) return;
        this.isEducationDeleting = false;
        if (this.isProfileVersionConflict(error)) {
          this.deleteConflict = true;
          this.educationDeleteErrorMessage = this.deleteConflictMessage();
          this.deleteRecoveryGeneration++;
          this.syncDirtyState();
          return;
        }
        this.educationDeleteErrorMessage = this.apiError(error)?.message?.trim() || 'Unable to delete this Education right now. The record is still here and you can retry.';
        this.syncDirtyState();
      },
    });
  }

  reloadLatest(): void {
    if (this.hasDeleteConflict()) {
      if (this.educationEditorMode) {
        this.educationDeleteErrorMessage = 'Finish or discard the active draft before reloading the latest Profile.';
        return;
      }
      if (!this.isReloading) this.fetchLatestDeleteConflict();
      return;
    }
    if (this.isReloading || !this.educationEditorMode || !this.educationConflict) return;
    if (this.educationForm.dirty) {
      this.reloadConfirmation = true;
      this.syncDirtyState();
      return;
    }
    this.fetchLatestEducation();
  }

  confirmReloadLatest(): void {
    this.reloadConfirmation = false;
    if (this.hasDeleteConflict()) this.fetchLatestDeleteConflict();
    else this.fetchLatestEducation();
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

  hasChanges(): boolean {
    const original = this.originalValues;
    if (!original) return false;
    const current = this.normalizeValues(this.educationForm.getRawValue());
    return current.schoolName !== original.schoolName
      || current.degree !== original.degree
      || current.fieldOfStudy !== original.fieldOfStudy
      || current.startDate !== original.startDate
      || current.endDate !== original.endDate
      || current.status !== original.status;
  }

  hasDeleteConflict(): boolean {
    return this.deleteConflict;
  }

  private loadEducations(profileId: string, onLoaded?: () => void, onError?: () => void): void {
    this.listCancel.next();
    const generation = ++this.listGeneration;
    this.educations = [];
    this.educationLoading = true;
    this.educationError = null;
    this.profileService.listEducations(profileId).pipe(takeUntil(this.listCancel)).subscribe({
      next: (educations) => {
        if (!this.isCurrentEducationProfile(profileId, generation)) return;
        this.educations = this.sortEducations(educations);
        this.educationLoading = false;
        onLoaded?.();
      },
      error: (error: unknown) => {
        if (!this.isCurrentEducationProfile(profileId, generation)) return;
        this.educationError = error;
        this.educationLoading = false;
        onError?.();
      },
    });
  }

  private openEducationEditor(education?: Education): void {
    if (!this.profile || this.mutationBlocked) return;
    const values = education ? this.educationFormValues(education) : this.emptyEducationValues();
    this.educationEditorMode = education ? 'edit' : 'create';
    this.editingEducationId = education ? education.id : null;
    this.originalValues = this.normalizeValues(values);
    this.educationForm.reset(values);
    this.educationForm.markAsPristine();
    this.educationForm.markAsUntouched();
    this.mutationGeneration++;
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

  private fetchLatestEducation(): void {
    const profileId = this.context.selectedId();
    if (!profileId) return;

    this.closeEducationEditor();
    this.isReloading = true;
    this.educationErrorMessage = '';
    this.educationMessage = '';
    this.context.reloadDetail(profileId).subscribe({
      next: () => {
        if (!this.isCurrentProfileContext(profileId)) return;
        this.isReloading = false;
        this.educationConflict = false;
        this.educationMessage = 'Latest Profile and Education data loaded. Review it before editing.';
        this.loadEducations(profileId);
      },
      error: (error: unknown) => {
        if (!this.isCurrentProfileContext(profileId)) return;
        this.isReloading = false;
        this.educationErrorMessage = this.apiError(error)?.message?.trim() || 'Unable to reload the latest Profile right now. Please try again.';
      },
    });
  }

  private fetchLatestDeleteConflict(): void {
    const profileId = this.context.selectedId();
    if (!profileId || !this.hasDeleteConflict()) return;

    const recoveryGeneration = ++this.deleteRecoveryGeneration;
    this.isReloading = true;
    this.educationDeleteErrorMessage = '';
    this.context.reloadDetail(profileId).subscribe({
      next: () => {
        if (!this.isCurrentDeleteRecovery(profileId, recoveryGeneration)) return;
        this.loadEducations(profileId, () => this.completeDeleteRecovery(profileId, recoveryGeneration), () => this.failDeleteRecovery(profileId, recoveryGeneration));
      },
      error: (error: unknown) => {
        if (!this.isCurrentDeleteRecovery(profileId, recoveryGeneration)) return;
        this.isReloading = false;
        this.educationDeleteErrorMessage = `Latest Profile data could not be loaded. ${this.apiError(error)?.message?.trim() || 'Please try Reload Latest again.'}`;
      },
    });
  }

  private completeDeleteRecovery(profileId: string, recoveryGeneration: number): void {
    if (!this.isCurrentDeleteRecovery(profileId, recoveryGeneration)) return;
    this.isReloading = false;
    const target = this.educationDeleteTarget;
    const current = target && this.educations.find((education) => String(education.id) === String(target.id));
    if (!current) {
      this.deleteConflict = false;
      this.closeEducationDeleteConfirmation();
      this.educationMessage = 'Latest Profile and Education data loaded. The record is no longer available.';
      return;
    }
    this.educationDeleteTarget = current;
    this.deleteConflict = false;
    this.educationDeleteErrorMessage = '';
    this.educationMessage = 'Latest Profile and Education data loaded. Confirm the deletion again if it is still wanted.';
    this.syncDirtyState();
  }

  private failDeleteRecovery(profileId: string, recoveryGeneration: number): void {
    if (!this.isCurrentDeleteRecovery(profileId, recoveryGeneration)) return;
    this.isReloading = false;
    this.educationDeleteErrorMessage = 'Latest Education data could not be loaded. Please try Reload Latest again.';
    this.syncDirtyState();
  }

  private resetEducationForAnother(): void {
    this.mutationGeneration++;
    const values = this.emptyEducationValues();
    this.editingEducationId = null;
    this.originalValues = this.normalizeValues(values);
    this.educationConflict = false;
    this.educationErrorMessage = '';
    this.cancelConfirmation = false;
    this.reloadConfirmation = false;
    this.educationForm.reset(values);
    this.educationForm.markAsPristine();
    this.educationForm.markAsUntouched();
    this.updateEducationDateValidation();
    this.syncDirtyState();
    this.focusEditorField('education-school-name');
  }

  private closeEducationEditor(): void {
    this.mutationGeneration++;
    this.educationEditorMode = null;
    this.editingEducationId = null;
    this.originalValues = null;
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

  private closeEducationDeleteConfirmation(): void {
    this.educationDeleteConfirmation = false;
    this.deleteConflict = false;
    this.educationDeleteTarget = null;
    this.educationDeleteErrorMessage = '';
    this.isEducationDeleting = false;
    this.syncDirtyState();
  }

  private clearBackendErrors(): void {
    for (const control of Object.values(this.educationForm.controls)) {
      if (!control.errors?.['backend']) continue;
      const errors = { ...control.errors };
      delete errors['backend'];
      control.setErrors(Object.keys(errors).length ? errors : null);
    }
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

  private setEducationFieldError(field: EditableEducationField, message: string): void {
    const control = this.educationForm.controls[field];
    control.setErrors({ ...control.errors, backend: message.trim() || 'This value is not valid.' });
    control.markAsTouched();
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

  private emptyEducationValues(): EditableEducationValues {
    return { schoolName: '', degree: '', fieldOfStudy: '', startDate: '', endDate: '', status: 'ONGOING' };
  }

  private normalizeValues(value: EditableEducationValues): EditableEducationValues {
    return {
      schoolName: value.schoolName.trim(),
      degree: value.degree.trim(),
      fieldOfStudy: value.fieldOfStudy.trim(),
      startDate: value.startDate.trim(),
      endDate: value.endDate.trim(),
      status: value.status,
    };
  }

  private educationDateRangeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value as Partial<EditableEducationValues> | null;
      if (value?.status === 'COMPLETED' && value.startDate && value.endDate && value.startDate > value.endDate) return { dateRange: true };
      return null;
    };
  }

  private updateEducationDateValidation(): void {
    const endDate = this.educationForm.controls.endDate;
    const ongoing = this.educationForm.controls.status.value === 'ONGOING';
    if (ongoing) {
      endDate.setValue('', { emitEvent: false });
      endDate.disable({ emitEvent: false });
    } else {
      endDate.enable({ emitEvent: false });
    }
    endDate.setValidators(ongoing ? [] : [Validators.required]);
    endDate.updateValueAndValidity({ emitEvent: false });
    this.educationForm.updateValueAndValidity({ emitEvent: false });
  }

  private isCurrentEducationProfile(profileId: string, generation: number): boolean {
    return this.activeProfileId === profileId && this.listGeneration === generation && this.isCurrentProfileContext(profileId);
  }

  private isCurrentProfileContext(profileId: string): boolean {
    return this.activeProfileId === profileId
      && this.context.selectedId() === profileId
      && String(this.context.detail()?.id) === profileId;
  }

  private isCurrentEducationOperation(profileId: string, generation: number, requiresEditor = true): boolean {
    return this.isCurrentProfileContext(profileId)
      && this.mutationGeneration === generation
      && (!requiresEditor || this.educationEditorMode !== null);
  }

  private isCurrentDeleteRecovery(profileId: string, generation: number): boolean {
    return this.hasDeleteConflict()
      && this.deleteRecoveryGeneration === generation
      && this.isCurrentProfileContext(profileId);
  }

  private isCurrentEducationRecord(education: Education): boolean {
    return this.educations.some((item) => String(item.id) === String(education.id));
  }

  private sortEducations(educations: Education[]): Education[] {
    return educations.sort((left, right) => {
      const leftId = Number(left.id);
      const rightId = Number(right.id);
      if (Number.isFinite(leftId) && Number.isFinite(rightId)) return leftId - rightId;
      return String(left.id).localeCompare(String(right.id));
    });
  }

  private focusEditorField(id: string): void {
    const fields = document.querySelectorAll<HTMLElement>(`#${id}`);
    const field = fields.item(fields.length - 1);
    field?.focus();
    if (field && document.activeElement !== field) setTimeout(() => { if (document.activeElement === document.body) field.focus(); });
  }

  private syncDirtyState(): void {
    this.editSession.setDirty(this.educationEditorMode !== null && (this.educationForm.dirty || this.hasChanges()));
    this.setInteractionActive(this.educationEditorMode !== null || this.isEducationSubmitting || this.educationConflict || this.cancelConfirmation || this.reloadConfirmation || this.educationDeleteConfirmation || this.isEducationDeleting || this.isReloading);
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
    return 'The Profile changed before this Education could be deleted. Reload Latest to refresh the current Education data before deciding again.';
  }

  private apiError(error: unknown): ApiErrorResponse | undefined {
    return error instanceof HttpErrorResponse ? error.error as ApiErrorResponse : undefined;
  }
}
