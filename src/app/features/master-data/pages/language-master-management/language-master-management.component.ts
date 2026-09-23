import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';

import { ApiErrorResponse } from '../../../../core/http/api.models';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { LanguageMaster, LanguageMasterRequest } from '../../models/language-master.models';
import { LanguageMasterService } from '../../services/language-master.service';

type LanguageEditorMode = 'create' | 'edit';
type PendingMutation = 'create' | 'update' | 'delete' | null;

interface ValidationViolation {
  field?: unknown;
  message?: unknown;
}

@Component({
  selector: 'app-language-master-management',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './language-master-management.component.html',
  styleUrl: './language-master-management.component.scss',
})
export class LanguageMasterManagementComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly languageService = inject(LanguageMasterService);
  private readonly notifications = inject(NotificationService);

  readonly pageSize = 10;
  readonly editorForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(255), this.languageNameValidator]],
  });

  languages: LanguageMaster[] = [];
  currentPage = 0;
  totalPages = 0;
  totalElements = 0;
  searchTerm = '';
  searchDraft = '';
  loading = false;
  hasLoaded = false;
  loadError: unknown | null = null;
  pageMessage = '';

  editorOpen = false;
  editorMode: LanguageEditorMode = 'create';
  editingLanguageId: number | string | null = null;
  editorErrorMessage = '';
  pendingMutation: PendingMutation = null;

  deleteConfirmationOpen = false;
  deleteTarget: LanguageMaster | null = null;
  deleteErrorMessage = '';

  private loadGeneration = 0;
  private readonly timestampFormatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  });

  ngOnInit(): void {
    this.loadLanguages(0);
  }

  loadLanguages(page = this.currentPage, search = this.searchTerm): void {
    const requestedPage = Math.max(0, page);
    const requestedSearch = search.trim();
    const generation = ++this.loadGeneration;
    this.currentPage = requestedPage;
    this.searchTerm = requestedSearch;
    this.loading = true;
    this.loadError = null;
    this.languages = [];
    this.totalPages = 0;
    this.totalElements = 0;
    this.hasLoaded = false;

    this.languageService.list(requestedPage, this.pageSize, requestedSearch).subscribe({
      next: (result) => {
        if (generation !== this.loadGeneration) return;
        this.languages = result.content;
        this.currentPage = result.page;
        this.totalPages = result.totalPages;
        this.totalElements = result.totalElements;
        this.loading = false;
        this.hasLoaded = true;
      },
      error: (error: unknown) => {
        if (generation !== this.loadGeneration) return;
        this.loading = false;
        this.loadError = error;
      },
    });
  }

  retryLanguages(): void {
    if (!this.loading) this.loadLanguages(this.currentPage);
  }

  setSearchDraft(value: string): void {
    this.searchDraft = value;
    if (!value.trim() && this.searchTerm) this.searchLanguages();
  }

  searchLanguages(): void {
    this.searchTerm = this.searchDraft.trim();
    this.loadLanguages(0);
  }

  clearSearch(): void {
    this.searchDraft = '';
    this.searchTerm = '';
    this.loadLanguages(0);
  }

  goToPage(page: number): void {
    if (this.loading || this.pendingMutation !== null || page < 0 || page >= this.totalPages || page === this.currentPage) return;
    this.loadLanguages(page);
  }

  previousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  startCreate(): void {
    if (this.pendingMutation !== null) return;
    this.editorMode = 'create';
    this.editingLanguageId = null;
    this.editorForm.reset({ name: '' });
    this.clearEditorState();
    this.editorOpen = true;
  }

  startEdit(language: LanguageMaster): void {
    if (this.pendingMutation !== null) return;
    this.editorMode = 'edit';
    this.editingLanguageId = language.id;
    this.editorForm.reset({ name: language.name });
    this.clearEditorState();
    this.editorOpen = true;
  }

  cancelEditor(): void {
    if (this.pendingMutation !== null) return;
    this.editorOpen = false;
    this.editingLanguageId = null;
    this.editorForm.reset({ name: '' });
    this.clearEditorState();
  }

  submitEditor(): void {
    if (!this.editorOpen || this.pendingMutation !== null) return;

    this.clearEditorBackendErrors();
    const rawName = this.editorForm.controls.name.value;
    if (!rawName.trim()) {
      this.editorForm.controls.name.markAsTouched();
      this.editorErrorMessage = 'Please enter Language Name.';
      return;
    }
    if (this.editorForm.invalid) {
      this.editorForm.markAllAsTouched();
      this.editorErrorMessage = 'Please correct the highlighted fields.';
      return;
    }

    const request: LanguageMasterRequest = { name: rawName.trim() };
    const mode = this.editorMode;
    const languageId = this.editingLanguageId;
    if (mode === 'edit' && languageId === null) return;

    this.pendingMutation = mode === 'create' ? 'create' : 'update';
    const request$ = mode === 'create'
      ? this.languageService.create(request)
      : this.languageService.update(languageId as number | string, request);

    request$.subscribe({
      next: () => {
        this.pendingMutation = null;
        this.editorOpen = false;
        this.editingLanguageId = null;
        this.editorForm.reset({ name: '' });
        this.clearEditorState();
        this.notifications.showSuccess(mode === 'create' ? 'Language created successfully.' : 'Language updated successfully.');
        this.loadLanguages(this.currentPage);
      },
      error: (error: unknown) => {
        this.pendingMutation = null;
        this.handleEditorError(error);
      },
    });
  }

  editorNameInvalid(): boolean {
    const control = this.editorForm.controls.name;
    return control.invalid && control.touched;
  }

  editorNameError(): string {
    const errors = this.editorForm.controls.name.errors;
    if (errors?.['backend']) return errors['backend'];
    if (errors?.['duplicate']) return errors['duplicate'];
    if (errors?.['blank']) return 'Please enter Language Name.';
    if (errors?.['required']) return 'Please enter Language Name.';
    if (errors?.['maxlength']) return 'Language Name must be 255 characters or fewer.';
    return '';
  }

  formatTimestamp(value: string | null | undefined): string {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : this.timestampFormatter.format(date);
  }

  openDeleteConfirmation(language: LanguageMaster): void {
    if (this.pendingMutation !== null) return;
    this.deleteTarget = language;
    this.deleteErrorMessage = '';
    this.deleteConfirmationOpen = true;
  }

  cancelDelete(): void {
    if (this.pendingMutation === 'delete') return;
    this.deleteConfirmationOpen = false;
    this.deleteTarget = null;
    this.deleteErrorMessage = '';
  }

  confirmDelete(): void {
    const target = this.deleteTarget;
    if (!this.deleteConfirmationOpen || !target || this.pendingMutation !== null) return;

    const requestedPage = this.currentPage;
    const requestedSearch = this.searchTerm;
    const shouldLoadPreviousPage = requestedPage > 0 && this.languages.length === 1;
    this.pendingMutation = 'delete';
    this.deleteErrorMessage = '';
    this.languageService.delete(target.id).subscribe({
      next: () => {
        this.pendingMutation = null;
        this.deleteConfirmationOpen = false;
        this.deleteTarget = null;
        this.notifications.showSuccess('Language deleted successfully.');
        this.loadLanguages(shouldLoadPreviousPage ? requestedPage - 1 : requestedPage, requestedSearch);
      },
      error: (error: unknown) => {
        this.pendingMutation = null;
        this.handleDeleteError(error);
      },
    });
  }

  private handleEditorError(error: unknown): void {
    const code = this.errorCode(error);
    const status = this.errorStatus(error);

    if (code === 'LANGUAGE_ALREADY_EXISTS' || status === 409) {
      const message = this.errorMessage(error) || 'A Language with this name already exists.';
      this.setNameError('duplicate', message);
      this.editorErrorMessage = message;
      return;
    }
    if (code === 'VALIDATION_ERROR' || status === 400) {
      this.applyValidationErrors(error);
      this.editorErrorMessage = this.validationMessage(error);
      return;
    }
    if (code === 'LANGUAGE_NOT_FOUND' || status === 404) {
      this.editorOpen = false;
      this.editingLanguageId = null;
      this.pageMessage = 'This Language no longer exists. The list has been refreshed.';
      this.loadLanguages(this.currentPage);
      return;
    }

    this.editorErrorMessage = this.errorMessage(error) || 'Unable to save this Language right now. Your entered value is still here.';
  }

  private handleDeleteError(error: unknown): void {
    const code = this.errorCode(error);
    const status = this.errorStatus(error);

    if (code === 'LANGUAGE_IN_USE' || status === 409) {
      this.deleteErrorMessage = 'This Language is referenced by Profile data and cannot be deleted.';
      return;
    }
    if (code === 'LANGUAGE_NOT_FOUND' || status === 404) {
      this.deleteConfirmationOpen = false;
      this.deleteTarget = null;
      this.pageMessage = 'This Language no longer exists. The list has been refreshed.';
      this.loadLanguages(this.currentPage);
      return;
    }
    if (code === 'VALIDATION_ERROR' || status === 400) {
      this.deleteErrorMessage = this.validationMessage(error);
      return;
    }

    this.deleteErrorMessage = this.errorMessage(error) || 'Unable to delete this Language right now. The record is still here and you can retry.';
  }

  private applyValidationErrors(error: unknown): void {
    const data = this.errorPayload(error)?.data as { errors?: unknown } | undefined;
    if (!Array.isArray(data?.errors)) return;
    for (const violation of data.errors as ValidationViolation[]) {
      if (!violation || typeof violation !== 'object' || typeof violation.message !== 'string') continue;
      const field = typeof violation.field === 'string' ? violation.field.split('.').pop() : undefined;
      if (field === 'name') this.setNameError('backend', violation.message);
    }
  }

  private validationMessage(error: unknown): string {
    const data = this.errorPayload(error)?.data as { errors?: unknown } | undefined;
    const first = Array.isArray(data?.errors)
      ? (data.errors as ValidationViolation[]).find((violation) => typeof violation?.message === 'string')
      : undefined;
    return typeof first?.message === 'string' ? first.message : 'Please correct the highlighted fields.';
  }

  private clearEditorState(): void {
    this.editorErrorMessage = '';
    this.clearEditorBackendErrors();
  }

  private clearEditorBackendErrors(): void {
    const control = this.editorForm.controls.name;
    if (!control.errors?.['backend'] && !control.errors?.['duplicate']) return;
    const errors = { ...control.errors };
    delete errors['backend'];
    delete errors['duplicate'];
    control.setErrors(Object.keys(errors).length ? errors : null);
  }

  private setNameError(key: string, message: string): void {
    const control = this.editorForm.controls.name;
    control.setErrors({ ...control.errors, [key]: message });
    control.markAsTouched();
  }

  private languageNameValidator(control: AbstractControl): ValidationErrors | null {
    return typeof control.value === 'string' && control.value.trim() ? null : { blank: true };
  }

  private errorPayload(error: unknown): ApiErrorResponse | undefined {
    if (!(error instanceof HttpErrorResponse) || !error.error || typeof error.error !== 'object') return undefined;
    return error.error as ApiErrorResponse;
  }

  private errorCode(error: unknown): string | undefined {
    const code = this.errorPayload(error)?.errorCode;
    return typeof code === 'string' ? code : undefined;
  }

  private errorStatus(error: unknown): number | undefined {
    return error instanceof HttpErrorResponse ? error.status : undefined;
  }

  private errorMessage(error: unknown): string | undefined {
    const message = this.errorPayload(error)?.message;
    return typeof message === 'string' && message.trim() ? message.trim() : undefined;
  }
}
