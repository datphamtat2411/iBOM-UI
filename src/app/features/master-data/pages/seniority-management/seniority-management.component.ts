import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

import { ApiErrorResponse } from '../../../../core/http/api.models';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { Seniority, SeniorityRequest } from '../../models/seniority.models';
import { SeniorityService } from '../../services/seniority.service';

type SeniorityEditorMode = 'create' | 'edit' | null;
type SeniorityField = 'name' | 'fromExperience' | 'toExperience';

@Component({
  selector: 'app-seniority-management',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './seniority-management.component.html',
  styleUrl: './seniority-management.component.scss',
})
export class SeniorityManagementComponent implements OnInit, OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly seniorityService = inject(SeniorityService);
  private readonly notifications = inject(NotificationService);

  readonly seniorityForm = this.formBuilder.group({
    name: this.formBuilder.nonNullable.control('', [Validators.required]),
    fromExperience: this.formBuilder.control<number | null>(null, [
      Validators.required,
      Validators.min(0),
      this.finiteNumberValidator(),
    ]),
    toExperience: this.formBuilder.control<number | null>(null, [
      Validators.min(0),
      this.finiteNumberValidator(),
    ]),
    unlimited: this.formBuilder.nonNullable.control(true),
  }, { validators: this.rangeValidator() });

  seniorities: Seniority[] = [];
  isLoading = false;
  loadError: unknown | null = null;
  pageMessage = '';

  editorMode: SeniorityEditorMode = null;
  editorErrorMessage = '';
  isSubmitting = false;
  editingSeniorityId: number | string | null = null;

  deleteConfirmation = false;
  deleteTarget: Seniority | null = null;
  deleteErrorMessage = '';
  isDeleting = false;

  private listGeneration = 0;
  private formDestroyed = false;

  constructor() {
    this.seniorityForm.valueChanges.subscribe(() => {
      if (this.formDestroyed || this.isSubmitting) return;
      this.clearEditorBackendErrors();
      this.editorErrorMessage = '';
    });
    this.seniorityForm.controls.unlimited.valueChanges.subscribe((unlimited) => {
      this.applyUnlimitedState(unlimited);
    });
    this.applyUnlimitedState(true);
  }

  ngOnInit(): void {
    this.loadSeniorities();
  }

  ngOnDestroy(): void {
    this.formDestroyed = true;
  }

  loadSeniorities(): void {
    const generation = ++this.listGeneration;
    this.isLoading = true;
    this.loadError = null;
    this.seniorityService.list().subscribe({
      next: (seniorities) => {
        if (generation !== this.listGeneration) return;
        this.seniorities = this.sortSeniorities(seniorities);
        this.isLoading = false;
      },
      error: (error: unknown) => {
        if (generation !== this.listGeneration) return;
        this.loadError = error;
        this.isLoading = false;
      },
    });
  }

  retrySeniorities(): void {
    if (!this.isLoading) this.loadSeniorities();
  }

  startCreate(): void {
    if (this.isSubmitting || this.isDeleting) return;
    this.openEditor();
  }

  startEdit(seniority: Seniority): void {
    if (this.isSubmitting || this.isDeleting) return;
    this.openEditor(seniority);
  }

  cancelEditing(): void {
    if (this.isSubmitting) return;
    this.closeEditor();
  }

  submit(): void {
    const mode = this.editorMode;
    if (!mode || this.isSubmitting) return;

    this.editorErrorMessage = '';
    this.clearEditorBackendErrors();
    this.trimFormValues();
    this.seniorityForm.updateValueAndValidity();
    if (this.seniorityForm.invalid) {
      this.seniorityForm.markAllAsTouched();
      this.editorErrorMessage = 'Please correct the highlighted fields.';
      return;
    }

    const values = this.seniorityForm.getRawValue();
    const fromExperience = this.numericValue(values.fromExperience);
    if (fromExperience === null) {
      this.seniorityForm.controls.fromExperience.markAsTouched();
      this.editorErrorMessage = 'Please correct the highlighted fields.';
      return;
    }

    const request: SeniorityRequest = {
      name: values.name,
      fromExperience,
      toExperience: values.unlimited ? null : this.numericValue(values.toExperience),
    };
    const editingId = this.editingSeniorityId;
    this.isSubmitting = true;
    const request$ = mode === 'edit' && editingId !== null
      ? this.seniorityService.update(editingId, request)
      : this.seniorityService.create(request);

    request$.subscribe({
      next: (seniority) => {
        this.seniorities = this.sortSeniorities(mode === 'edit' && editingId !== null
          ? this.seniorities.map((item) => String(item.id) === String(editingId) ? seniority : item)
          : [...this.seniorities, seniority]);
        this.isSubmitting = false;
        this.notifications.showSuccess(mode === 'edit' ? 'Seniority updated successfully.' : 'Seniority created successfully.');
        this.closeEditor();
      },
      error: (error: unknown) => this.handleSaveError(error),
    });
  }

  openDeleteConfirmation(seniority: Seniority): void {
    if (this.isSubmitting || this.isDeleting) return;
    this.deleteTarget = seniority;
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

    this.isDeleting = true;
    this.deleteErrorMessage = '';
    this.seniorityService.delete(target.id).subscribe({
      next: () => {
        this.seniorities = this.seniorities.filter((item) => String(item.id) !== String(target.id));
        this.isDeleting = false;
        this.notifications.showSuccess('Seniority deleted successfully.');
        this.closeDeleteConfirmation();
      },
      error: (error: unknown) => this.handleDeleteError(error),
    });
  }

  setUnlimited(unlimited: boolean): void {
    this.seniorityForm.controls.unlimited.setValue(unlimited);
  }

  fieldInvalid(field: SeniorityField): boolean {
    const control = this.seniorityForm.controls[field];
    return (control.invalid || (field === 'toExperience' && this.seniorityForm.hasError('range')))
      && control.touched;
  }

  fieldError(field: SeniorityField): string {
    const errors = this.seniorityForm.controls[field].errors;
    if (errors?.['backend']) return errors['backend'];
    if (errors?.['required']) return 'This field is required.';
    if (errors?.['min']) return 'Enter a non-negative number.';
    if (errors?.['finite']) return 'Enter a finite number.';
    if (field === 'toExperience' && this.seniorityForm.hasError('range')) return 'Maximum Experience must be greater than Minimum Experience.';
    return errors ? 'This value is not valid.' : '';
  }

  seniorityRangeLabel(seniority: Seniority): string {
    return `${seniority.fromExperience}–${seniority.toExperience === null ? 'Unlimited' : seniority.toExperience}`;
  }

  formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  }

  private openEditor(seniority?: Seniority): void {
    const unlimited = seniority?.toExperience === null || seniority === undefined;
    this.editorMode = seniority ? 'edit' : 'create';
    this.editingSeniorityId = seniority?.id ?? null;
    this.editorErrorMessage = '';
    this.seniorityForm.reset({
      name: seniority?.name ?? '',
      fromExperience: seniority?.fromExperience ?? null,
      toExperience: seniority?.toExperience ?? null,
      unlimited,
    }, { emitEvent: false });
    this.applyUnlimitedState(unlimited);
    this.seniorityForm.markAsPristine();
    this.seniorityForm.markAsUntouched();
    this.seniorityForm.updateValueAndValidity();
  }

  private closeEditor(): void {
    this.editorMode = null;
    this.editingSeniorityId = null;
    this.editorErrorMessage = '';
    this.isSubmitting = false;
    this.seniorityForm.reset({ name: '', fromExperience: null, toExperience: null, unlimited: true }, { emitEvent: false });
    this.applyUnlimitedState(true);
    this.seniorityForm.markAsPristine();
    this.seniorityForm.markAsUntouched();
  }

  private closeDeleteConfirmation(): void {
    this.deleteConfirmation = false;
    this.deleteTarget = null;
    this.deleteErrorMessage = '';
    this.isDeleting = false;
  }

  private handleSaveError(error: unknown): void {
    this.isSubmitting = false;
    const details = this.apiError(error);
    const errorCode = details.response?.errorCode;
    const backendMessage = this.backendMessage(details.response);

    if (this.isNotFound(details.status, errorCode)) {
      this.closeEditor();
      this.showStaleRecordError(backendMessage);
      return;
    }
    if (errorCode === 'SENIORITY_NAME_ALREADY_EXISTS') {
      this.setFieldError('name', backendMessage || 'A Seniority with this name already exists.');
      this.editorErrorMessage = backendMessage || 'A Seniority with this name already exists.';
      return;
    }
    if (errorCode === 'SENIORITY_RANGE_CONFLICT') {
      this.setFieldError('toExperience', backendMessage || 'This experience range conflicts with an existing Seniority range.');
      this.editorErrorMessage = backendMessage || 'This experience range conflicts with an existing Seniority range.';
      return;
    }
    if (errorCode === 'VALIDATION_ERROR') {
      this.applyValidationErrors(details.response?.data);
      this.editorErrorMessage = backendMessage || 'Please correct the highlighted fields.';
      return;
    }

    this.editorErrorMessage = backendMessage || 'Unable to save this Seniority right now. Your changes are still here.';
  }

  private handleDeleteError(error: unknown): void {
    this.isDeleting = false;
    const details = this.apiError(error);
    const errorCode = details.response?.errorCode;
    const backendMessage = this.backendMessage(details.response);

    if (this.isNotFound(details.status, errorCode)) {
      this.closeDeleteConfirmation();
      this.showStaleRecordError(backendMessage);
      return;
    }
    if (errorCode === 'SENIORITY_IN_USE') {
      this.deleteErrorMessage = backendMessage || 'This Seniority is in use and cannot be deleted yet.';
      return;
    }

    this.deleteErrorMessage = backendMessage || 'Unable to delete this Seniority right now. The record is still here and you can retry.';
  }

  private showStaleRecordError(message: string): void {
    this.pageMessage = message || 'This Seniority record is stale and is no longer available. The list was refreshed.';
    this.loadSeniorities();
  }

  private applyValidationErrors(data: unknown): void {
    const errors = (data as { errors?: unknown } | undefined)?.errors;
    if (!Array.isArray(errors)) return;
    for (const error of errors) {
      if (!error || typeof error !== 'object') continue;
      const candidate = error as { field?: unknown; message?: unknown };
      const field = typeof candidate.field === 'string' ? candidate.field.split('.').pop() : undefined;
      if (field && typeof candidate.message === 'string' && this.isSeniorityField(field)) {
        this.setFieldError(field, candidate.message);
      }
    }
  }

  private clearEditorBackendErrors(): void {
    for (const control of Object.values(this.seniorityForm.controls)) {
      if (!control.errors?.['backend']) continue;
      const errors = { ...control.errors };
      delete errors['backend'];
      control.setErrors(Object.keys(errors).length ? errors : null);
    }
  }

  private setFieldError(field: SeniorityField, message: string): void {
    const control = this.seniorityForm.controls[field];
    control.setErrors({ ...control.errors, backend: message.trim() || 'This value is not valid.' });
    control.markAsTouched();
  }

  private trimFormValues(): void {
    const value = this.seniorityForm.controls.name.value;
    this.seniorityForm.controls.name.setValue(value.trim(), { emitEvent: false });
    this.seniorityForm.controls.name.updateValueAndValidity({ emitEvent: false });
  }

  private applyUnlimitedState(unlimited: boolean): void {
    const maximum = this.seniorityForm.controls.toExperience;
    if (unlimited) {
      maximum.reset(null, { emitEvent: false });
      maximum.disable({ emitEvent: false });
    } else {
      maximum.enable({ emitEvent: false });
    }
    this.seniorityForm.updateValueAndValidity({ emitEvent: false });
  }

  private rangeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const unlimited = control.get('unlimited')?.value === true;
      if (unlimited) return null;
      const minimum = this.numericValue(control.get('fromExperience')?.value);
      const maximum = this.numericValue(control.get('toExperience')?.value);
      if (minimum === null || maximum === null) return null;
      return maximum > minimum ? null : { range: true };
    };
  }

  private finiteNumberValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (control.value === null || control.value === '') return null;
      return Number.isFinite(Number(control.value)) ? null : { finite: true };
    };
  }

  private numericValue(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  private sortSeniorities(seniorities: Seniority[]): Seniority[] {
    return [...seniorities].sort((left, right) => left.fromExperience - right.fromExperience);
  }

  private isSeniorityField(field: string): field is SeniorityField {
    return field === 'name' || field === 'fromExperience' || field === 'toExperience';
  }

  private isNotFound(status: number, errorCode: string | undefined): boolean {
    return errorCode === 'SENIORITY_NOT_FOUND' || (status === 404 && !errorCode);
  }

  private apiError(error: unknown): { status: number; response: ApiErrorResponse | undefined } {
    if (!(error instanceof HttpErrorResponse)) return { status: 0, response: undefined };
    const response = error.error && typeof error.error === 'object' ? error.error as ApiErrorResponse : undefined;
    return { status: error.status, response };
  }

  private backendMessage(response: ApiErrorResponse | undefined): string {
    return typeof response?.message === 'string' ? response.message.trim() : '';
  }
}
