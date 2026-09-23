import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ApiErrorResponse } from '../../../../core/http/api.models';
import {
  FileNameFormat,
  FileNameFormatRequest,
  FileNamePatternBuilderState,
  FileNamePlaceholder,
  FileNameSeparator,
} from '../../models/file-name-format.models';
import { FileNameFormatService } from '../../services/file-name-format.service';

export const FILE_NAME_PLACEHOLDERS: ReadonlyArray<{ value: FileNamePlaceholder; label: string }> = [
  { value: 'LastName', label: 'LastName' },
  { value: 'FirstName', label: 'FirstName' },
  { value: 'Role', label: 'Role' },
  { value: 'Date', label: 'Date' },
];

const FILE_NAME_PLACEHOLDER_VALUES = new Set<FileNamePlaceholder>(FILE_NAME_PLACEHOLDERS.map((option) => option.value));

export type FileNamePatternAnalysis =
  | { kind: 'canonical'; state: FileNamePatternBuilderState }
  | { kind: 'recoverable'; placeholders: FileNamePlaceholder[] };

export function parseFileNamePattern(pattern: string): FileNamePatternBuilderState | null {
  const analysis = analyzeFileNamePattern(pattern);
  return analysis?.kind === 'canonical' ? analysis.state : null;
}

export function analyzeFileNamePattern(pattern: string): FileNamePatternAnalysis | null {
  if (!pattern) return null;

  const placeholders: FileNamePlaceholder[] = [];
  const literals: string[] = [];
  let cursor = 0;

  while (cursor <= pattern.length) {
    const open = pattern.indexOf('{', cursor);
    if (open < 0) {
      literals.push(pattern.slice(cursor));
      break;
    }
    literals.push(pattern.slice(cursor, open));
    const close = pattern.indexOf('}', open + 1);
    if (close < 0) return null;

    const value = pattern.slice(open + 1, close);
    if (!isFileNamePlaceholder(value) || placeholders.includes(value)) return null;
    placeholders.push(value);
    cursor = close + 1;
  }

  if (!placeholders.length || literals.some((literal) => [...literal].some((character) => character !== '-' && character !== '_'))) return null;

  if (literals[0] !== '' || literals.at(-1) !== '') return { kind: 'recoverable', placeholders };

  let separator: Exclude<FileNameSeparator, 'none'> | undefined;
  for (const literal of literals.slice(1, -1)) {
    if (!literal) continue;
    if (literal.length !== 1) return { kind: 'recoverable', placeholders };
    const current = literal as Exclude<FileNameSeparator, 'none'>;
    if (separator !== undefined && separator !== current) return { kind: 'recoverable', placeholders };
    separator = current;
  }

  return { kind: 'canonical', state: { placeholders, separator: separator ?? 'none' } };
}

export function serializeFileNamePattern(state: Readonly<FileNamePatternBuilderState>): string {
  const separator = state.separator === 'none' ? '' : state.separator;
  return state.placeholders.map((placeholder) => `{${placeholder}}`).join(separator);
}

function isFileNamePlaceholder(value: string): value is FileNamePlaceholder {
  return FILE_NAME_PLACEHOLDER_VALUES.has(value as FileNamePlaceholder);
}

function isFileNameSeparator(value: string): value is FileNameSeparator {
  return value === 'none' || value === '-' || value === '_';
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
    name: ['', [Validators.required, Validators.maxLength(255)]],
  });
  readonly placeholderOptions = FILE_NAME_PLACEHOLDERS;
  readonly separatorOptions: ReadonlyArray<{ value: FileNameSeparator; label: string }> = [
    { value: 'none', label: 'None' },
    { value: '_', label: 'Underscore (_)' },
    { value: '-', label: 'Hyphen (-)' },
  ];

  patternState: FileNamePatternBuilderState = { placeholders: [], separator: 'none' };
  patternError = '';
  errorMessage = '';
  isSubmitting = false;
  invalidExistingPattern = false;
  normalizationPending = false;
  reorderAnnouncement = '';
  originalPattern = '';
  private draggedPlaceholderIndex: number | null = null;
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
    return this.invalidExistingPattern || this.normalizationPending ? this.originalPattern : serializeFileNamePattern(this.patternState);
  }

  isBuilderValid(): boolean {
    const placeholders = this.patternState.placeholders;
    return !this.invalidExistingPattern
      && !this.normalizationPending
      && placeholders.length > 0
      && new Set(placeholders).size === placeholders.length;
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
    if (errors?.['trimmedRequired']) return 'Please enter Format Name.';
    if (errors?.['required']) return 'Please enter Format Name.';
    if (errors?.['maxlength']) return `Use ${errors['maxlength'].requiredLength} characters or fewer.`;
    return errors ? 'This value is not valid.' : '';
  }

  placeholderLabel(value: FileNamePlaceholder): string {
    return this.placeholderOptions.find((option) => option.value === value)?.label ?? value;
  }

  availablePlaceholders(): ReadonlyArray<{ value: FileNamePlaceholder; label: string }> {
    return this.placeholderOptions.filter((option) => !this.patternState.placeholders.includes(option.value));
  }

  availablePlaceholdersFor(index: number): ReadonlyArray<{ value: FileNamePlaceholder; label: string }> {
    const current = this.patternState.placeholders[index];
    return this.availablePlaceholders().filter((option) => option.value !== current);
  }

  canAddPlaceholder(value: FileNamePlaceholder): boolean {
    return !this.patternState.placeholders.includes(value);
  }

  addPlaceholder(value: FileNamePlaceholder): void {
    if (this.isSubmitting || this.normalizationPending || !isFileNamePlaceholder(value) || !this.canAddPlaceholder(value)) return;
    this.patternState = { ...this.patternState, placeholders: [...this.patternState.placeholders, value] };
    this.clearPatternError();
  }

  setSeparator(value: string): void {
    if (this.isSubmitting || !isFileNameSeparator(value)) return;
    this.patternState = { ...this.patternState, separator: value };
    this.normalizationPending = false;
    this.clearPatternError();
  }

  changePlaceholder(index: number, event: Event): void {
    this.replacePlaceholder(index, (event.target as HTMLSelectElement).value);
  }

  replacePlaceholder(index: number, value: string): void {
    if (this.isSubmitting || this.normalizationPending || !isFileNamePlaceholder(value)) return;
    const current = this.patternState.placeholders[index];
    if (current === undefined || !this.canAddPlaceholderAt(value, index)) {
      this.patternError = 'Each placeholder can be used only once.';
      return;
    }
    const placeholders = [...this.patternState.placeholders];
    placeholders[index] = value;
    this.patternState = { ...this.patternState, placeholders };
    this.clearPatternError();
  }

  removePlaceholder(index: number): void {
    if (this.isSubmitting || this.normalizationPending || this.patternState.placeholders[index] === undefined) return;
    this.patternState = {
      ...this.patternState,
      placeholders: this.patternState.placeholders.filter((_, itemIndex) => itemIndex !== index),
    };
    this.clearPatternError();
  }

  movePlaceholder(index: number, direction: -1 | 1): void {
    if (this.isSubmitting || this.normalizationPending) return;
    const targetIndex = index + direction;
    if (!this.canMovePlaceholder(index, direction)) return;
    this.reorderPlaceholder(index, targetIndex);
    this.focusReorderHandle(targetIndex);
  }

  canMovePlaceholder(index: number, direction: -1 | 1): boolean {
    return this.patternState.placeholders[index] !== undefined
      && index + direction >= 0
      && index + direction < this.patternState.placeholders.length;
  }

  handleReorderKeydown(index: number, event: KeyboardEvent): void {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    const direction = event.key === 'ArrowUp' ? -1 : 1;
    this.movePlaceholder(index, direction);
  }

  startPlaceholderDrag(index: number, event: DragEvent): void {
    if (this.isSubmitting || this.normalizationPending) return;
    this.draggedPlaceholderIndex = index;
    event.dataTransfer?.setData('text/plain', String(index));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  allowPlaceholderDrop(event: DragEvent): void {
    if (this.draggedPlaceholderIndex !== null) event.preventDefault();
  }

  dropPlaceholder(index: number, event: DragEvent): void {
    event.preventDefault();
    if (this.normalizationPending) return;
    const transferredIndex = event.dataTransfer?.getData('text/plain');
    const sourceIndex = this.draggedPlaceholderIndex ?? (transferredIndex ? Number(transferredIndex) : NaN);
    this.draggedPlaceholderIndex = null;
    if (!Number.isInteger(sourceIndex) || sourceIndex < 0 || sourceIndex >= this.patternState.placeholders.length) return;
    if (sourceIndex !== index && !this.isSubmitting) this.reorderPlaceholder(sourceIndex, index);
  }

  endPlaceholderDrag(): void {
    this.draggedPlaceholderIndex = null;
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
    this.normalizationPending = false;
    this.isSubmitting = false;
    this.reorderAnnouncement = '';
    this.originalPattern = this.format?.pattern ?? '';
    const analysis = this.format ? analyzeFileNamePattern(this.format.pattern) : null;
    this.patternState = analysis?.kind === 'canonical'
      ? analysis.state
      : analysis?.kind === 'recoverable'
        ? { placeholders: analysis.placeholders, separator: 'none' }
        : { placeholders: [], separator: 'none' };
    this.formatForm.reset({ name: this.format?.name ?? '' });
    this.formatForm.markAsPristine();
    this.formatForm.markAsUntouched();
    this.initializedFormatId = this.format ? String(this.format.id) : null;
    if (this.format && analysis?.kind === 'recoverable') {
      this.normalizationPending = true;
      this.patternError = 'Select one global separator to normalize this saved Pattern before editing or saving.';
    } else if (this.format && analysis === null) {
      this.invalidExistingPattern = true;
      this.patternError = 'This saved Pattern cannot be reconstructed safely with the supported placeholders.';
    }
  }

  canAddPlaceholderAt(value: FileNamePlaceholder, index: number): boolean {
    return this.patternState.placeholders.every((placeholder, itemIndex) => itemIndex === index || placeholder !== value);
  }

  private reorderPlaceholder(sourceIndex: number, targetIndex: number): void {
    const placeholders = [...this.patternState.placeholders];
    const [placeholder] = placeholders.splice(sourceIndex, 1);
    placeholders.splice(targetIndex, 0, placeholder);
    this.patternState = { ...this.patternState, placeholders };
    this.reorderAnnouncement = `${this.placeholderLabel(placeholder)} moved to position ${targetIndex + 1} of ${placeholders.length}.`;
    this.clearPatternError();
  }

  private focusReorderHandle(index: number): void {
    setTimeout(() => document.getElementById(`placeholder-handle-${index}`)?.focus());
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

    if (errorCode === 'FILE_NAME_FORMAT_INVALID' || errorCode === 'VALIDATION_ERROR' || response?.status === 400 || response?.status === 422) {
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
    const body = error.error && typeof error.error === 'object' ? error.error as ApiErrorResponse : {};
    return { ...body, status: error.status };
  }
}
