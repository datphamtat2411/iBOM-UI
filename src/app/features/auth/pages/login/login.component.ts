import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';
import { ApiErrorResponse } from '../../../../core/http/api.models';

type MessageTone = 'error' | 'warning';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loginForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  isSubmitting = false;
  message = '';
  messageTone: MessageTone = 'error';

  submit(): void {
    this.message = '';
    if (this.isSubmitting) return;

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const { email, password } = this.loginForm.getRawValue();
    this.authService.login({ email: email.trim().toLowerCase(), password }).subscribe({
      next: () => void this.router.navigate(['/']),
      error: (error: unknown) => this.handleError(error),
      complete: () => { this.isSubmitting = false; },
    });
  }

  private handleError(error: unknown): void {
    this.isSubmitting = false;
    const response = error instanceof HttpErrorResponse ? error.error as ApiErrorResponse : undefined;
    const errorCode = response?.errorCode;

    if (errorCode === 'VALIDATION_ERROR' || (error instanceof HttpErrorResponse && error.status === 400)) {
      this.applyFieldErrors(response?.data);
      this.setMessage('Please correct the highlighted fields.', 'error');
    } else if (errorCode === 'AUTH_ACCOUNT_INACTIVE') {
      this.setMessage(this.backendMessage(response?.message, 'This account is inactive. Contact your iBOM administrator for access support.'), 'warning');
    } else if (errorCode === 'AUTH_INVALID_CREDENTIALS' || (error instanceof HttpErrorResponse && error.status === 401)) {
      this.setMessage(this.backendMessage(response?.message, 'Email or Password is incorrect.'), 'error');
    } else {
      this.setMessage(this.backendMessage(response?.message, 'Unable to sign in right now. Please try again.'), 'error');
    }
  }

  private applyFieldErrors(data: unknown): void {
    const errors = (data as { errors?: unknown } | undefined)?.errors;
    const violations = Array.isArray(errors)
      ? errors
      : errors && typeof errors === 'object'
        ? Object.entries(errors).map(([field, value]) => ({ field, message: String(value) }))
        : [];

    for (const violation of violations) {
      if (!violation || typeof violation !== 'object') continue;
      const field = (violation as { field?: unknown }).field;
      const text = (violation as { message?: unknown }).message;
      if ((field === 'email' || field === 'password') && typeof text === 'string') {
        this.loginForm.controls[field].setErrors({ backend: text });
      }
    }
  }

  private backendMessage(message: string | undefined, fallback: string): string {
    return message?.trim() || fallback;
  }

  private setMessage(message: string, tone: MessageTone): void {
    this.message = message;
    this.messageTone = tone;
  }
}
