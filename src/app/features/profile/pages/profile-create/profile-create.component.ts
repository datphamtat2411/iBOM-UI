import { HttpErrorResponse } from '@angular/common/http';
import { Component, effect, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { ApiErrorResponse } from '../../../../core/http/api.models';
import { CreateProfileRequest } from '../../models/profile.models';
import { ProfileContextService } from '../../services/profile-context.service';
import { ProfileService } from '../../services/profile.service';

type ProfileField = keyof CreateProfileRequest;

@Component({ selector: 'app-profile-create', standalone: true, imports: [ReactiveFormsModule], templateUrl: './profile-create.component.html', styleUrl: './profile-create.component.scss' })
export class ProfileCreateComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly router = inject(Router);
  readonly context = inject(ProfileContextService);
  readonly createForm = this.formBuilder.group({
    profileName: ['', [Validators.required, Validators.maxLength(100)]], firstName: ['', [Validators.required, Validators.maxLength(100)]], lastName: ['', [Validators.required, Validators.maxLength(100)]], jobTitle: ['', [Validators.required, Validators.maxLength(100)]],
    yearsOfExperience: [null as number | null, [Validators.required, Validators.min(0)]], personality: ['', [Validators.maxLength(4000)]], technicalSummary: ['', [Validators.maxLength(4000)]],
  });
  isSubmitting = false;
  warningRequired = false;
  private warningAcknowledged = false;
  message = '';

  constructor() {
    this.context.loadSummaries();
    effect(() => { if (!this.context.summariesLoading() && this.context.summaries().length >= 5 && !this.warningAcknowledged) this.warningRequired = true; });
  }

  confirmWarning(): void { this.warningAcknowledged = true; this.warningRequired = false; }
  cancel(): void { const selectedId = this.context.selectedId(); void this.router.navigate(selectedId ? ['/profiles', selectedId] : ['/profiles']); }
  submit(): void {
    this.message = '';
    if (this.isSubmitting) return;
    if (this.context.summaries().length >= 5 && !this.warningAcknowledged) { this.warningRequired = true; return; }
    this.clearBackendErrors();
    if (this.createForm.invalid) { this.createForm.markAllAsTouched(); return; }
    this.isSubmitting = true;
    const value = this.createForm.getRawValue();
    const profile: CreateProfileRequest = { profileName: value.profileName!.trim(), firstName: value.firstName!.trim(), lastName: value.lastName!.trim(), jobTitle: value.jobTitle!.trim(), yearsOfExperience: value.yearsOfExperience!, personality: value.personality!.trim(), technicalSummary: value.technicalSummary!.trim() };
    this.profileService.create(profile).subscribe({
      next: (created) => this.context.refreshSummariesAndSelect(created.id).subscribe({ next: () => void this.router.navigate(['/profiles', created.id]), error: () => { this.isSubmitting = false; this.message = 'Profile was created, but its workspace could not be loaded. Please try again.'; } }),
      error: (error: unknown) => this.handleError(error),
    });
  }
  fieldError(field: ProfileField): string {
    const errors = this.createForm.controls[field].errors;
    if (!errors) return '';
    if (errors['backend']) return errors['backend'];
    if (errors['required']) return 'This field is required.';
    if (errors['maxlength']) return `Use ${errors['maxlength'].requiredLength} characters or fewer.`;
    if (errors['min']) return 'Enter a non-negative number.';
    return 'This value is not valid.';
  }
  private handleError(error: unknown): void {
    this.isSubmitting = false;
    const response = error instanceof HttpErrorResponse ? error.error as ApiErrorResponse : undefined;
    if (response?.errorCode === 'PROFILE_NAME_ALREADY_EXISTS') this.setBackendFieldError('profileName', response.message);
    else if (response?.errorCode === 'VALIDATION_ERROR') { this.applyFieldErrors(response.data); this.message = 'Please correct the highlighted fields.'; }
    else this.message = response?.message?.trim() || 'Unable to create this Profile right now. Please try again.';
  }
  private applyFieldErrors(data: unknown): void {
    const errors = (data as { errors?: unknown } | undefined)?.errors;
    if (!Array.isArray(errors)) return;
    for (const error of errors) {
      if (!error || typeof error !== 'object') continue;
      const { field, message } = error as { field?: unknown; message?: unknown };
      if (typeof field === 'string' && typeof message === 'string' && field in this.createForm.controls) this.setBackendFieldError(field as ProfileField, message);
    }
  }
  private clearBackendErrors(): void {
    for (const control of Object.values(this.createForm.controls)) {
      if (!control.errors?.['backend']) continue;
      const errors = { ...control.errors };
      delete errors['backend'];
      control.setErrors(Object.keys(errors).length ? errors : null);
    }
  }
  private setBackendFieldError(field: ProfileField, message: string | undefined): void {
    const control = this.createForm.controls[field];
    control.setErrors({ ...control.errors, backend: message?.trim() || 'This value is not valid.' });
    control.markAsTouched();
  }
}
