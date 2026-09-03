import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from '../../../../core/auth/auth.service';
import { ApiErrorResponse } from '../../../../core/http/api.models';
import { AccountSettingsService } from '../../services/account-settings.service';
import { matchingPassword, strongPassword } from '../../validators/password.validators';

type MessageTone = 'error' | 'success';

@Component({
  selector: 'app-account-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './account-settings.component.html',
  styleUrl: './account-settings.component.scss',
})
export class AccountSettingsComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly settingsService = inject(AccountSettingsService);

  readonly user = this.authService.user;
  readonly usernameForm = this.formBuilder.nonNullable.group({
    username: ['', [Validators.required, Validators.maxLength(100)]],
  });
  readonly passwordForm = this.formBuilder.nonNullable.group({
    currentPassword: ['', Validators.required],
    password: ['', [Validators.required, strongPassword]],
    confirmPassword: ['', [Validators.required, matchingPassword]],
  });

  isChangingUsername = false;
  isChangingPassword = false;
  showCurrentPassword = false;
  showPassword = false;
  showConfirmPassword = false;
  message = '';
  messageTone: MessageTone = 'error';

  constructor() {
    this.usernameForm.controls.username.setValue(this.user()?.username ?? '');
    this.passwordForm.controls.password.valueChanges.subscribe(() => this.passwordForm.controls.confirmPassword.updateValueAndValidity());
  }

  get passwordValue(): string { return this.passwordForm.controls.password.value; }
  hasUppercase(): boolean { return /[A-Z]/.test(this.passwordValue); }
  hasLowercase(): boolean { return /[a-z]/.test(this.passwordValue); }
  hasDigit(): boolean { return /\d/.test(this.passwordValue); }
  hasSpecialCharacter(): boolean { return /[^A-Za-z0-9\s]/.test(this.passwordValue); }
  toggleCurrentPasswordVisibility(): void { this.showCurrentPassword = !this.showCurrentPassword; }
  togglePasswordVisibility(): void { this.showPassword = !this.showPassword; }
  toggleConfirmPasswordVisibility(): void { this.showConfirmPassword = !this.showConfirmPassword; }

  submitUsername(): void {
    if (this.isChangingUsername) return;
    this.message = '';
    if (this.usernameForm.invalid) {
      this.usernameForm.markAllAsTouched();
      return;
    }
    this.isChangingUsername = true;
    this.settingsService.changeUsername({ username: this.usernameForm.controls.username.value.trim() }).subscribe({
      next: (user) => {
        this.authService.updateUser(user);
        this.usernameForm.controls.username.setValue(user.username);
        this.setMessage('Username updated successfully.', 'success');
      },
      error: (error: unknown) => this.handleUsernameError(error),
      complete: () => { this.isChangingUsername = false; },
    });
  }

  submitPassword(): void {
    if (this.isChangingPassword) return;
    this.message = '';
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    this.isChangingPassword = true;
    const value = this.passwordForm.getRawValue();
    this.settingsService.changePassword({ currentPassword: value.currentPassword, newPassword: value.password }).subscribe({
      next: () => {
        this.passwordForm.reset();
        this.setMessage('Password updated successfully.', 'success');
      },
      error: (error: unknown) => this.handlePasswordError(error),
      complete: () => { this.isChangingPassword = false; },
    });
  }

  private handleUsernameError(error: unknown): void {
    this.isChangingUsername = false;
    const response = this.apiError(error);
    if (response?.errorCode === 'VALIDATION_ERROR') {
      this.applyFieldErrors(response.data, this.usernameForm);
      this.setMessage('Please correct the highlighted fields.', 'error');
    } else if (response?.errorCode === 'AUTH_USERNAME_CONFLICT') {
      this.setFieldError(this.usernameForm.controls.username, this.backendMessage(response.message, 'That username is already in use.'));
    } else {
      this.setMessage(this.backendMessage(response?.message, 'Unable to update username right now. Please try again.'), 'error');
    }
  }

  private handlePasswordError(error: unknown): void {
    this.isChangingPassword = false;
    const response = this.apiError(error);
    if (response?.errorCode === 'VALIDATION_ERROR') {
      this.applyFieldErrors(response.data, this.passwordForm);
      this.setMessage('Please correct the highlighted fields.', 'error');
    } else if (response?.errorCode === 'AUTH_INCORRECT_CURRENT_PASSWORD') {
      this.setFieldError(this.passwordForm.controls.currentPassword, this.backendMessage(response.message, 'Current password is incorrect.'));
    } else {
      this.setMessage(this.backendMessage(response?.message, 'Unable to update password right now. Please try again.'), 'error');
    }
  }

  private applyFieldErrors(data: unknown, form: typeof this.usernameForm | typeof this.passwordForm): void {
    const errors = (data as { errors?: unknown } | undefined)?.errors;
    const violations = Array.isArray(errors) ? errors : errors && typeof errors === 'object'
      ? Object.entries(errors).map(([field, message]) => ({ field, message: String(message) })) : [];
    for (const violation of violations) {
      if (!violation || typeof violation !== 'object') continue;
      const field = (violation as { field?: unknown }).field;
      const text = (violation as { message?: unknown }).message;
      const controlField = field === 'newPassword' ? 'password' : field;
      if (typeof controlField === 'string' && controlField in form.controls && typeof text === 'string') {
        this.setFieldError(form.controls[controlField as keyof typeof form.controls], text);
      }
    }
  }

  private setFieldError(control: { setErrors: (errors: Record<string, string>) => void; markAsTouched: () => void }, message: string): void {
    control.setErrors({ backend: message });
    control.markAsTouched();
  }

  private apiError(error: unknown): ApiErrorResponse | undefined {
    return error instanceof HttpErrorResponse ? error.error as ApiErrorResponse : undefined;
  }

  private backendMessage(message: string | undefined, fallback: string): string { return message?.trim() || fallback; }
  private setMessage(message: string, tone: MessageTone): void { this.message = message; this.messageTone = tone; }
}
