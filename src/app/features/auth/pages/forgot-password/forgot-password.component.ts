import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { ApiErrorResponse } from '../../../../core/http/api.models';
import { PasswordResetService } from '../../services/password-reset.service';

type MessageTone = 'error' | 'warning' | 'success';
type Step = 'request' | 'verify' | 'reset';

function strongPassword(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '');
  return [...value].length >= 8 && [...value].length <= 72 && /\p{Lu}/u.test(value) && /\p{Ll}/u.test(value)
    && /\p{Nd}/u.test(value) && /[^\p{L}\p{N}\s]/u.test(value) ? null : { strongPassword: true };
}

function matchingPassword(control: AbstractControl): ValidationErrors | null {
  return control.parent && control.value !== control.parent.get('password')?.value ? { passwordMismatch: true } : null;
}

function trimmedEmail(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  return value ? Validators.email({ value } as AbstractControl) : { email: true };
}

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly passwordResetService = inject(PasswordResetService);
  private readonly router = inject(Router);

  readonly requestForm = this.formBuilder.nonNullable.group({ email: ['', [Validators.required, trimmedEmail]] });
  readonly verifyForm = this.formBuilder.nonNullable.group({ verificationCode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]] });
  readonly resetForm = this.formBuilder.nonNullable.group({
    password: ['', [Validators.required, strongPassword]],
    confirmPassword: ['', [Validators.required, matchingPassword]],
  });

  step: Step = 'request';
  isRequesting = false;
  isVerifying = false;
  isResetting = false;
  showPassword = false;
  showConfirmPassword = false;
  message = '';
  messageTone: MessageTone = 'error';
  private normalizedEmail = '';

  constructor() {
    this.resetForm.controls.password.valueChanges.subscribe(() => this.resetForm.controls.confirmPassword.updateValueAndValidity());
  }

  get passwordValue(): string { return this.resetForm.controls.password.value; }
  hasUppercase(): boolean { return /\p{Lu}/u.test(this.passwordValue); }
  hasLowercase(): boolean { return /\p{Ll}/u.test(this.passwordValue); }
  hasDigit(): boolean { return /\p{Nd}/u.test(this.passwordValue); }
  hasSpecialCharacter(): boolean { return /[^\p{L}\p{N}\s]/u.test(this.passwordValue); }
  togglePasswordVisibility(): void { this.showPassword = !this.showPassword; }
  toggleConfirmPasswordVisibility(): void { this.showConfirmPassword = !this.showConfirmPassword; }

  requestCode(): void {
    this.clearMessage();
    if (this.isRequesting || this.isVerifying || this.isResetting) return;
    if (this.requestForm.invalid) { this.requestForm.markAllAsTouched(); return; }
    this.normalizedEmail = this.requestForm.controls.email.value.trim().toLowerCase();
    this.isRequesting = true;
    this.passwordResetService.requestCode({ email: this.normalizedEmail }).subscribe({
      next: () => { this.step = 'verify'; this.setMessage('If an account exists for this email, a verification code has been sent.', 'success'); },
      error: (error: unknown) => this.handleError(error, 'request'),
      complete: () => { this.isRequesting = false; },
    });
  }

  verifyCode(): void {
    this.clearMessage();
    if (this.isVerifying || this.isRequesting || this.isResetting) return;
    if (this.verifyForm.invalid) { this.verifyForm.markAllAsTouched(); return; }
    this.isVerifying = true;
    this.passwordResetService.verifyCode({ email: this.normalizedEmail, verificationCode: this.verifyForm.controls.verificationCode.value }).subscribe({
      next: () => { this.step = 'reset'; },
      error: (error: unknown) => this.handleError(error, 'verify'),
      complete: () => { this.isVerifying = false; },
    });
  }

  resetPassword(): void {
    this.clearMessage();
    if (this.isResetting || this.isRequesting || this.isVerifying) return;
    if (this.resetForm.invalid) { this.resetForm.markAllAsTouched(); return; }
    this.isResetting = true;
    this.passwordResetService.resetPassword({ email: this.normalizedEmail, verificationCode: this.verifyForm.controls.verificationCode.value, password: this.resetForm.controls.password.value }).subscribe({
      next: () => { this.clearFlow(); void this.router.navigate(['/login']); },
      error: (error: unknown) => this.handleError(error, 'reset'),
      complete: () => { this.isResetting = false; },
    });
  }

  private handleError(error: unknown, operation: Step): void {
    this.isRequesting = false; this.isVerifying = false; this.isResetting = false;
    const response = error instanceof HttpErrorResponse ? error.error as ApiErrorResponse : undefined;
    const code = response?.errorCode;
    if (operation === 'request' && (code === 'AUTH_VERIFICATION_CODE_REQUEST_LIMIT_REACHED' || error instanceof HttpErrorResponse && error.status === 429)) {
      this.setMessage(this.backendMessage(response?.message, 'Too many requests. Please wait before requesting another code.'), 'warning'); return;
    }
    if (code === 'AUTH_INVALID_OR_EXPIRED_VERIFICATION_CODE') {
      if (operation === 'reset') this.step = 'verify';
      this.setFieldError(this.verifyForm.controls.verificationCode, this.backendMessage(response?.message, 'This verification code is invalid or expired.'));
      this.setMessage('Please enter a valid verification code.', 'error'); return;
    }
    if (code === 'VALIDATION_ERROR' || error instanceof HttpErrorResponse && error.status === 400) {
      this.applyFieldErrors(response?.data, operation);
      this.setMessage('Please correct the highlighted fields.', 'error'); return;
    }
    this.setMessage(operation === 'request' ? 'Unable to process the request right now. Please try again.' : this.backendMessage(response?.message, 'Unable to complete password recovery right now. Please try again.'), 'error');
  }

  private applyFieldErrors(data: unknown, operation: Step): void {
    const errors = (data as { errors?: unknown } | undefined)?.errors;
    const violations = Array.isArray(errors) ? errors : errors && typeof errors === 'object' ? Object.entries(errors).map(([field, message]) => ({ field, message: String(message) })) : [];
    for (const violation of violations) {
      if (!violation || typeof violation !== 'object') continue;
      const field = (violation as { field?: unknown }).field;
      const text = (violation as { message?: unknown }).message;
      const control = operation === 'request' && field === 'email' ? this.requestForm.controls.email : operation === 'verify' && field === 'verificationCode' ? this.verifyForm.controls.verificationCode : operation === 'reset' && field === 'password' ? this.resetForm.controls.password : undefined;
      if (control && typeof text === 'string') this.setFieldError(control, text);
    }
  }

  private setFieldError(control: AbstractControl, text: string): void { control.setErrors({ backend: text }); control.markAsTouched(); }
  private backendMessage(message: string | undefined, fallback: string): string { return message?.trim() || fallback; }
  private clearMessage(): void { this.message = ''; }
  private setMessage(message: string, tone: MessageTone): void { this.message = message; this.messageTone = tone; }
  private clearFlow(): void { this.normalizedEmail = ''; this.requestForm.reset(); this.verifyForm.reset(); this.resetForm.reset(); this.step = 'request'; }
}
