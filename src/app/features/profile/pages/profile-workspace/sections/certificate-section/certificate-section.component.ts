import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Subject, Subscription, takeUntil } from 'rxjs';

import { ApiErrorResponse } from '../../../../../../core/http/api.models';
import { NotificationService } from '../../../../../../core/notifications/notification.service';
import { Certificate, CertificateRequest, ProfileDetail } from '../../../../models/profile.models';
import { ProfileContextService } from '../../../../services/profile-context.service';
import { ProfileEditSessionService } from '../../../../services/profile-edit-session.service';
import { ProfileService } from '../../../../services/profile.service';

type CertificateEditorMode = 'create' | 'edit' | null;
type EditableCertificateField = keyof EditableCertificateValues;
type EditableCertificateValues = {
  certificateName: string;
  issueDate: string;
};
type MutationPostSaveIntent = 'close' | 'add-another';

@Component({
  selector: 'app-certificate-section',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './certificate-section.component.html',
  styleUrl: './certificate-section.component.scss',
})
export class CertificateSectionComponent implements OnChanges, OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly notifications = inject(NotificationService);
  readonly context = inject(ProfileContextService);
  readonly editSession = inject(ProfileEditSessionService);

  @Input({ required: true }) profile!: ProfileDetail;
  @Input() mutationBlocked = false;
  @Output() readonly interactionActiveChange = new EventEmitter<boolean>();

  readonly certificateForm = this.formBuilder.nonNullable.group({
    certificateName: ['', [Validators.required, Validators.maxLength(255)]],
    issueDate: ['', [Validators.required, this.certificateIssueDateValidator()]],
  });
  readonly certificateDateMax = this.currentDate();

  certificates: Certificate[] = [];
  certificateLoading = false;
  certificateError: unknown | null = null;
  certificateEditorMode: CertificateEditorMode = null;
  certificateConflict = false;
  isCertificateSubmitting = false;
  certificateErrorMessage = '';
  certificateMessage = '';
  isCertificateDeleting = false;
  certificateDeleteConfirmation = false;
  certificateDeleteTarget: Certificate | null = null;
  certificateDeleteErrorMessage = '';
  isReloading = false;
  cancelConfirmation = false;
  reloadConfirmation = false;

  private activeProfileId: string | null = null;
  private editingCertificateId: number | string | null = null;
  private originalCertificateValues: EditableCertificateValues | null = null;
  private readonly listCancel = new Subject<void>();
  private listGeneration = 0;
  private mutationGeneration = 0;
  private deleteRecoveryGeneration = 0;
  private deleteConflict = false;
  private interactionActive = false;
  private readonly navigationDiscardSubscription: Subscription;

  constructor() {
    this.certificateForm.valueChanges.subscribe(() => this.syncDirtyState());
    this.navigationDiscardSubscription = this.editSession.navigationDiscarded$().subscribe(() => this.discardEditing());
  }

  ngOnChanges(changes: SimpleChanges): void {
    const profileChange = changes['profile'];
    if (!profileChange || !this.profile) return;
    const nextProfileId = String(this.profile.id);
    if (profileChange.firstChange || this.activeProfileId !== nextProfileId) this.resetForProfile();
  }

  ngOnDestroy(): void {
    this.navigationDiscardSubscription.unsubscribe();
    this.listCancel.next();
    this.listCancel.complete();
    this.editSession.setDirty(false);
    this.setInteractionActive(false);
  }

  resetForProfile(): void {
    this.listCancel.next();
    this.listGeneration++;
    this.mutationGeneration++;
    this.deleteRecoveryGeneration++;
    this.activeProfileId = this.profile ? String(this.profile.id) : null;
    this.certificates = [];
    this.certificateLoading = false;
    this.certificateError = null;
    this.certificateMessage = '';
    this.certificateErrorMessage = '';
    this.isReloading = false;
    this.deleteConflict = false;
    this.closeCertificateEditor();
    this.closeCertificateDeleteConfirmation();
    if (this.activeProfileId) this.loadCertificates(this.activeProfileId);
  }

  retryCertificates(): void {
    if (this.activeProfileId) this.loadCertificates(this.activeProfileId);
  }

  startCertificateCreate(): void {
    this.openCertificateEditor();
  }

  startCertificateEdit(certificate: Certificate): void {
    this.openCertificateEditor(certificate);
  }

  cancelEditing(): void {
    if (!this.certificateEditorMode || this.isCertificateSubmitting) return;
    if (this.certificateForm.dirty) {
      this.cancelConfirmation = true;
      this.syncDirtyState();
      return;
    }
    this.closeCertificateEditor();
  }

  keepEditing(): void {
    this.cancelConfirmation = false;
    this.reloadConfirmation = false;
    this.syncDirtyState();
  }

  discardEditing(): void {
    this.cancelConfirmation = false;
    this.closeCertificateEditor();
  }

  submitCertificate(intent: MutationPostSaveIntent = 'close'): void {
    const mode = this.certificateEditorMode;
    if (!mode || this.isCertificateSubmitting || this.certificateConflict) return;
    const addAnother = intent === 'add-another' && mode === 'create';

    this.certificateErrorMessage = '';
    this.certificateMessage = '';
    this.clearCertificateBackendErrors();
    this.trimCertificateFormValues();
    if (!this.hasCertificateChanges()) return;
    if (this.certificateForm.invalid) {
      this.certificateForm.markAllAsTouched();
      this.syncDirtyState();
      return;
    }

    const profile = this.context.detail();
    const profileId = this.context.selectedId();
    if (!profile || !profileId || String(profile.id) !== profileId) return;

    const value = this.certificateForm.getRawValue();
    const duplicate = this.certificates.some((certificate) => certificate.certificateName === value.certificateName
      && certificate.issueDate === value.issueDate
      && (mode !== 'edit' || String(certificate.id) !== String(this.editingCertificateId)));
    if (duplicate) {
      this.setCertificateFieldError('certificateName', 'A Certificate with this name and Issue Date already exists in this Profile.', 'duplicate');
      this.certificateErrorMessage = 'A Certificate with this name and Issue Date already exists in this Profile.';
      this.syncDirtyState();
      return;
    }

    const request: CertificateRequest = {
      certificateName: value.certificateName,
      issueDate: value.issueDate,
      version: profile.version,
    };
    const certificateId = this.editingCertificateId;
    const operationGeneration = this.mutationGeneration;
    this.isCertificateSubmitting = true;
    this.syncDirtyState();
    const request$ = mode === 'edit' && certificateId !== null
      ? this.profileService.updateCertificate(profileId, certificateId, request)
      : this.profileService.createCertificate(profileId, request);

    request$.subscribe({
      next: (result) => {
        if (!this.isCurrentCertificateOperation(profileId, operationGeneration)) return;
        if (!this.context.applyMutationVersion(profileId, result.profileVersion)) {
          this.isCertificateSubmitting = false;
          this.syncDirtyState();
          return;
        }

        this.certificates = this.sortCertificates(mode === 'edit' && certificateId !== null
          ? this.certificates.map((certificate) => String(certificate.id) === String(certificateId) ? result.certificate : certificate)
          : [...this.certificates, result.certificate]);
        this.isCertificateSubmitting = false;
        this.certificateConflict = false;
        this.certificateMessage = mode === 'edit' ? 'Certificate updated successfully.' : 'Certificate added successfully.';
        this.notifications.showSuccess(this.certificateMessage);
        if (addAnother) this.resetCertificateForAnother();
        else this.closeCertificateEditor();
      },
      error: (error: unknown) => {
        if (!this.isCurrentCertificateOperation(profileId, operationGeneration)) return;
        this.handleCertificateSaveError(error);
      },
    });
  }

  openCertificateDeleteConfirmation(certificate: Certificate): void {
    if (this.mutationBlocked || this.certificateEditorMode || !this.isCurrentCertificateRecord(certificate)) return;
    this.certificateDeleteTarget = certificate;
    this.certificateDeleteErrorMessage = '';
    this.certificateDeleteConfirmation = true;
    this.syncDirtyState();
  }

  cancelCertificateDelete(): void {
    if (this.isCertificateDeleting) return;
    this.closeCertificateDeleteConfirmation();
  }

  confirmCertificateDelete(): void {
    const target = this.certificateDeleteTarget;
    const profileId = this.context.selectedId();
    const profile = this.context.detail();
    if (!this.certificateDeleteConfirmation || !target || this.isCertificateDeleting || this.deleteConflict || this.certificateEditorMode || !profileId || !profile) return;
    if (String(profile.id) !== profileId || !this.isCurrentCertificateRecord(target)) {
      this.closeCertificateDeleteConfirmation();
      return;
    }

    const operationGeneration = ++this.mutationGeneration;
    this.isCertificateDeleting = true;
    this.certificateDeleteErrorMessage = '';
    this.syncDirtyState();
    this.profileService.deleteCertificate(profileId, target.id, profile.version).subscribe({
      next: (result) => {
        if (!this.isCurrentCertificateOperation(profileId, operationGeneration, false)) return;
        if (!this.context.applyMutationVersion(profileId, result.profileVersion)) {
          this.isCertificateDeleting = false;
          this.syncDirtyState();
          return;
        }

        this.certificates = this.certificates.filter((certificate) => String(certificate.id) !== String(target.id));
        this.isCertificateDeleting = false;
        this.certificateMessage = 'Certificate deleted successfully.';
        this.notifications.showSuccess(this.certificateMessage);
        this.closeCertificateDeleteConfirmation();
      },
      error: (error: unknown) => {
        if (!this.isCurrentCertificateOperation(profileId, operationGeneration, false)) return;
        this.isCertificateDeleting = false;
        if (this.isProfileVersionConflict(error)) {
          this.deleteConflict = true;
          this.certificateDeleteErrorMessage = this.deleteConflictMessage();
          this.deleteRecoveryGeneration++;
          this.syncDirtyState();
          return;
        }
        this.certificateDeleteErrorMessage = this.apiError(error)?.message?.trim() || 'Unable to delete this Certificate right now. The record is still here and you can retry.';
        this.syncDirtyState();
      },
    });
  }

  reloadLatest(): void {
    if (this.deleteConflict) {
      if (this.certificateEditorMode) {
        this.certificateDeleteErrorMessage = 'Finish or discard the active draft before reloading the latest Profile.';
        return;
      }
      if (!this.isReloading) this.fetchLatestDeleteConflict();
      return;
    }
    if (this.isReloading || !this.certificateEditorMode || !this.certificateConflict) return;
    if (this.certificateForm.dirty) {
      this.reloadConfirmation = true;
      this.syncDirtyState();
      return;
    }
    this.fetchLatestCertificate();
  }

  confirmReloadLatest(): void {
    this.reloadConfirmation = false;
    if (this.deleteConflict) this.fetchLatestDeleteConflict();
    else this.fetchLatestCertificate();
  }

  certificateFieldError(field: EditableCertificateField): string {
    const errors = this.certificateForm.controls[field].errors;
    if (errors?.['backend']) return errors['backend'];
    if (errors?.['duplicate']) return errors['duplicate'];
    if (errors?.['required']) return 'This field is required.';
    if (errors?.['maxlength']) return `Use ${errors['maxlength'].requiredLength} characters or fewer.`;
    if (errors?.['futureDate']) return 'Issue Date cannot be in the future.';
    return errors ? 'This value is not valid.' : '';
  }

  certificateFieldInvalid(field: EditableCertificateField): boolean {
    const control = this.certificateForm.controls[field];
    return control.invalid && control.touched;
  }

  certificateRecordLabel(certificate: Certificate): string {
    return `${certificate.certificateName} (${certificate.issueDate})`;
  }

  hasCertificateChanges(): boolean {
    const original = this.originalCertificateValues;
    if (!original) return false;
    const current = this.normalizeCertificateValues(this.certificateForm.getRawValue());
    return current.certificateName !== original.certificateName || current.issueDate !== original.issueDate;
  }

  hasDeleteConflict(): boolean {
    return this.deleteConflict;
  }

  private loadCertificates(profileId: string, onLoaded?: () => void, onError?: () => void): void {
    this.listCancel.next();
    const generation = ++this.listGeneration;
    this.certificates = [];
    this.certificateLoading = true;
    this.certificateError = null;
    this.profileService.listCertificates(profileId).pipe(takeUntil(this.listCancel)).subscribe({
      next: (certificates) => {
        if (!this.isCurrentCertificateProfile(profileId, generation)) return;
        this.certificates = this.sortCertificates(certificates);
        this.certificateLoading = false;
        onLoaded?.();
      },
      error: (error: unknown) => {
        if (!this.isCurrentCertificateProfile(profileId, generation)) return;
        this.certificateError = error;
        this.certificateLoading = false;
        onError?.();
      },
    });
  }

  private openCertificateEditor(certificate?: Certificate): void {
    if (!this.profile || this.mutationBlocked || (certificate && !this.isCurrentCertificateRecord(certificate))) return;

    const values = certificate ? this.certificateFormValues(certificate) : this.emptyCertificateValues();
    this.certificateEditorMode = certificate ? 'edit' : 'create';
    this.editingCertificateId = certificate ? certificate.id : null;
    this.originalCertificateValues = this.normalizeCertificateValues(values);
    this.certificateForm.reset(values);
    this.certificateForm.markAsPristine();
    this.certificateForm.markAsUntouched();
    this.mutationGeneration++;
    this.certificateConflict = false;
    this.cancelConfirmation = false;
    this.reloadConfirmation = false;
    this.certificateErrorMessage = '';
    this.certificateMessage = '';
    this.syncDirtyState();
  }

  private handleCertificateSaveError(error: unknown): void {
    this.isCertificateSubmitting = false;
    const response = this.apiError(error);
    if (response?.errorCode === 'PROFILE_VERSION_CONFLICT') {
      this.certificateConflict = true;
      this.certificateErrorMessage = response.message?.trim() || 'This Profile changed elsewhere. Reload the latest version before saving again.';
      this.syncDirtyState();
      return;
    }
    if (response?.errorCode === 'VALIDATION_ERROR') {
      this.applyCertificateFieldErrors(response.data);
      this.certificateErrorMessage = 'Please correct the highlighted fields.';
      this.syncDirtyState();
      return;
    }

    if (response?.errorCode === 'CERTIFICATE_ALREADY_EXISTS') {
      this.setCertificateFieldError('certificateName', response.message || 'A Certificate with this name and Issue Date already exists in this Profile.');
    } else if (response?.errorCode === 'CERTIFICATE_ISSUE_DATE_IN_FUTURE') {
      this.setCertificateFieldError('issueDate', response.message || 'Issue Date cannot be in the future.');
    }
    this.certificateErrorMessage = response?.message?.trim() || 'Unable to save this Certificate right now. Your changes are still here.';
    this.syncDirtyState();
  }

  private fetchLatestCertificate(): void {
    const profileId = this.context.selectedId();
    if (!profileId) return;

    this.closeCertificateEditor();
    this.isReloading = true;
    this.certificateErrorMessage = '';
    this.certificateMessage = '';
    this.context.reloadDetail(profileId).subscribe({
      next: () => {
        if (!this.isCurrentProfileContext(profileId)) return;
        this.isReloading = false;
        this.certificateConflict = false;
        this.certificateMessage = 'Latest Profile and Certificate data loaded. Review it before editing.';
        this.loadCertificates(profileId);
      },
      error: (error: unknown) => {
        if (!this.isCurrentProfileContext(profileId)) return;
        this.isReloading = false;
        this.certificateErrorMessage = this.apiError(error)?.message?.trim() || 'Unable to reload the latest Profile right now. Please try again.';
      },
    });
  }

  private fetchLatestDeleteConflict(): void {
    const profileId = this.context.selectedId();
    if (!profileId || !this.deleteConflict) return;

    const recoveryGeneration = ++this.deleteRecoveryGeneration;
    this.isReloading = true;
    this.certificateDeleteErrorMessage = '';
    this.context.reloadDetail(profileId).subscribe({
      next: () => {
        if (!this.isCurrentDeleteRecovery(profileId, recoveryGeneration)) return;
        this.loadCertificates(profileId, () => this.completeDeleteRecovery(profileId, recoveryGeneration), () => this.failDeleteRecovery(profileId, recoveryGeneration));
      },
      error: (error: unknown) => {
        if (!this.isCurrentDeleteRecovery(profileId, recoveryGeneration)) return;
        this.isReloading = false;
        this.certificateDeleteErrorMessage = `Latest Profile data could not be loaded. ${this.apiError(error)?.message?.trim() || 'Please try Reload Latest again.'}`;
      },
    });
  }

  private completeDeleteRecovery(profileId: string, recoveryGeneration: number): void {
    if (!this.isCurrentDeleteRecovery(profileId, recoveryGeneration)) return;
    this.isReloading = false;
    const target = this.certificateDeleteTarget;
    const current = target && this.certificates.find((certificate) => String(certificate.id) === String(target.id));
    if (!current) {
      this.deleteConflict = false;
      this.closeCertificateDeleteConfirmation();
      this.certificateMessage = 'Latest Profile and Certificate data loaded. The record is no longer available.';
      return;
    }
    this.certificateDeleteTarget = current;
    this.deleteConflict = false;
    this.certificateDeleteErrorMessage = '';
    this.certificateMessage = 'Latest Profile and Certificate data loaded. Confirm the deletion again if it is still wanted.';
    this.syncDirtyState();
  }

  private failDeleteRecovery(profileId: string, recoveryGeneration: number): void {
    if (!this.isCurrentDeleteRecovery(profileId, recoveryGeneration)) return;
    this.isReloading = false;
    this.certificateDeleteErrorMessage = 'Latest Certificate data could not be loaded. Please try Reload Latest again.';
    this.syncDirtyState();
  }

  private resetCertificateForAnother(): void {
    this.mutationGeneration++;
    const values = this.emptyCertificateValues();
    this.editingCertificateId = null;
    this.originalCertificateValues = this.normalizeCertificateValues(values);
    this.certificateConflict = false;
    this.certificateErrorMessage = '';
    this.cancelConfirmation = false;
    this.reloadConfirmation = false;
    this.certificateForm.reset(values);
    this.certificateForm.markAsPristine();
    this.certificateForm.markAsUntouched();
    this.clearCertificateBackendErrors();
    this.syncDirtyState();
    this.focusEditorField('certificate-name');
  }

  private closeCertificateEditor(): void {
    this.mutationGeneration++;
    this.certificateEditorMode = null;
    this.editingCertificateId = null;
    this.originalCertificateValues = null;
    this.isCertificateSubmitting = false;
    this.certificateConflict = false;
    this.cancelConfirmation = false;
    this.reloadConfirmation = false;
    this.certificateForm.reset(this.emptyCertificateValues());
    this.certificateForm.markAsPristine();
    this.certificateForm.markAsUntouched();
    this.clearCertificateBackendErrors();
    this.syncDirtyState();
  }

  private closeCertificateDeleteConfirmation(): void {
    this.certificateDeleteConfirmation = false;
    this.deleteConflict = false;
    this.certificateDeleteTarget = null;
    this.certificateDeleteErrorMessage = '';
    this.isCertificateDeleting = false;
    this.syncDirtyState();
  }

  private applyCertificateFieldErrors(data: unknown): void {
    const errors = (data as { errors?: unknown } | undefined)?.errors;
    if (!Array.isArray(errors)) return;
    for (const error of errors) {
      if (!error || typeof error !== 'object') continue;
      const { field, message } = error as { field?: unknown; message?: unknown };
      const normalizedField = typeof field === 'string' ? field.split('.').pop() : undefined;
      if (normalizedField && typeof message === 'string' && normalizedField in this.certificateForm.controls) {
        this.setCertificateFieldError(normalizedField as EditableCertificateField, message);
      }
    }
  }

  private clearCertificateBackendErrors(): void {
    for (const control of Object.values(this.certificateForm.controls)) {
      if (!control.errors?.['backend'] && !control.errors?.['duplicate']) continue;
      const errors = { ...control.errors };
      delete errors['backend'];
      delete errors['duplicate'];
      control.setErrors(Object.keys(errors).length ? errors : null);
    }
  }

  private setCertificateFieldError(field: EditableCertificateField, message: string, key = 'backend'): void {
    const control = this.certificateForm.controls[field];
    control.setErrors({ ...control.errors, [key]: message.trim() || 'This value is not valid.' });
    control.markAsTouched();
  }

  private trimCertificateFormValues(): void {
    const value = this.certificateForm.getRawValue();
    this.certificateForm.patchValue({
      certificateName: value.certificateName.trim(),
      issueDate: value.issueDate.trim(),
    }, { emitEvent: false });
    this.certificateForm.updateValueAndValidity({ emitEvent: false });
  }

  private emptyCertificateValues(): EditableCertificateValues {
    return { certificateName: '', issueDate: '' };
  }

  private certificateFormValues(certificate: Certificate): EditableCertificateValues {
    return { certificateName: certificate.certificateName, issueDate: certificate.issueDate };
  }

  private certificateIssueDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = typeof control.value === 'string' ? control.value : '';
      return value && value > this.currentDate() ? { futureDate: true } : null;
    };
  }

  private currentDate(): string {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

  private normalizeCertificateValues(value: EditableCertificateValues): EditableCertificateValues {
    return { certificateName: value.certificateName.trim(), issueDate: value.issueDate.trim() };
  }

  private isCurrentCertificateProfile(profileId: string, generation: number): boolean {
    return this.activeProfileId === profileId
      && this.listGeneration === generation
      && this.isCurrentProfileContext(profileId);
  }

  private isCurrentProfileContext(profileId: string): boolean {
    return this.activeProfileId === profileId
      && this.context.selectedId() === profileId
      && String(this.context.detail()?.id) === profileId;
  }

  private isCurrentCertificateOperation(profileId: string, generation: number, requiresEditor = true): boolean {
    return this.isCurrentProfileContext(profileId)
      && this.mutationGeneration === generation
      && (!requiresEditor || this.certificateEditorMode !== null);
  }

  private isCurrentDeleteRecovery(profileId: string, generation: number): boolean {
    return this.deleteConflict
      && this.deleteRecoveryGeneration === generation
      && this.isCurrentProfileContext(profileId);
  }

  private isCurrentCertificateRecord(certificate: Certificate): boolean {
    return this.certificates.some((item) => String(item.id) === String(certificate.id));
  }

  private sortCertificates(certificates: Certificate[]): Certificate[] {
    return certificates.sort((left, right) => {
      const issueDateDifference = String(right.issueDate).localeCompare(String(left.issueDate));
      if (issueDateDifference) return issueDateDifference;
      const leftId = Number(left.id);
      const rightId = Number(right.id);
      if (Number.isFinite(leftId) && Number.isFinite(rightId)) return leftId - rightId;
      return String(left.id).localeCompare(String(right.id));
    });
  }

  private syncDirtyState(): void {
    this.editSession.setDirty(this.certificateEditorMode !== null && (this.certificateForm.dirty || this.hasCertificateChanges()));
    this.setInteractionActive(this.certificateEditorMode !== null
      || this.isCertificateSubmitting
      || this.certificateConflict
      || this.cancelConfirmation
      || this.reloadConfirmation
      || this.certificateDeleteConfirmation
      || this.isCertificateDeleting
      || this.isReloading);
  }

  private setInteractionActive(active: boolean): void {
    if (this.interactionActive === active) return;
    this.interactionActive = active;
    this.interactionActiveChange.emit(active);
  }

  private isProfileVersionConflict(error: unknown): boolean {
    return this.apiError(error)?.errorCode === 'PROFILE_VERSION_CONFLICT';
  }

  private deleteConflictMessage(): string {
    return 'The Profile changed before this Certificate could be deleted. Reload Latest to refresh the current Certificate data before deciding again.';
  }

  private apiError(error: unknown): ApiErrorResponse | undefined {
    return error instanceof HttpErrorResponse ? error.error as ApiErrorResponse : undefined;
  }

  private focusEditorField(id: string): void {
    const fields = document.querySelectorAll<HTMLElement>(`#${id}`);
    const field = fields.item(fields.length - 1);
    field?.focus();
    if (field && document.activeElement !== field) setTimeout(() => { if (document.activeElement === document.body) field.focus(); });
  }
}
