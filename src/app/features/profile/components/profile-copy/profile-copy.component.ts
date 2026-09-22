import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ApiErrorResponse } from '../../../../core/http/api.models';
import { ProfileResponse } from '../../models/profile.models';
import { ProfileContextService } from '../../services/profile-context.service';
import { ProfileEditSessionService } from '../../services/profile-edit-session.service';
import { ProfileService } from '../../services/profile.service';

@Component({
  selector: 'app-profile-copy',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './profile-copy.component.html',
  styleUrl: './profile-copy.component.scss',
})
export class ProfileCopyComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly profileEditSession = inject(ProfileEditSessionService);
  readonly context = inject(ProfileContextService);

  @Input() sourceProfileId = '';
  @Input() sourceProfileName = '';
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly copied = new EventEmitter<ProfileResponse>();

  readonly copyForm = this.formBuilder.group({
    profileName: ['', [Validators.required, Validators.maxLength(100)]],
  });
  isSubmitting = false;
  warningRequired = false;
  private warningAcknowledged = false;
  message = '';

  constructor() {
    this.warningRequired = this.context.summaries().length >= 5;
  }

  confirmWarning(): void {
    this.warningAcknowledged = true;
    this.warningRequired = false;
  }

  cancel(): void {
    if (!this.isSubmitting) this.closed.emit();
  }

  submit(): void {
    this.message = '';
    if (this.isSubmitting) return;

    if (this.context.summaries().length >= 5 && !this.warningAcknowledged) {
      this.warningRequired = true;
      return;
    }

    this.clearBackendError();
    this.trimFormValue();
    if (this.copyForm.invalid) {
      this.copyForm.markAllAsTouched();
      return;
    }

    const source = this.currentSource();
    if (!source) {
      this.message = 'The selected Profile changed. Close this dialog and try again.';
      return;
    }

    this.isSubmitting = true;
    this.profileEditSession.requestNavigation(`/profiles/${source.id}`).then((allow) => {
      if (!allow) {
        this.isSubmitting = false;
        return;
      }
      if (!this.currentSource() || this.currentSource()?.id !== source.id) {
        this.isSubmitting = false;
        this.message = 'The selected Profile changed. Close this dialog and try again.';
        return;
      }

      this.profileService.copy(source.id, { profileName: this.copyForm.controls.profileName.value!.trim() }).subscribe({
        next: (copied) => {
          if (!this.currentSource() || this.currentSource()?.id !== source.id) {
            this.isSubmitting = false;
            this.message = 'The selected Profile changed while Copy was in progress. Close this dialog and try again.';
            return;
          }
          this.isSubmitting = false;
          this.copied.emit(copied);
        },
        error: (error: unknown) => this.handleError(error),
      });
    });
  }

  fieldError(): string {
    const errors = this.copyForm.controls.profileName.errors;
    if (!errors) return '';
    if (errors['backend']) return errors['backend'];
    if (errors['required']) return 'This field is required.';
    if (errors['maxlength']) return `Use ${errors['maxlength'].requiredLength} characters or fewer.`;
    return 'This value is not valid.';
  }

  private currentSource(): { id: string; name: string } | null {
    const selectedId = this.context.selectedId();
    const detail = this.context.detail();
    const summary = this.context.summaries().find((item) => String(item.id) === selectedId);
    if (!selectedId || selectedId !== String(this.sourceProfileId) || !summary) return null;
    if (detail && String(detail.id) !== selectedId) return null;
    return { id: selectedId, name: detail?.profileName ?? summary.profileName };
  }

  private handleError(error: unknown): void {
    this.isSubmitting = false;
    const response = error instanceof HttpErrorResponse ? error.error as ApiErrorResponse : undefined;
    if (response?.errorCode === 'PROFILE_NAME_ALREADY_EXISTS') {
      this.setBackendError(response.message);
    } else if (response?.errorCode === 'VALIDATION_ERROR') {
      this.applyValidationError(response.data);
      this.message = 'Please correct the highlighted field.';
    } else {
      this.message = response?.message?.trim() || 'Unable to copy this Profile right now. Please try again.';
    }
  }

  private applyValidationError(data: unknown): void {
    const errors = (data as { errors?: unknown } | undefined)?.errors;
    if (!Array.isArray(errors)) return;
    for (const error of errors) {
      if (!error || typeof error !== 'object') continue;
      const { field, message } = error as { field?: unknown; message?: unknown };
      if (field === 'profileName' && typeof message === 'string') this.setBackendError(message);
    }
  }

  private clearBackendError(): void {
    const control = this.copyForm.controls.profileName;
    if (!control.errors?.['backend']) return;
    const errors = { ...control.errors };
    delete errors['backend'];
    control.setErrors(Object.keys(errors).length ? errors : null);
  }

  private setBackendError(message: string | undefined): void {
    const control = this.copyForm.controls.profileName;
    control.setErrors({ ...control.errors, backend: message?.trim() || 'This value is not valid.' });
    control.markAsTouched();
  }

  private trimFormValue(): void {
    const value = this.copyForm.controls.profileName.value;
    this.copyForm.controls.profileName.setValue(value?.trim() ?? '', { emitEvent: false });
    this.copyForm.controls.profileName.updateValueAndValidity({ emitEvent: false });
  }
}
