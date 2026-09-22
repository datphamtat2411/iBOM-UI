import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ApiErrorResponse } from '../../../../core/http/api.models';
import { ProfileResponse, ProfileSummary } from '../../models/profile.models';
import { ProfileContextService } from '../../services/profile-context.service';
import { ProfileEditSessionService } from '../../services/profile-edit-session.service';
import { ProfileService } from '../../services/profile.service';

type CopyStep = 'source' | 'name' | 'success';

@Component({
  selector: 'app-profile-copy',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './profile-copy.component.html',
  styleUrl: './profile-copy.component.scss',
})
export class ProfileCopyComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly profileEditSession = inject(ProfileEditSessionService);
  readonly context = inject(ProfileContextService);

  @Input() sourceProfileId = '';
  @Input() sourceProfileName = '';
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly copied = new EventEmitter<ProfileResponse>();
  @Output() readonly openCopied = new EventEmitter<ProfileResponse>();

  readonly copyForm = this.formBuilder.group({
    profileName: ['', [Validators.required, Validators.maxLength(100)]],
  });
  step: CopyStep = 'source';
  selectedSourceId: string | null = null;
  sourceSearch = '';
  completedProfile: ProfileResponse | null = null;
  isSubmitting = false;
  isRefreshingSources = false;
  warningRequired = false;
  private warningAcknowledged = false;
  private refreshedSummaries: ProfileSummary[] | null = null;
  message = '';

  ngOnInit(): void {
    this.selectedSourceId = this.findSource(this.sourceProfileId)?.id.toString() ?? null;
  }

  get sourceProfiles(): ProfileSummary[] {
    const profiles = [...(this.refreshedSummaries ?? this.context.summaries())];
    const currentIndex = profiles.findIndex((profile) => String(profile.id) === String(this.sourceProfileId));
    if (currentIndex <= 0) return profiles;
    const [current] = profiles.splice(currentIndex, 1);
    return [current, ...profiles];
  }

  get filteredSourceProfiles(): ProfileSummary[] {
    const search = this.sourceSearch.trim().toLocaleLowerCase();
    if (!search) return this.sourceProfiles;
    return this.sourceProfiles.filter((profile) => profile.profileName.toLocaleLowerCase().includes(search));
  }

  confirmWarning(): void {
    this.warningAcknowledged = true;
    this.warningRequired = false;
    this.step = 'name';
  }

  selectSource(id: number | string): void {
    if (this.isSubmitting || this.isRefreshingSources || !this.findSource(id)) return;
    this.selectedSourceId = String(id);
    this.message = '';
  }

  setSourceSearch(event: Event): void {
    this.sourceSearch = (event.target as HTMLInputElement).value;
  }

  continueToName(): void {
    this.message = '';
    if (this.isRefreshingSources || !this.selectedSource()) return;
    if (this.sourceProfiles.length >= 5 && !this.warningAcknowledged) {
      this.warningRequired = true;
      return;
    }
    this.step = 'name';
  }

  backToSources(): void {
    if (this.isSubmitting) return;
    this.warningRequired = false;
    this.message = '';
    this.step = 'source';
  }

  cancel(): void {
    if (!this.isSubmitting) this.closed.emit();
  }

  copyAnother(): void {
    if (this.isSubmitting) return;
    this.step = 'source';
    this.completedProfile = null;
    this.selectedSourceId = null;
    this.sourceSearch = '';
    this.warningRequired = false;
    this.warningAcknowledged = false;
    this.message = '';
    this.copyForm.reset();
    this.refreshedSummaries = null;
    this.isRefreshingSources = true;
    this.profileService.list().subscribe({
      next: (summaries) => {
        this.refreshedSummaries = summaries;
        this.isRefreshingSources = false;
      },
      error: () => {
        this.isRefreshingSources = false;
        this.message = 'Unable to refresh the active Profiles right now. Please try again.';
      },
    });
  }

  openCopiedProfile(): void {
    if (this.completedProfile) this.openCopied.emit(this.completedProfile);
  }

  submit(): void {
    this.message = '';
    if (this.isSubmitting) return;

    if (this.sourceProfiles.length >= 5 && !this.warningAcknowledged) {
      this.warningRequired = true;
      return;
    }

    this.clearBackendError();
    this.trimFormValue();
    if (this.copyForm.invalid) {
      this.copyForm.markAllAsTouched();
      return;
    }

    const source = this.selectedSource();
    const workspace = this.currentWorkspaceSource();
    if (!source || !workspace) {
      this.message = 'The selected Profile changed. Close this dialog and try again.';
      return;
    }

    this.isSubmitting = true;
    this.profileEditSession.requestNavigation(`/profiles/${workspace.id}`).then((allow) => {
      if (!allow) {
        this.isSubmitting = false;
        return;
      }
      if (!this.currentWorkspaceSource() || this.currentWorkspaceSource()?.id !== workspace.id || !this.findSource(source.id)) {
        this.isSubmitting = false;
        this.message = 'The selected Profile changed. Close this dialog and try again.';
        return;
      }

      this.profileService.copy(source.id, { profileName: this.copyForm.controls.profileName.value!.trim() }).subscribe({
        next: (copied) => {
          if (!this.currentWorkspaceSource() || this.currentWorkspaceSource()?.id !== workspace.id || !this.findSource(source.id)) {
            this.isSubmitting = false;
            this.message = 'The selected Profile changed while Copy was in progress. Close this dialog and try again.';
            return;
          }
          this.isSubmitting = false;
          this.completedProfile = copied;
          this.step = 'success';
          this.copied.emit(copied);
        },
        error: (error: unknown) => this.handleError(error),
      });
    });
  }

  selectedSource(): ProfileSummary | null {
    return this.selectedSourceId ? this.findSource(this.selectedSourceId) : null;
  }

  isWorkspaceProfile(profile: ProfileSummary): boolean {
    return String(profile.id) === String(this.sourceProfileId);
  }

  isSelectedSource(profile: ProfileSummary): boolean {
    return this.selectedSourceId === String(profile.id);
  }

  fieldError(): string {
    const errors = this.copyForm.controls.profileName.errors;
    if (!errors) return '';
    if (errors['backend']) return errors['backend'];
    if (errors['required']) return 'This field is required.';
    if (errors['maxlength']) return `Use ${errors['maxlength'].requiredLength} characters or fewer.`;
    return 'This value is not valid.';
  }

  private findSource(id: number | string): ProfileSummary | null {
    return (this.refreshedSummaries ?? this.context.summaries()).find((profile) => String(profile.id) === String(id)) ?? null;
  }

  private currentWorkspaceSource(): { id: string; name: string } | null {
    const selectedId = this.context.selectedId();
    const summary = this.context.summaries().find((item) => String(item.id) === selectedId);
    const detail = this.context.detail();
    if (!selectedId || selectedId !== String(this.sourceProfileId) || !summary) return null;
    if (detail && String(detail.id) !== selectedId) return null;
    return { id: selectedId, name: detail?.profileName ?? summary.profileName };
  }

  private handleError(error: unknown): void {
    this.isSubmitting = false;
    const response = error instanceof HttpErrorResponse ? error.error as ApiErrorResponse : undefined;
    if (response?.errorCode === 'PROFILE_NAME_ALREADY_EXISTS') {
      this.setBackendError(response.message);
    } else if (response?.errorCode === 'VALIDATION_ERROR') {
      this.applyValidationError(response.data);
      this.message = 'Please correct the highlighted field.';
    } else {
      this.message = response?.message?.trim() || 'Unable to copy this Profile right now. Please try again.';
    }
  }

  private applyValidationError(data: unknown): void {
    const errors = (data as { errors?: unknown } | undefined)?.errors;
    if (!Array.isArray(errors)) return;
    for (const error of errors) {
      if (!error || typeof error !== 'object') continue;
      const { field, message } = error as { field?: unknown; message?: unknown };
      if (field === 'profileName' && typeof message === 'string') this.setBackendError(message);
    }
  }

  private clearBackendError(): void {
    const control = this.copyForm.controls.profileName;
    if (!control.errors?.['backend']) return;
    const errors = { ...control.errors };
    delete errors['backend'];
    control.setErrors(Object.keys(errors).length ? errors : null);
  }

  private setBackendError(message: string | undefined): void {
    const control = this.copyForm.controls.profileName;
    control.setErrors({ ...control.errors, backend: message?.trim() || 'This value is not valid.' });
    control.markAsTouched();
  }

  private trimFormValue(): void {
    const value = this.copyForm.controls.profileName.value;
    this.copyForm.controls.profileName.setValue(value?.trim() ?? '', { emitEvent: false });
    this.copyForm.controls.profileName.updateValueAndValidity({ emitEvent: false });
  }
}
