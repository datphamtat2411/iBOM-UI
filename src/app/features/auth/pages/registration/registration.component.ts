import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { ApiErrorResponse } from '../../../../core/http/api.models';
import { RegistrationService } from '../../services/registration.service';
import { matchingPassword, strongPassword } from '../../validators/password.validators';

type MessageTone = 'error' | 'warning';

@Component({
  selector: 'app-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './registration.component.html',
  styleUrl: './registration.component.scss',
})
export class RegistrationComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly registrationService = inject(RegistrationService);
  private readonly router = inject(Router);

  readonly registrationForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    username: ['', [Validators.required, Validators.maxLength(100)]],
    password: ['', [Validators.required, strongPassword]],
    confirmPassword: ['', [Validators.required, matchingPassword]],
    verificationCode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  codeRequested = false;
  isRequestingCode = false;
  isSubmitting = false;
  message = '';
  messageTone: MessageTone = 'error';

  constructor() {
    this.registrationForm.controls.email.valueChanges.subscribe(() => {
      if (this.codeRequested) {
        this.codeRequested = false;
        this.registrationForm.controls.verificationCode.reset('');
      }
    });
    this.registrationForm.controls.password.valueChanges.subscribe(() => this.registrationForm.controls.confirmPassword.updateValueAndValidity());
  }

  get passwordValue(): string { return this.registrationForm.controls.password.value; }
  hasUppercase(): boolean { return /[A-Z]/.test(this.passwordValue); }
  hasLowercase(): boolean { return /[a-z]/.test(this.passwordValue); }
  hasDigit(): boolean { return /\d/.test(this.passwordValue); }
  hasSpecialCharacter(): boolean { return /[^A-Za-z0-9\s]/.test(this.passwordValue); }
  get initialFormInvalid(): boolean {
    return this.registrationForm.controls.email.invalid || this.registrationForm.controls.username.invalid
      || this.registrationForm.controls.password.invalid || this.registrationForm.controls.confirmPassword.invalid;
  }

  requestCode(): void {
    this.message = '';
    if (this.isRequestingCode || this.isSubmitting) return;
    if (this.initialFormInvalid) {
      this.markInitialFieldsTouched();
      return;
    }
    this.isRequestingCode = true;
    this.registrationService.requestVerificationCode({ email: this.normalizedEmail() }).subscribe({
      next: () => { this.codeRequested = true; },
      error: (error: unknown) => this.handleError(error),
      complete: () => { this.isRequestingCode = false; },
    });
  }

  submit(): void {
    this.message = '';
    if (this.isSubmitting || this.isRequestingCode) return;
    if (!this.codeRequested || this.registrationForm.invalid) {
      this.registrationForm.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;
    const value = this.registrationForm.getRawValue();
    this.registrationService.register({
      email: this.normalizedEmail(), username: value.username.trim(), password: value.password,
      verificationCode: value.verificationCode,
    }).subscribe({
      next: () => void this.router.navigate(['/login']),
      error: (error: unknown) => this.handleError(error),
      complete: () => { this.isSubmitting = false; },
    });
  }

  private normalizedEmail(): string { return this.registrationForm.controls.email.value.trim().toLowerCase(); }

  private markInitialFieldsTouched(): void {
    ['email', 'username', 'password', 'confirmPassword'].forEach((field) => this.registrationForm.controls[field as 'email' | 'username' | 'password' | 'confirmPassword'].markAsTouched());
  }

  private handleError(error: unknown): void {
    this.isRequestingCode = false;
    this.isSubmitting = false;
    const response = error instanceof HttpErrorResponse ? error.error as ApiErrorResponse : undefined;
    const errorCode = response?.errorCode;
    if (errorCode === 'VALIDATION_ERROR' || (error instanceof HttpErrorResponse && error.status === 400 && !errorCode)) {
      this.applyFieldErrors(response?.data);
      this.setMessage('Please correct the highlighted fields.', 'error');
    } else if (errorCode === 'AUTH_EMAIL_ALREADY_REGISTERED') {
      this.setBackendFieldError('email', response?.message);
    } else if (errorCode === 'AUTH_USERNAME_ALREADY_REGISTERED') {
      this.setBackendFieldError('username', response?.message);
    } else if (errorCode === 'AUTH_EMAIL_OR_USERNAME_ALREADY_REGISTERED') {
      this.setBackendFieldError('email', response?.message);
      this.setBackendFieldError('username', response?.message);
    } else if (errorCode === 'AUTH_INVALID_OR_EXPIRED_VERIFICATION_CODE') {
      this.setBackendFieldError('verificationCode', response?.message);
    } else if (errorCode === 'AUTH_EMAIL_DOMAIN_NOT_ALLOWED' || errorCode === 'AUTH_VERIFICATION_CODE_REQUEST_LIMIT_REACHED') {
      this.setMessage(this.backendMessage(response?.message, 'Registration cannot be completed right now.'), 'error');
    } else {
      this.setMessage(this.backendMessage(response?.message, 'Unable to complete registration right now. Please try again.'), 'error');
    }
  }

  private applyFieldErrors(data: unknown): void {
    const errors = (data as { errors?: unknown } | undefined)?.errors;
    const violations = Array.isArray(errors) ? errors : errors && typeof errors === 'object'
      ? Object.entries(errors).map(([field, message]) => ({ field, message: String(message) })) : [];
    for (const violation of violations) {
      if (!violation || typeof violation !== 'object') continue;
      const field = (violation as { field?: unknown }).field;
      const text = (violation as { message?: unknown }).message;
      if (typeof field === 'string' && ['email', 'username', 'password', 'verificationCode'].includes(field) && typeof text === 'string') {
        this.setBackendFieldError(field as 'email' | 'username' | 'password' | 'verificationCode', text);
      }
    }
  }

  private setBackendFieldError(field: 'email' | 'username' | 'password' | 'verificationCode', text: string | undefined): void {
    this.registrationForm.controls[field].setErrors({ backend: this.backendMessage(text, 'This value is not valid.') });
    this.registrationForm.controls[field].markAsTouched();
  }

  private backendMessage(message: string | undefined, fallback: string): string { return message?.trim() || fallback; }
  private setMessage(message: string, tone: MessageTone): void { this.message = message; this.messageTone = tone; }
}
