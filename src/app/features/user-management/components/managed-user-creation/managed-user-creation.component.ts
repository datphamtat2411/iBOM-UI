import { HttpErrorResponse } from '@angular/common/http';
import { AfterViewChecked, Component, ElementRef, EventEmitter, Output, ViewChild, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';

import { ApiErrorResponse } from '../../../../core/http/api.models';
import { CreateUserRequest, UserRole, UserSummary } from '../../models/user-management.models';
import { UserManagementService } from '../../services/user-management.service';
import { matchingPassword, strongPassword } from '../../../auth/validators/password.validators';

type CreateUserField = 'email' | 'username' | 'password' | 'confirmPassword' | 'role';

function trimmedEmail(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  return value ? Validators.email({ value } as AbstractControl) : { email: true };
}

@Component({
  selector: 'app-managed-user-creation',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './managed-user-creation.component.html',
  styleUrl: './managed-user-creation.component.scss',
})
export class ManagedUserCreationComponent implements AfterViewChecked {
  private readonly userService = inject(UserManagementService);
  private readonly formBuilder = inject(FormBuilder);

  @ViewChild('createDialog') private createDialog?: ElementRef<HTMLElement>;
  @Output() readonly created = new EventEmitter<UserSummary>();

  readonly roleOptions: ReadonlyArray<{ value: UserRole; label: string }> = [
    { value: 'MEMBER', label: 'Member' },
    { value: 'MANAGER', label: 'Manager' },
    { value: 'ADMIN', label: 'Admin' },
  ];

  readonly createForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, trimmedEmail]],
    username: ['', [Validators.required, Validators.maxLength(100)]],
    password: ['', [Validators.required, strongPassword]],
    confirmPassword: ['', [Validators.required, matchingPassword]],
    role: ['MEMBER' as UserRole, Validators.required],
  });
  isCreateDialogOpen = false;
  isCreatingUser = false;
  createUserErrorMessage = '';
  showCreatePassword = false;
  showCreateConfirmPassword = false;

  private lastCreateDialogTrigger: HTMLElement | null = null;
  private focusCreateDialog = false;

  constructor() {
    this.createForm.controls.password.valueChanges.subscribe(() => this.createForm.controls.confirmPassword.updateValueAndValidity());
  }

  ngAfterViewChecked(): void {
    if (this.focusCreateDialog && this.createDialog) {
      this.focusCreateDialog = false;
      this.createDialog.nativeElement.focus();
    }
  }

  openCreateDialog(): void {
    if (this.isCreatingUser) return;
    this.lastCreateDialogTrigger = typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    this.resetCreateForm();
    this.createUserErrorMessage = '';
    this.isCreateDialogOpen = true;
    this.focusCreateDialog = true;
  }

  closeCreateDialog(event?: MouseEvent): void {
    if (event && event.target !== event.currentTarget) return;
    if (this.isCreatingUser) return;
    this.isCreateDialogOpen = false;
    this.focusCreateDialog = false;
    this.createUserErrorMessage = '';
    this.resetCreateForm();
    this.lastCreateDialogTrigger?.focus();
    this.lastCreateDialogTrigger = null;
  }

  get createPasswordValue(): string {
    return this.createForm.controls.password.value;
  }

  hasCreateUppercase(): boolean { return /[A-Z]/.test(this.createPasswordValue); }
  hasCreateLowercase(): boolean { return /[a-z]/.test(this.createPasswordValue); }
  hasCreateDigit(): boolean { return /\d/.test(this.createPasswordValue); }
  hasCreateSpecialCharacter(): boolean { return /[^A-Za-z0-9\s]/.test(this.createPasswordValue); }

  toggleCreatePasswordVisibility(): void { this.showCreatePassword = !this.showCreatePassword; }
  toggleCreateConfirmPasswordVisibility(): void { this.showCreateConfirmPassword = !this.showCreateConfirmPassword; }

  handleCreateDialogKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeCreateDialog();
      return;
    }

    if (event.key !== 'Tab' || !this.createDialog) return;
    const dialog = this.createDialog.nativeElement;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
      'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [contenteditable="true"], [tabindex]:not([tabindex="-1"])',
    ));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === dialog)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || active === dialog)) {
      event.preventDefault();
      first.focus();
    }
  }

  createUser(): void {
    if (this.isCreatingUser) return;
    this.createUserErrorMessage = '';
    this.clearBackendErrors();
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.isCreatingUser = true;
    const value = this.createForm.getRawValue();
    const request: CreateUserRequest = {
      email: value.email,
      username: value.username,
      password: value.password,
      role: value.role,
    };
    this.userService.create(request).subscribe({
      next: (user) => {
        this.isCreatingUser = false;
        this.closeCreateDialog();
        this.created.emit(user);
      },
      error: (error: unknown) => this.handleCreateError(error),
    });
  }

  createFieldError(field: CreateUserField): string {
    const errors = this.createForm.controls[field].errors;
    if (!errors) return '';
    if (errors['backend']) return errors['backend'];
    if (errors['required']) return `${field === 'confirmPassword' ? 'Confirm Password' : field[0].toUpperCase() + field.slice(1)} is required.`;
    if (errors['email']) return 'Enter a valid email address.';
    if (errors['maxlength']) return 'Username must be 100 characters or fewer.';
    if (errors['passwordMismatch']) return 'Passwords do not match.';
    if (errors['strongPassword']) return 'Password does not meet the requirements.';
    return 'This value is not valid.';
  }

  private resetCreateForm(): void {
    this.createForm.reset({ email: '', username: '', password: '', confirmPassword: '', role: 'MEMBER' });
    this.showCreatePassword = false;
    this.showCreateConfirmPassword = false;
  }

  private handleCreateError(error: unknown): void {
    this.isCreatingUser = false;
    const response = this.apiError(error);
    const errorCode = response?.errorCode;
    if (errorCode === 'VALIDATION_ERROR' || (error instanceof HttpErrorResponse && error.status === 400 && !errorCode)) {
      this.applyCreateFieldErrors(response?.data);
      this.createUserErrorMessage = 'Please correct the highlighted fields.';
    } else if (errorCode === 'AUTH_EMAIL_ALREADY_REGISTERED') {
      this.setCreateFieldError('email', response?.message, 'That email is already registered.');
    } else if (errorCode === 'AUTH_USERNAME_ALREADY_REGISTERED') {
      this.setCreateFieldError('username', response?.message, 'That username is already registered.');
    } else if (errorCode === 'AUTH_EMAIL_OR_USERNAME_ALREADY_REGISTERED') {
      this.setCreateFieldError('email', response?.message, 'That email or username is already registered.');
      this.setCreateFieldError('username', response?.message, 'That email or username is already registered.');
    } else if (errorCode === 'AUTH_EMAIL_DOMAIN_NOT_ALLOWED') {
      this.createUserErrorMessage = this.backendMessage(response?.message, 'This email domain is not allowed.');
    } else {
      this.createUserErrorMessage = this.backendMessage(response?.message, 'Unable to create this User right now. Please try again.');
    }
  }

  private applyCreateFieldErrors(data: unknown): void {
    const errors = (data as { errors?: unknown } | undefined)?.errors;
    const violations = Array.isArray(errors) ? errors : errors && typeof errors === 'object'
      ? Object.entries(errors).map(([field, message]) => ({ field, message: String(message) })) : [];
    const fields: CreateUserField[] = ['email', 'username', 'password', 'role'];
    for (const violation of violations) {
      if (!violation || typeof violation !== 'object') continue;
      const field = (violation as { field?: unknown }).field;
      const text = (violation as { message?: unknown }).message;
      if (typeof field === 'string' && fields.includes(field as CreateUserField) && typeof text === 'string') {
        this.setCreateFieldError(field as CreateUserField, text, 'This value is not valid.');
      }
    }
  }

  private setCreateFieldError(field: CreateUserField, message: string | undefined, fallback: string): void {
    const control = this.createForm.controls[field];
    control.setErrors({ ...control.errors, backend: this.backendMessage(message, fallback) });
    control.markAsTouched();
  }

  private clearBackendErrors(): void {
    for (const control of Object.values(this.createForm.controls)) {
      if (!control.errors?.['backend']) continue;
      const errors = { ...control.errors };
      delete errors['backend'];
      control.setErrors(Object.keys(errors).length ? errors : null);
    }
  }

  private apiError(error: unknown): ApiErrorResponse | undefined {
    return error instanceof HttpErrorResponse ? error.error as ApiErrorResponse : undefined;
  }

  private backendMessage(message: string | undefined, fallback: string): string {
    return message?.trim() || fallback;
  }
}
