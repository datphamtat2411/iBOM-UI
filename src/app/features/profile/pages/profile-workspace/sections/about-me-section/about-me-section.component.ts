import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

import { ApiErrorResponse } from '../../../../../../core/http/api.models';
import { NotificationService } from '../../../../../../core/notifications/notification.service';
import { ProfileDetail, UpdateProfileRequest } from '../../../../models/profile.models';
import { ProfileContextService } from '../../../../services/profile-context.service';
import { ProfileEditSessionService } from '../../../../services/profile-edit-session.service';
import { ProfileService } from '../../../../services/profile.service';

type EditableAboutMeField = Exclude<keyof UpdateProfileRequest, 'profileName' | 'version'>;
type EditableAboutMeValues = Pick<UpdateProfileRequest, EditableAboutMeField>;

@Component({
  selector: 'app-about-me-section',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './about-me-section.component.html',
  styleUrl: './about-me-section.component.scss',
})
export class AboutMeSectionComponent implements OnChanges, OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly notifications = inject(NotificationService);
  readonly context = inject(ProfileContextService);
  readonly editSession = inject(ProfileEditSessionService);

  @Input({ required: true }) profile!: ProfileDetail;
  @Input() mutationBlocked = false;
  @Output() readonly interactionActiveChange = new EventEmitter<boolean>();

  readonly editForm = this.formBuilder.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    jobTitle: ['', [Validators.required, Validators.maxLength(100)]],
    yearsOfExperience: [0, [Validators.required, Validators.min(0)]],
    personality: ['', [Validators.maxLength(4000)]],
    technicalSummary: ['', [Validators.maxLength(4000)]],
  });

  isEditing = false;
  isSubmitting = false;
  isReloading = false;
  conflict = false;
  cancelConfirmation = false;
  reloadConfirmation = false;
  errorMessage = '';
  saveMessage = '';

  private activeProfileId: string | null = null;
  private activeMemberId: string | null = null;
  private originalValues: EditableAboutMeValues | null = null;
  private mutationGeneration = 0;
  private interactionActive = false;
  private readonly navigationDiscardSubscription: Subscription;

  constructor() {
    this.editForm.valueChanges.subscribe(() => this.syncDirtyState());
    this.navigationDiscardSubscription = this.editSession.navigationDiscarded$().subscribe(() => this.discardEditing());
  }

  ngOnChanges(changes: SimpleChanges): void {
    const profileChange = changes['profile'];
    if (!profileChange || !this.profile) return;
    const nextProfileId = String(this.profile.id);
    if (profileChange.firstChange || this.activeProfileId !== nextProfileId || this.activeMemberId !== this.currentMemberId()) this.resetForProfile();
  }

  ngOnDestroy(): void {
    this.navigationDiscardSubscription.unsubscribe();
    this.editSession.setDirty(false);
    this.setInteractionActive(false);
  }

  resetForProfile(): void {
    this.mutationGeneration++;
    this.activeProfileId = this.profile ? String(this.profile.id) : null;
    this.activeMemberId = this.currentMemberId();
    this.originalValues = null;
    this.isEditing = false;
    this.isSubmitting = false;
    this.isReloading = false;
    this.conflict = false;
    this.cancelConfirmation = false;
    this.reloadConfirmation = false;
    this.errorMessage = '';
    this.saveMessage = '';
    if (this.profile) this.editForm.reset(this.formValues(this.profile));
    this.editForm.markAsPristine();
    this.editForm.markAsUntouched();
    this.syncDirtyState();
  }

  startEditing(): void {
    if (!this.profile || this.conflict || this.mutationBlocked) return;
    const values = this.formValues(this.profile);
    this.originalValues = this.normalizeValues(values);
    this.editForm.reset(values);
    this.editForm.markAsPristine();
    this.editForm.markAsUntouched();
    this.isEditing = true;
    this.cancelConfirmation = false;
    this.errorMessage = '';
    this.saveMessage = '';
    this.syncDirtyState();
  }

  cancelEditing(): void {
    if (!this.isEditing || this.isSubmitting) return;
    if (this.editForm.dirty) {
      this.cancelConfirmation = true;
      this.syncDirtyState();
      return;
    }
    this.closeEditor();
  }

  keepEditing(): void {
    this.cancelConfirmation = false;
    this.reloadConfirmation = false;
    this.syncDirtyState();
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
    if (!this.hasChanges()) return;
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      this.syncDirtyState();
      return;
    }

    const profileId = this.selectedProfileId();
    const profile = this.selectedProfile();
    if (!profile || !profileId || String(profile.id) !== profileId) return;

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

    const operationGeneration = ++this.mutationGeneration;
    this.isSubmitting = true;
    this.syncDirtyState();
    this.profileService.update(profileId, update).subscribe({
      next: (updated) => {
        if (!this.isCurrentOperation(profileId, operationGeneration)) return;
        this.context.replaceDetail(updated);
        this.refreshManagedProfile(profileId);
        this.isSubmitting = false;
        this.conflict = false;
        this.saveMessage = 'About Me updated successfully.';
        this.notifications.showSuccess(this.saveMessage);
        this.closeEditor();
      },
      error: (error: unknown) => {
        if (!this.isCurrentOperation(profileId, operationGeneration)) return;
        this.handleSaveError(error);
      },
    });
  }

  reloadLatest(): void {
    if (!this.isEditing || this.isReloading || !this.conflict) return;
    if (this.editForm.dirty) {
      this.reloadConfirmation = true;
      this.syncDirtyState();
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

  hasChanges(): boolean {
    const original = this.originalValues;
    if (!original) return false;
    const current = this.normalizeValues(this.editForm.getRawValue());
    return current.firstName !== original.firstName
      || current.lastName !== original.lastName
      || current.jobTitle !== original.jobTitle
      || current.yearsOfExperience !== original.yearsOfExperience
      || current.personality !== original.personality
      || current.technicalSummary !== original.technicalSummary;
  }

  private fetchLatest(): void {
    const profileId = this.selectedProfileId();
    if (!profileId) return;

    const reloadGeneration = ++this.mutationGeneration;
    const current = this.selectedProfile();
    if (current) this.editForm.reset(this.formValues(current));
    this.editForm.markAsPristine();
    this.editForm.markAsUntouched();
    this.isEditing = false;
    this.isReloading = true;
    this.isSubmitting = false;
    this.errorMessage = '';
    this.saveMessage = '';
    this.syncDirtyState();

    this.context.reloadDetail(profileId).subscribe({
      next: (latest) => {
        if (!this.isCurrentProfileContext(profileId) || this.mutationGeneration !== reloadGeneration) return;
        this.editForm.reset(this.formValues(latest));
        this.editForm.markAsPristine();
        this.editForm.markAsUntouched();
        this.isReloading = false;
        this.conflict = false;
        this.saveMessage = 'Latest Profile data loaded. Review it before editing.';
        this.syncDirtyState();
      },
      error: (error: unknown) => {
        if (!this.isCurrentProfileContext(profileId) || this.mutationGeneration !== reloadGeneration) return;
        this.isReloading = false;
        this.conflict = true;
        this.errorMessage = this.apiError(error)?.message?.trim() || 'Unable to reload the latest Profile right now. Please try again.';
        this.syncDirtyState();
      },
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

  private clearBackendErrors(): void {
    for (const control of Object.values(this.editForm.controls)) {
      if (!control.errors?.['backend']) continue;
      const errors = { ...control.errors };
      delete errors['backend'];
      control.setErrors(Object.keys(errors).length ? errors : null);
    }
  }

  private applyFieldErrors(data: unknown): void {
    const errors = (data as { errors?: unknown } | undefined)?.errors;
    if (!Array.isArray(errors)) return;
    for (const error of errors) {
      if (!error || typeof error !== 'object') continue;
      const { field, message } = error as { field?: unknown; message?: unknown };
      if (typeof field === 'string' && typeof message === 'string' && field in this.editForm.controls) {
        const control = this.editForm.controls[field as EditableAboutMeField];
        control.setErrors({ ...control.errors, backend: message.trim() || 'This value is not valid.' });
        control.markAsTouched();
      }
    }
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

  private closeEditor(): void {
    this.mutationGeneration++;
    this.originalValues = null;
    this.isEditing = false;
    this.isSubmitting = false;
    this.cancelConfirmation = false;
    this.reloadConfirmation = false;
    this.conflict = false;
    this.editSession.setDirty(false);
    if (this.profile) {
      this.editForm.reset(this.formValues(this.profile));
      this.editForm.markAsPristine();
      this.editForm.markAsUntouched();
    }
    this.syncDirtyState();
  }

  private formValues(profile: ProfileDetail): EditableAboutMeValues {
    return {
      firstName: profile.firstName,
      lastName: profile.lastName,
      jobTitle: profile.jobTitle,
      yearsOfExperience: profile.yearsOfExperience,
      personality: profile.personality ?? '',
      technicalSummary: profile.technicalSummary ?? '',
    };
  }

  private normalizeValues(value: EditableAboutMeValues): EditableAboutMeValues {
    return {
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      jobTitle: value.jobTitle.trim(),
      yearsOfExperience: value.yearsOfExperience,
      personality: value.personality.trim(),
      technicalSummary: value.technicalSummary.trim(),
    };
  }

  private isCurrentProfileContext(profileId: string): boolean {
    return this.activeProfileId === profileId
      && this.activeMemberId === this.currentMemberId()
      && this.selectedProfileId() === profileId
      && String(this.selectedProfile()?.id) === profileId;
  }

  private isCurrentOperation(profileId: string, generation: number): boolean {
    return this.isCurrentProfileContext(profileId)
      && this.mutationGeneration === generation
      && this.isEditing;
  }

  private syncDirtyState(): void {
    this.editSession.setDirty(this.isEditing && (this.editForm.dirty || this.hasChanges()));
    this.setInteractionActive(this.isEditing || this.isSubmitting || this.conflict || this.cancelConfirmation || this.reloadConfirmation || this.isReloading);
  }

  private setInteractionActive(active: boolean): void {
    if (this.interactionActive === active) return;
    this.interactionActive = active;
    this.interactionActiveChange.emit(active);
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
