import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { ApiErrorResponse } from '../../../../core/http/api.models';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { Skill, SkillCategory, SkillMutationRequest } from '../../models/master-data.models';
import { MasterDataService } from '../../services/master-data.service';

type SkillEditorMode = 'create' | 'edit' | null;
type EditableSkillField = 'name' | 'categoryId';

@Component({
  selector: 'app-skill-management',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './skill-management.component.html',
  styleUrl: './skill-management.component.scss',
})
export class SkillManagementComponent implements OnInit, OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly masterDataService = inject(MasterDataService);
  private readonly notifications = inject(NotificationService);
  private readonly destroy$ = new Subject<void>();

  readonly pageSize = 10;
  readonly skillForm = this.formBuilder.group({
    name: this.formBuilder.nonNullable.control('', [this.trimmedRequiredValidator(), Validators.maxLength(255)]),
    categoryId: this.formBuilder.control<number | string | null>(null, [Validators.required]),
  });

  skills: Skill[] = [];
  categories: SkillCategory[] = [];
  page = 0;
  totalElements = 0;
  totalPages = 0;
  search = '';
  searchDraft = '';
  isLoading = false;
  listError: unknown | null = null;

  categoriesLoading = false;
  categoriesError: unknown | null = null;

  editorMode: SkillEditorMode = null;
  editingSkillId: number | string | null = null;
  isSubmitting = false;
  editorErrorMessage = '';

  deleteConfirmation = false;
  deleteTarget: Skill | null = null;
  isDeleting = false;
  deleteErrorMessage = '';

  private listGeneration = 0;
  private categoryGeneration = 0;
  private mutationGeneration = 0;

  private readonly timestampFormatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  });

  ngOnInit(): void {
    this.loadCategories();
    this.loadSkills(0, '');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSkills(page = this.page, search = this.search): void {
    if (this.isLoading) return;

    const requestedPage = Math.max(0, page);
    const requestedSearch = search.trim();
    const generation = ++this.listGeneration;
    this.page = requestedPage;
    this.search = requestedSearch;
    this.listError = null;
    this.isLoading = true;
    this.skills = [];

    this.masterDataService.listSkills(requestedPage, this.pageSize, requestedSearch).pipe(takeUntil(this.destroy$)).subscribe({
      next: (result) => {
        if (generation !== this.listGeneration) return;
        this.skills = result.content;
        this.page = result.page;
        this.totalElements = result.totalElements;
        this.totalPages = result.totalPages;
        this.isLoading = false;
      },
      error: (error: unknown) => {
        if (generation !== this.listGeneration) return;
        this.isLoading = false;
        this.listError = error;
      },
    });
  }

  retrySkills(): void {
    if (!this.isLoading) this.loadSkills(this.page, this.search);
  }

  applySearch(): void {
    if (this.isLoading) return;
    this.loadSkills(0, this.searchDraft);
  }

  clearSearch(): void {
    if (this.isLoading && !this.search) return;
    this.searchDraft = '';
    this.loadSkills(0, '');
  }

  previousPage(): void {
    if (this.isLoading || this.page <= 0) return;
    this.loadSkills(this.page - 1, this.search);
  }

  nextPage(): void {
    if (this.isLoading || this.page + 1 >= this.totalPages) return;
    this.loadSkills(this.page + 1, this.search);
  }

  canGoPrevious(): boolean {
    return this.page > 0 && !this.isLoading;
  }

  canGoNext(): boolean {
    return this.page + 1 < this.totalPages && !this.isLoading;
  }

  loadCategories(): void {
    if (this.categoriesLoading) return;

    const generation = ++this.categoryGeneration;
    this.categoriesLoading = true;
    this.categoriesError = null;
    this.masterDataService.listSkillCategories().pipe(takeUntil(this.destroy$)).subscribe({
      next: (categories) => {
        if (generation !== this.categoryGeneration) return;
        this.categories = categories;
        this.categoriesLoading = false;
      },
      error: (error: unknown) => {
        if (generation !== this.categoryGeneration) return;
        this.categoriesLoading = false;
        this.categoriesError = error;
      },
    });
  }

  retryCategories(): void {
    if (!this.categoriesLoading) this.loadCategories();
  }

  openCreate(): void {
    if (this.isSubmitting) return;
    this.editorMode = 'create';
    this.editingSkillId = null;
    this.editorErrorMessage = '';
    this.clearServerErrors();
    this.skillForm.reset({ name: '', categoryId: null });
    this.skillForm.markAsPristine();
    this.skillForm.markAsUntouched();
  }

  openEdit(skill: Skill): void {
    if (this.isSubmitting) return;
    this.editorMode = 'edit';
    this.editingSkillId = skill.id;
    this.editorErrorMessage = '';
    this.clearServerErrors();
    this.skillForm.reset({ name: skill.name, categoryId: skill.categoryId });
    this.skillForm.markAsPristine();
    this.skillForm.markAsUntouched();
  }

  closeEditor(): void {
    if (this.isSubmitting) return;
    this.mutationGeneration++;
    this.editorMode = null;
    this.editingSkillId = null;
    this.isSubmitting = false;
    this.editorErrorMessage = '';
    this.clearServerErrors();
    this.skillForm.reset({ name: '', categoryId: null });
    this.skillForm.markAsPristine();
    this.skillForm.markAsUntouched();
  }

  submitSkill(): void {
    const mode = this.editorMode;
    if (!mode || this.isSubmitting) return;

    this.editorErrorMessage = '';
    this.clearServerErrors();
    if (this.skillForm.invalid) {
      this.skillForm.markAllAsTouched();
      return;
    }

    const value = this.skillForm.getRawValue();
    if (value.categoryId === null || value.categoryId === undefined) {
      this.skillForm.controls.categoryId.markAsTouched();
      return;
    }

    const request: SkillMutationRequest = {
      name: value.name.trim(),
      categoryId: value.categoryId,
    };
    const operationGeneration = ++this.mutationGeneration;
    this.isSubmitting = true;
    const request$ = mode === 'edit' && this.editingSkillId !== null
      ? this.masterDataService.updateSkill(this.editingSkillId, request)
      : this.masterDataService.createSkill(request);

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        if (operationGeneration !== this.mutationGeneration) return;
        this.isSubmitting = false;
        const message = mode === 'edit' ? 'Skill updated successfully.' : 'Skill created successfully.';
        this.closeEditor();
        this.notifications.showSuccess(message);
        this.loadSkills(this.page, this.search);
      },
      error: (error: unknown) => {
        if (operationGeneration !== this.mutationGeneration) return;
        this.isSubmitting = false;
        this.handleMutationError(error);
      },
    });
  }

  fieldInvalid(field: EditableSkillField): boolean {
    const control = this.skillForm.controls[field];
    return control.invalid && control.touched;
  }

  fieldError(field: EditableSkillField): string {
    const errors = this.skillForm.controls[field].errors;
    if (errors?.['server']) return errors['server'];
    if (errors?.['duplicate']) return errors['duplicate'];
    if (errors?.['required']) return field === 'name' ? 'Skill Name is required.' : 'Category is required.';
    if (errors?.['maxlength']) return 'Skill Name must be 255 characters or fewer.';
    return errors ? 'This value is not valid.' : '';
  }

  openDeleteConfirmation(skill: Skill): void {
    if (this.isDeleting) return;
    this.deleteTarget = skill;
    this.deleteErrorMessage = '';
    this.deleteConfirmation = true;
  }

  cancelDelete(): void {
    if (this.isDeleting) return;
    this.closeDeleteConfirmation();
  }

  confirmDelete(): void {
    const target = this.deleteTarget;
    if (!this.deleteConfirmation || !target || this.isDeleting) return;

    const requestedPage = this.page;
    const requestedSearch = this.search;
    const shouldLoadPreviousPage = requestedPage > 0 && this.skills.length === 1;
    this.isDeleting = true;
    this.deleteErrorMessage = '';
    this.masterDataService.deleteSkill(target.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isDeleting = false;
        this.closeDeleteConfirmation();
        this.notifications.showSuccess('Skill deleted successfully.');
        this.loadSkills(shouldLoadPreviousPage ? requestedPage - 1 : requestedPage, requestedSearch);
      },
      error: (error: unknown) => {
        this.isDeleting = false;
        this.handleDeleteError(error);
      },
    });
  }

  closeDeleteConfirmation(): void {
    if (this.isDeleting) return;
    this.deleteConfirmation = false;
    this.deleteTarget = null;
    this.deleteErrorMessage = '';
  }

  formatTimestamp(value: string | null | undefined): string {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : this.timestampFormatter.format(date);
  }

  private handleMutationError(error: unknown): void {
    const { status, response } = this.errorDetails(error);
    const errorCode = response?.errorCode;

    if (errorCode === 'SKILL_NAME_ALREADY_EXISTS') {
      this.setFieldError('name', 'A Skill with this name already exists.', 'duplicate');
      this.editorErrorMessage = 'Choose a different Skill Name.';
      return;
    }

    if (errorCode === 'SKILL_CATEGORY_NOT_FOUND') {
      this.setFieldError('categoryId', 'Select an available Category.', 'server');
      this.editorErrorMessage = 'The selected Category is no longer available. Categories were refreshed; select a Category and retry.';
      this.loadCategories();
      return;
    }

    if (errorCode === 'VALIDATION_ERROR' || status === 400) {
      this.applyFieldErrors(response?.data);
      this.editorErrorMessage = 'Please correct the highlighted fields.';
      return;
    }

    if (errorCode === 'SKILL_NOT_FOUND' || status === 404) {
      this.editorErrorMessage = 'This Skill no longer exists. Your entered values are still here; cancel or retry after reviewing the list.';
      return;
    }

    this.editorErrorMessage = this.backendMessage(response)
      || (status === 409 ? 'This Skill could not be saved because the record changed or conflicts with another record.' : 'Unable to save this Skill right now. Your entered values are still here.');
  }

  private handleDeleteError(error: unknown): void {
    const { status, response } = this.errorDetails(error);
    const errorCode = response?.errorCode;

    if (errorCode === 'SKILL_REFERENCED_BY_PROFILES') {
      this.deleteErrorMessage = 'This Skill is still in use by Profiles and was not deleted.';
      return;
    }

    if (errorCode === 'SKILL_NOT_FOUND' || status === 404) {
      this.deleteErrorMessage = 'This Skill no longer exists. The list was refreshed and no record was deleted from this screen.';
      this.loadSkills(this.page, this.search);
      return;
    }

    this.deleteErrorMessage = this.backendMessage(response)
      || 'Unable to delete this Skill right now. The record is still here and you can retry.';
  }

  private applyFieldErrors(data: unknown): void {
    const errors = (data as { errors?: unknown } | undefined)?.errors;
    if (!Array.isArray(errors)) return;

    for (const error of errors) {
      if (!error || typeof error !== 'object') continue;
      const field = this.normalizeField((error as { field?: unknown }).field);
      const message = (error as { message?: unknown }).message;
      if (field && typeof message === 'string') this.setFieldError(field, message, 'server');
    }
  }

  private normalizeField(field: unknown): EditableSkillField | null {
    if (typeof field !== 'string') return null;
    const name = field.split('.').pop();
    if (name === 'name' || name === 'skillName') return 'name';
    if (name === 'category' || name === 'categoryId') return 'categoryId';
    return null;
  }

  private clearServerErrors(): void {
    for (const control of Object.values(this.skillForm.controls)) {
      if (!control.errors?.['server'] && !control.errors?.['duplicate']) continue;
      const errors = { ...control.errors };
      delete errors['server'];
      delete errors['duplicate'];
      control.setErrors(Object.keys(errors).length ? errors : null);
    }
  }

  private setFieldError(field: EditableSkillField, message: string, key: 'server' | 'duplicate'): void {
    const control = this.skillForm.controls[field];
    control.setErrors({ ...control.errors, [key]: message.trim() || 'This value is not valid.' });
    control.markAsTouched();
  }

  private trimmedRequiredValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      return typeof control.value === 'string' && control.value.trim().length > 0 ? null : { required: true };
    };
  }

  private errorDetails(error: unknown): { status: number; response: ApiErrorResponse | null } {
    const candidate = error instanceof HttpErrorResponse
      ? error
      : error as { status?: unknown; error?: unknown };
    const response = candidate.error && typeof candidate.error === 'object'
      ? candidate.error as ApiErrorResponse
      : null;
    return { status: typeof candidate.status === 'number' ? candidate.status : 0, response };
  }

  private backendMessage(response: ApiErrorResponse | null): string | null {
    return typeof response?.message === 'string' && response.message.trim() ? response.message.trim() : null;
  }
}
