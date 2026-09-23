import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';

import { ApiErrorResponse } from '../../../../core/http/api.models';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { FileNameFormatEditorComponent } from '../../components/file-name-format-editor/file-name-format-editor.component';
import { FileNameFormat } from '../../models/file-name-format.models';
import { FileNameFormatService } from '../../services/file-name-format.service';

@Component({
  selector: 'app-file-name-formats',
  standalone: true,
  imports: [FileNameFormatEditorComponent],
  templateUrl: './file-name-formats.component.html',
  styleUrl: './file-name-formats.component.scss',
})
export class FileNameFormatsComponent implements OnInit {
  private readonly fileNameFormatService = inject(FileNameFormatService);
  private readonly notifications = inject(NotificationService);

  readonly pageSize = 10;
  readonly skeletonRows = [0, 1, 2, 3];

  formats: FileNameFormat[] = [];
  currentPage = 0;
  totalPages = 0;
  totalElements = 0;
  isLoading = false;
  loadError = false;
  loadErrorMessage = '';
  pageMessage = '';
  editorOpen = false;
  editingFormat: FileNameFormat | null = null;
  deleteConfirmation = false;
  deleteTarget: FileNameFormat | null = null;
  deleteErrorMessage = '';
  isDeleting = false;
  mutationPending = false;

  private requestGeneration = 0;
  private readonly timestampFormatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  });

  ngOnInit(): void {
    this.loadFormats();
  }

  loadFormats(page = this.currentPage): void {
    const generation = ++this.requestGeneration;
    this.currentPage = Math.max(0, page);
    this.isLoading = true;
    this.loadError = false;
    this.loadErrorMessage = '';
    this.fileNameFormatService.list(this.currentPage, this.pageSize).subscribe({
      next: (result) => {
        if (generation !== this.requestGeneration) return;
        this.formats = result.content;
        this.currentPage = result.page;
        this.totalPages = result.totalPages;
        this.totalElements = result.totalElements;
        this.isLoading = false;
      },
      error: (error: unknown) => {
        if (generation !== this.requestGeneration) return;
        this.isLoading = false;
        this.loadError = true;
        this.loadErrorMessage = 'We could not load File Name Formats. Please try again.';
        if (this.apiError(error)?.status === 404) this.loadErrorMessage = 'File Name Formats are not available right now. Please try again.';
      },
    });
  }

  retry(): void {
    if (!this.isLoading) this.loadFormats(this.currentPage);
  }

  openCreate(): void {
    if (this.mutationPending) return;
    this.editingFormat = null;
    this.editorOpen = true;
    this.pageMessage = '';
  }

  openEdit(format: FileNameFormat): void {
    if (this.mutationPending) return;
    this.editingFormat = format;
    this.editorOpen = true;
    this.pageMessage = '';
  }

  closeEditor(): void {
    this.editorOpen = false;
    this.editingFormat = null;
  }

  editorSaved(_format: FileNameFormat): void {
    const wasEdit = this.editingFormat !== null;
    this.closeEditor();
    this.notifications.showSuccess(wasEdit ? 'File Name Format updated successfully.' : 'File Name Format created successfully.');
    this.loadFormats(this.currentPage);
  }

  editorStale(): void {
    this.pageMessage = 'This File Name Format is no longer available. The list was refreshed.';
    this.loadFormats(this.currentPage);
  }

  openDelete(format: FileNameFormat): void {
    if (this.mutationPending || format.isDefault) return;
    this.deleteTarget = format;
    this.deleteErrorMessage = '';
    this.deleteConfirmation = true;
  }

  cancelDelete(): void {
    if (this.isDeleting) return;
    this.closeDeleteConfirmation();
  }

  confirmDelete(): void {
    const target = this.deleteTarget;
    if (!this.deleteConfirmation || !target || this.isDeleting || target.isDefault) return;

    this.isDeleting = true;
    this.mutationPending = true;
    this.deleteErrorMessage = '';
    this.fileNameFormatService.delete(target.id).subscribe({
      next: () => {
        const nextPage = this.currentPage > 0 && this.formats.length === 1 ? this.currentPage - 1 : this.currentPage;
        this.isDeleting = false;
        this.mutationPending = false;
        this.closeDeleteConfirmation();
        this.notifications.showSuccess('File Name Format deleted successfully.');
        this.loadFormats(nextPage);
      },
      error: (error: unknown) => this.handleDeleteError(error),
    });
  }

  previousPage(): void {
    if (this.isLoading || this.currentPage <= 0) return;
    this.loadFormats(this.currentPage - 1);
  }

  nextPage(): void {
    if (this.isLoading || this.currentPage + 1 >= this.totalPages) return;
    this.loadFormats(this.currentPage + 1);
  }

  pageStatus(): string {
    return this.totalPages ? `Page ${this.currentPage + 1} of ${this.totalPages}` : 'No pages';
  }

  formatTimestamp(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : this.timestampFormatter.format(date);
  }

  deleteLabel(format: FileNameFormat): string {
    return `Delete ${format.name}`;
  }

  deleteTitle(format: FileNameFormat): string {
    return format.isDefault ? 'The system default cannot be deleted.' : this.deleteLabel(format);
  }

  private closeDeleteConfirmation(): void {
    this.deleteConfirmation = false;
    this.deleteTarget = null;
    this.deleteErrorMessage = '';
    this.isDeleting = false;
  }

  private handleDeleteError(error: unknown): void {
    this.isDeleting = false;
    this.mutationPending = false;
    const response = this.apiError(error);
    const errorCode = response?.errorCode;

    if (errorCode === 'FILE_NAME_FORMAT_REFERENCED_BY_PROFILE') {
      this.deleteErrorMessage = 'This Format is referenced by a Profile and cannot be deleted.';
      return;
    }
    if (errorCode === 'FILE_NAME_FORMAT_DEFAULT_CANNOT_DELETE') {
      this.deleteErrorMessage = 'The system default File Name Format cannot be deleted.';
      return;
    }
    if (errorCode === 'FILE_NAME_FORMAT_NOT_FOUND' || response?.status === 404) {
      this.closeDeleteConfirmation();
      this.pageMessage = 'This File Name Format is no longer available. The list was refreshed.';
      this.loadFormats(this.currentPage);
      return;
    }

    this.deleteErrorMessage = 'Unable to delete this File Name Format right now. The record is still here and you can retry.';
  }

  private apiError(error: unknown): (ApiErrorResponse & { status?: number }) | undefined {
    if (!(error instanceof HttpErrorResponse)) return undefined;
    const body = error.error && typeof error.error === 'object' ? error.error as ApiErrorResponse : {};
    return { ...body, status: error.status };
  }
}
