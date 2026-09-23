import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ApiErrorResponse } from '../../../../core/http/api.models';
import {
  FileNameFormat,
  FileNameFormatRequest,
  FileNamePlaceholder,
  FileNameSeparator,
} from '../../models/file-name-format.models';
import { FileNameFormatService } from '../../services/file-name-format.service';

export type FileNamePatternSegment =
  | { kind: 'placeholder'; value: FileNamePlaceholder }
  | { kind: 'separator'; value: string };

export const FILE_NAME_PLACEHOLDERS: ReadonlyArray<{ value: FileNamePlaceholder; label: string }> = [
  { value: 'LastName', label: 'LastName' },
  { value: 'FirstName', label: 'FirstName' },
  { value: 'Role', label: 'Role' },
  { value: 'Date', label: 'Date' },
];

const FILE_NAME_PLACEHOLDER_VALUES = new Set<FileNamePlaceholder>(FILE_NAME_PLACEHOLDERS.map((option) => option.value));

export function parseFileNamePattern(pattern: string): FileNamePatternSegment[] | null {
  const segments: FileNamePatternSegment[] = [];
  let cursor = 0;

  while (cursor < pattern.length) {
    if (pattern[cursor] === '{') {
      const close = pattern.indexOf('}', cursor + 1);
      if (close < 0) return null;
      const value = pattern.slice(cursor + 1, close);
      if (!isFileNamePlaceholder(value)) return null;
      segments.push({ kind: 'placeholder', value });
      cursor = close + 1;
      continue;
    }

    if (pattern[cursor] === '-' || pattern[cursor] === '_') {
      const start = cursor;
      while (cursor < pattern.length && (pattern[cursor] === '-' || pattern[cursor] === '_')) cursor++;
      segments.push({ kind: 'separator', value: pattern.slice(start, cursor) });
      continue;
    }

    return null;
  }

  return segments;
}

export function serializeFileNamePattern(segments: readonly FileNamePatternSegment[]): string {
  return segments.map((segment) => segment.kind === 'placeholder' ? `{${segment.value}}` : segment.value).join('');
}

function isFileNamePlaceholder(value: string): value is FileNamePlaceholder {
  return FILE_NAME_PLACEHOLDER_VALUES.has(value as FileNamePlaceholder);
}

function isFileNameSeparator(value: string): value is FileNameSeparator {
  return value === '-' || value === '_';
}

@Component({
  selector: 'app-file-name-format-editor',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './file-name-format-editor.component.html',
  styleUrl: './file-name-format-editor.component.scss',
})
export class FileNameFormatEditorComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly fileNameFormatService = inject(FileNameFormatService);

  private currentFormat: FileNameFormat | null = null;

  @Input()
  set format(value: FileNameFormat | null) {
    if (value === this.currentFormat && this.initializedFormatId !== undefined) return;
    this.currentFormat = value;
    if (this.formatForm) this.initializeEditor();
  }

  get format(): FileNameFormat | null {
    return this.currentFormat;
  }
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<FileNameFormat>();
  @Output() readonly stale = new EventEmitter<void>();

  readonly formatForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
  });
  readonly placeholderOptions = FILE_NAME_PLACEHOLDERS;
  readonly separatorOptions: ReadonlyArray<{ value: FileNameSeparator; label: string }> = [
    { value: '-', label: 'Hyphen (-)' },
    { value: '_', label: 'Underscore (_)' },
  ];

  patternSegments: FileNamePatternSegment[] = [];
  patternError = '';
  errorMessage = '';
  isSubmitting = false;
  invalidExistingPattern = false;
  private initializedFormatId: string | null | undefined;

  get isEditMode(): boolean {
    return this.format !== null;
  }

  get editorTitle(): string {
    return this.format ? 'Edit File Name Format' : 'Create File Name Format';
  }

  get submitLabel(): string {
    if (this.isSubmitting) return this.isEditMode ? 'Saving...' : 'Creating...';
    return this.isEditMode ? 'Save Format' : 'Create Format';
  }

  serializedPattern(): string {
    return serializeFileNamePattern(this.patternSegments);
  }

  isBuilderValid(): boolean {
    return !this.invalidExistingPattern
      && this.patternSegments.some((segment) => segment.kind === 'placeholder')
      && this.patternSegments.every((segment) => segment.kind === 'placeholder' || /^[\-_]+$/.test(segment.value));
  }

  canSubmit(): boolean {
    return !this.isSubmitting && this.formatForm.valid && this.isBuilderValid();
  }

  nameFieldInvalid(): boolean {
    const control = this.formatForm.controls.name;
    return control.invalid && control.touched;
  }

  nameFieldError(): string {
    const errors = this.formatForm.controls.name.errors;
    if (errors?.['backend']) return errors['backend'];
    if (errors?.['trimmedRequired']) return 'This field is required.';
    if (errors?.['required']) return 'This field is required.';
    if (errors?.['maxlength']) return `Use ${errors['maxlength'].requiredLength} characters or fewer.`;
    return errors ? 'This value is not valid.' : '';
  }

  placeholderLabel(value: FileNamePlaceholder): string {
    return this.placeholderOptions.find((option) => option.value === value)?.label ?? value;
  }

  availablePlaceholders(): ReadonlyArray<{ value: FileNamePlaceholder; label: string }> {
    return this.placeholderOptions.filter((option) => !this.patternSegments.some(
      (segment) => segment.kind === 'placeholder' && segment.value === option.value,
    ));
  }

  canAddPlaceholder(value: FileNamePlaceholder): boolean {
    return !this.patternSegments.some((segment) => segment.kind === 'placeholder' && segment.value === value);
  }

  addPlaceholder(value: FileNamePlaceholder): void {
    if (this.isSubmitting || !isFileNamePlaceholder(value) || !this.canAddPlaceholder(value)) return;
    this.patternSegments = [...this.patternSegments, { kind: 'placeholder', value }];
    this.clearPatternError();
  }

  addSeparator(value: FileNameSeparator): void {
    if (this.isSubmitting || !isFileNameSeparator(value)) return;
    this.patternSegments = [...this.patternSegments, { kind: 'separator', value }];
    this.clearPatternError();
  }

  changePlaceholder(index: number, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (!isFileNamePlaceholder(value) || this.isSubmitting) return;
    const segment = this.patternSegments[index];
    if (!segment || segment.kind !== 'placeholder') return;
    if (!this.canAddPlaceholderAt(value, index)) {
      this.patternError = 'Each placeholder can be used only once.';
      return;
    }
    this.patternSegments = this.patternSegments.map((item, itemIndex) => itemIndex === index ? { kind: 'placeholder', value } : item);
    this.clearPatternError();
  }

  changeSeparator(index: number, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (!isFileNameSeparator(value) || this.isSubmitting) return;
    const segment = this.patternSegments[index];
    if (!segment || segment.kind !== 'separator') return;
    const replacement = value.repeat(segment.value.length);
    this.patternSegments = this.patternSegments.map((item, itemIndex) => itemIndex === index ? { kind: 'separator', value: replacement } : item);
    this.clearPatternError();
  }

  removeSegment(index: number): void {
    if (this.isSubmitting || !this.patternSegments[index]) return;
    this.patternSegments = this.patternSegments.filter((_, itemIndex) => itemIndex !== index);
    this.clearPatternError();
  }

  movePlaceholder(index: number, direction: -1 | 1): void {
    if (this.isSubmitting || this.patternSegments[index]?.kind !== 'placeholder') return;
    const placeholderIndexes = this.patternSegments
      .map((segment, itemIndex) => segment.kind === 'placeholder' ? itemIndex : -1)
      .filter((itemIndex) => itemIndex >= 0);
    const placeholderPosition = placeholderIndexes.indexOf(index);
    const targetIndex = placeholderIndexes[placeholderPosition + direction];
    if (targetIndex === undefined) return;

    const current = this.patternSegments[index];
    const target = this.patternSegments[targetIndex];
    if (current.kind !== 'placeholder' || target.kind !== 'placeholder') return;
    this.patternSegments = this.patternSegments.map((segment, itemIndex) => {
      if (itemIndex === index) return { ...segment, value: target.value };
      if (itemIndex === targetIndex) return { ...segment, value: current.value };
      return segment;
    });
    this.clearPatternError();
  }

  canMovePlaceholder(index: number, direction: -1 | 1): boolean {
    if (this.patternSegments[index]?.kind !== 'placeholder') return false;
    const placeholderIndexes = this.patternSegments
      .map((segment, itemIndex) => segment.kind === 'placeholder' ? itemIndex : -1)
      .filter((itemIndex) => itemIndex >= 0);
    const position = placeholderIndexes.indexOf(index);
    return position >= 0 && placeholderIndexes[position + direction] !== undefined;
  }

  submit(): void {
    if (this.isSubmitting) return;
    this.errorMessage = '';
    this.clearBackendErrors();
    const name = this.formatForm.controls.name.value;
    if (!name.trim()) {
      this.formatForm.controls.name.setErrors({ ...this.formatForm.controls.name.errors, trimmedRequired: true });
    }
    if (!this.isBuilderValid()) this.patternError = this.patternError || 'Add at least one placeholder to the Pattern.';
    if (this.formatForm.invalid || !this.isBuilderValid()) {
      this.formatForm.markAllAsTouched();
      return;
    }

    const request: FileNameFormatRequest = { name: name.trim(), pattern: this.serializedPattern() };
    this.isSubmitting = true;
    const request$ = this.format
      ? this.fileNameFormatService.update(this.format.id, request)
      : this.fileNameFormatService.create(request);
    request$.subscribe({
      next: (format) => {
        this.isSubmitting = false;
        this.saved.emit(format);
      },
      error: (error: unknown) => this.handleSaveError(error),
    });
  }

  close(): void {
    if (!this.isSubmitting) this.closed.emit();
  }

  private initializeEditor(): void {
    this.errorMessage = '';
    this.patternError = '';
    this.invalidExistingPattern = false;
    this.isSubmitting = false;
    const parsed = this.format ? parseFileNamePattern(this.format.pattern) : [];
    this.patternSegments = parsed ?? [];
    this.formatForm.reset({ name: this.format?.name ?? '' });
    this.formatForm.markAsPristine();
    this.formatForm.markAsUntouched();
    this.initializedFormatId = this.format ? String(this.format.id) : null;
    if (this.format && (parsed === null || !this.isBuilderValid())) {
      this.invalidExistingPattern = true;
      this.patternError = 'This saved Pattern cannot be reconstructed safely with the supported placeholders.';
    }
  }

  canAddPlaceholderAt(value: FileNamePlaceholder, index: number): boolean {
    return !this.patternSegments.some((segment, itemIndex) => itemIndex !== index && segment.kind === 'placeholder' && segment.value === value);
  }

  private clearPatternError(): void {
    if (!this.invalidExistingPattern) this.patternError = '';
  }

  private clearBackendErrors(): void {
    const control = this.formatForm.controls.name;
    if (!control.errors?.['backend'] && !control.errors?.['trimmedRequired']) return;
    const errors = { ...control.errors };
    delete errors['backend'];
    delete errors['trimmedRequired'];
    control.setErrors(Object.keys(errors).length ? errors : null);
  }

  private handleSaveError(error: unknown): void {
    this.isSubmitting = false;
    const response = this.apiError(error);
    const errorCode = response?.errorCode;

    if (errorCode === 'FILE_NAME_FORMAT_NAME_ALREADY_EXISTS') {
      this.setNameError('A File Name Format with this name already exists.');
      this.errorMessage = 'Choose a different Format Name.';
      return;
    }

    if (errorCode === 'FILE_NAME_FORMAT_INVALID' || errorCode === 'VALIDATION_ERROR') {
      const applied = this.applyValidationErrors(response?.data);
      if (!applied) this.patternError = 'Use at least one supported placeholder and only hyphen or underscore separators.';
      this.errorMessage = 'Please correct the highlighted fields.';
      return;
    }

    if (errorCode === 'FILE_NAME_FORMAT_NOT_FOUND' || response?.status === 404) {
      this.errorMessage = 'This File Name Format is no longer available. The list was refreshed.';
      this.invalidExistingPattern = true;
      this.stale.emit();
      return;
    }

    this.errorMessage = 'Unable to save this File Name Format right now. Your entered values are still here.';
  }

  private applyValidationErrors(data: unknown): boolean {
    const errors = (data as { errors?: unknown } | undefined)?.errors;
    if (!Array.isArray(errors)) return false;
    let applied = false;
    for (const item of errors) {
      if (!item || typeof item !== 'object') continue;
      const { field, message } = item as { field?: unknown; message?: unknown };
      const normalizedField = typeof field === 'string' ? field.split('.').pop() : undefined;
      if (typeof message !== 'string') continue;
      if (normalizedField === 'name') {
        this.setNameError(message);
        applied = true;
      } else if (normalizedField === 'pattern') {
        this.patternError = message.trim() || 'This Pattern is not valid.';
        applied = true;
      }
    }
    return applied;
  }

  private setNameError(message: string): void {
    const control = this.formatForm.controls.name;
    control.setErrors({ ...control.errors, backend: message.trim() || 'This value is not valid.' });
    control.markAsTouched();
  }

  private apiError(error: unknown): (ApiErrorResponse & { status?: number }) | undefined {
    if (!(error instanceof HttpErrorResponse)) return undefined;
    return { ...(error.error as ApiErrorResponse), status: error.status };
  }
}
