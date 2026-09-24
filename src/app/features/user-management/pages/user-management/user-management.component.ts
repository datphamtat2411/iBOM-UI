import { HttpErrorResponse } from '@angular/common/http';
import { AfterViewChecked, Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';

import { AuthService } from '../../../../core/auth/auth.service';
import { ApiErrorResponse } from '../../../../core/http/api.models';
import { NotificationService } from '../../../../core/notifications/notification.service';
import {
  AppliedUserFilter,
  CreateUserRequest,
  UserFilterDraft,
  UserPage,
  UserRole,
  UserStatus,
  UserSummary,
} from '../../models/user-management.models';
import { UserManagementService } from '../../services/user-management.service';
import { matchingPassword, strongPassword } from '../../../auth/validators/password.validators';

type CreateUserField = 'email' | 'username' | 'password' | 'confirmPassword' | 'role';

function trimmedEmail(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  return value ? Validators.email({ value } as AbstractControl) : { email: true };
}

interface StatusConfirmation {
  user: UserSummary;
  requestedStatus: UserStatus;
  errorMessage: string;
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss',
})
export class UserManagementComponent implements AfterViewChecked, OnInit {
  private readonly userService = inject(UserManagementService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly notifications = inject(NotificationService);
  private readonly authService = inject(AuthService);

  @ViewChild('statusDialog') private statusDialog?: ElementRef<HTMLElement>;

  readonly pageSize = 10;
  readonly roleOptions: ReadonlyArray<{ value: UserRole; label: string }> = [
    { value: 'MEMBER', label: 'Member' },
    { value: 'MANAGER', label: 'Manager' },
    { value: 'ADMIN', label: 'Admin' },
  ];

  filterDraft: UserFilterDraft = this.emptyFilterDraft();
  appliedFilter: AppliedUserFilter | null = null;
  users: UserSummary[] = [];
  currentPage = 0;
  totalPages = 0;
  totalElements = 0;
  loading = false;
  hasLoaded = false;
  loadErrorMessage = '';
  pageMessage = '';
  statusConfirmation: StatusConfirmation | null = null;
  private loadGeneration = 0;
  private pendingStatusChanges = new Set<string>();
  private lastStatusActionTarget: HTMLElement | null = null;
  private focusStatusDialog = false;

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

  constructor() {
    this.createForm.controls.password.valueChanges.subscribe(() => this.createForm.controls.confirmPassword.updateValueAndValidity());
  }

  ngOnInit(): void {
    this.loadUsers(0);
  }

  ngAfterViewChecked(): void {
    if (!this.focusStatusDialog || !this.statusDialog) return;
    this.focusStatusDialog = false;
    this.statusDialog.nativeElement.focus();
  }

  get searchDraft(): string {
    return this.filterDraft.search;
  }

  set searchDraft(value: string) {
    this.setSearchDraft(value);
  }

  get roleDraft(): UserRole[] {
    return this.filterDraft.roles;
  }

  get filtersApplied(): boolean {
    return this.appliedFilter !== null || this.hasDraftFilters();
  }

  get filtering(): boolean {
    return this.loading && this.filtersApplied;
  }

  get canResetFilters(): boolean {
    return this.filtersApplied;
  }

  get appliedSearchDescription(): string {
    const filter = this.appliedFilter;
    if (!filter) return '';

    const parts: string[] = [];
    if (filter.search) parts.push(`Username/email: ${filter.search}`);
    if (filter.roles.length) parts.push(`Roles: ${filter.roles.join(', ')}`);
    return parts.join(' · ') || 'All Users';
  }

  loadUsers(page = this.currentPage): void {
    const requestedPage = Math.max(0, page);
    const generation = ++this.loadGeneration;
    const filter = this.appliedFilter;
    this.currentPage = requestedPage;
    this.loading = true;
    this.hasLoaded = false;
    this.loadErrorMessage = '';
    this.pageMessage = '';
    this.users = [];
    this.totalPages = 0;
    this.totalElements = 0;

    this.userService.list(requestedPage, this.pageSize, filter?.search ?? '', filter?.roles ?? []).subscribe({
      next: (result: UserPage) => {
        if (generation !== this.loadGeneration) return;
        this.setResult(result, requestedPage);
      },
      error: (error: unknown) => {
        if (generation !== this.loadGeneration) return;
        this.loading = false;
        this.loadErrorMessage = this.backendErrorMessage(error) ?? 'Unable to load Users right now.';
      },
    });
  }

  retryUsers(): void {
    if (!this.loading) this.loadUsers(this.currentPage);
  }

  setSearchDraft(value: string): void {
    this.filterDraft = { ...this.filterDraft, search: value };
  }

  toggleRole(role: UserRole, selected: boolean): void {
    if (selected && !this.filterDraft.roles.includes(role)) {
      this.filterDraft = { ...this.filterDraft, roles: [...this.filterDraft.roles, role] };
    } else if (!selected) {
      this.filterDraft = { ...this.filterDraft, roles: this.filterDraft.roles.filter((item) => item !== role) };
    }
  }

  applyFilters(): void {
    const draft = this.cloneDraft(this.filterDraft);
    this.appliedFilter = this.hasUserFilter(draft) ? draft : null;
    this.loadUsers(0);
  }

  clearFilters(): void {
    this.filterDraft = this.emptyFilterDraft();
    this.appliedFilter = null;
    this.loadUsers(0);
  }

  goToPage(page: number): void {
    if (this.loading || page < 0 || page >= this.totalPages || page === this.currentPage) return;
    this.loadUsers(page);
  }

  previousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  statusClass(status: UserStatus): string {
    return status === 'ACTIVE' ? 'active' : 'inactive';
  }

  openCreateDialog(): void {
    if (this.isCreatingUser) return;
    this.resetCreateForm();
    this.createUserErrorMessage = '';
    this.isCreateDialogOpen = true;
  }

  closeCreateDialog(): void {
    if (this.isCreatingUser) return;
    this.isCreateDialogOpen = false;
    this.createUserErrorMessage = '';
    this.resetCreateForm();
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
      next: () => {
        this.isCreatingUser = false;
        this.isCreateDialogOpen = false;
        this.resetCreateForm();
        this.notifications.showSuccess('User created successfully.');
        this.loadUsers(this.currentPage);
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

  isCurrentUser(user: UserSummary): boolean {
    const currentUser = this.authService.user();
    return currentUser !== null && String(currentUser.id) === String(user.id);
  }

  isSelfDeactivationUnavailable(user: UserSummary): boolean {
    return user.status === 'ACTIVE' && this.isCurrentUser(user);
  }

  isStatusChangePending(user: UserSummary): boolean {
    return this.pendingStatusChanges.has(this.userKey(user.id));
  }

  statusAction(user: UserSummary): UserStatus {
    return user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  }

  statusActionLabel(user: UserSummary): string {
    return this.statusChangeVerb(this.statusAction(user));
  }

  statusChangeVerb(status: UserStatus): string {
    return status === 'ACTIVE' ? 'Activate' : 'Deactivate';
  }

  statusChangeCopy(confirmation: StatusConfirmation): string {
    return confirmation.requestedStatus === 'INACTIVE'
      ? `This will prevent ${confirmation.user.username} from signing in and end the account's active sessions.`
      : `This will allow ${confirmation.user.username} to sign in again. Existing sessions are not restored.`;
  }

  requestStatusChange(user: UserSummary): void {
    if (this.isStatusChangePending(user) || this.isSelfDeactivationUnavailable(user)) return;

    this.lastStatusActionTarget = typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    this.statusConfirmation = {
      user,
      requestedStatus: this.statusAction(user),
      errorMessage: '',
    };
    this.focusStatusDialog = true;
  }

  cancelStatusChange(event?: MouseEvent): void {
    if (event && event.target !== event.currentTarget) return;
    if (this.statusConfirmation && this.isStatusChangePending(this.statusConfirmation.user)) return;

    this.statusConfirmation = null;
    this.focusStatusDialog = false;
    this.lastStatusActionTarget?.focus();
    this.lastStatusActionTarget = null;
  }

  confirmStatusChange(): void {
    const confirmation = this.statusConfirmation;
    if (!confirmation || this.isStatusChangePending(confirmation.user)) return;

    if (confirmation.requestedStatus === 'INACTIVE' && this.isCurrentUser(confirmation.user)) {
      this.statusConfirmation = {
        ...confirmation,
        errorMessage: 'You cannot deactivate your own account.',
      };
      return;
    }

    const userKey = this.userKey(confirmation.user.id);
    this.setStatusChangePending(userKey, true);
    this.statusConfirmation = { ...confirmation, errorMessage: '' };

    this.userService.updateStatus(confirmation.user.id, confirmation.requestedStatus).subscribe({
      next: () => {
        this.setStatusChangePending(userKey, false);
        this.cancelStatusChange();
        this.notifications.showSuccess(`${confirmation.user.username} ${confirmation.requestedStatus === 'ACTIVE' ? 'activated' : 'deactivated'} successfully.`);
        this.loadUsers(this.currentPage);
      },
      error: (error: unknown) => {
        this.setStatusChangePending(userKey, false);
        const message = this.statusMutationErrorMessage(error, confirmation.user);
        if (this.statusConfirmation && this.sameStatusConfirmation(this.statusConfirmation, confirmation)) {
          this.statusConfirmation = { ...this.statusConfirmation, errorMessage: message };
        }
        this.notifications.showError(message);
      },
    });
  }

  handleStatusDialogKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelStatusChange();
      return;
    }

    if (event.key !== 'Tab' || !this.statusDialog) return;
    const focusable = Array.from(this.statusDialog.nativeElement.querySelectorAll<HTMLButtonElement>('button:not([disabled])'));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private setResult(result: UserPage, requestedPage: number): void {
    this.users = result.content;
    this.currentPage = result.page;
    this.totalPages = result.totalPages;
    this.totalElements = result.totalElements;
    this.loading = false;
    this.hasLoaded = true;
    if (result.page !== requestedPage) {
      this.pageMessage = `The requested page was unavailable. Showing page ${result.page + 1} instead.`;
    }
  }

  private cloneDraft(draft: UserFilterDraft): AppliedUserFilter {
    return { search: draft.search.trim(), roles: [...draft.roles] };
  }

  private emptyFilterDraft(): UserFilterDraft {
    return { search: '', roles: [] };
  }

  private hasDraftFilters(): boolean {
    return this.hasUserFilter(this.filterDraft);
  }

  private hasUserFilter(filter: { search: string; roles: ReadonlyArray<UserRole> }): boolean {
    return filter.search.trim().length > 0 || filter.roles.length > 0;
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

  private backendErrorMessage(error: unknown): string | null {
    if (!(error instanceof HttpErrorResponse) || !error.error || typeof error.error !== 'object') return null;
    const message = (error.error as ApiErrorResponse).message;
    return typeof message === 'string' && message.trim() ? message.trim() : null;
  }

  private statusMutationErrorMessage(error: unknown, user: UserSummary): string {
    if (error instanceof HttpErrorResponse && error.error && typeof error.error === 'object') {
      const response = error.error as ApiErrorResponse;
      if (response.errorCode === 'USER_SELF_DEACTIVATION_NOT_ALLOWED') return 'You cannot deactivate your own account.';
    }

    return this.backendErrorMessage(error) ?? `Unable to update ${user.username}'s account status. Please try again.`;
  }

  private userKey(userId: UserSummary['id']): string {
    return String(userId);
  }

  private setStatusChangePending(userKey: string, pending: boolean): void {
    const next = new Set(this.pendingStatusChanges);
    if (pending) next.add(userKey);
    else next.delete(userKey);
    this.pendingStatusChanges = next;
  }

  private sameStatusConfirmation(left: StatusConfirmation, right: StatusConfirmation): boolean {
    return String(left.user.id) === String(right.user.id) && left.requestedStatus === right.requestedStatus;
  }
}
