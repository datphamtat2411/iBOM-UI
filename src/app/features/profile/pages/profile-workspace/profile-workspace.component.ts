import { HttpErrorResponse } from '@angular/common/http';
import { Component, effect, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { ApiErrorResponse } from '../../../../core/http/api.models';
import {
  Certificate,
  CertificateRequest,
  Education,
  EducationRequest,
  EducationStatus,
  LanguageLevel,
  LanguageMasterOption,
  ProfileLanguage,
  ProfileLanguageRequest,
  ProfileDetail,
  UpdateProfileRequest,
} from '../../models/profile.models';
import { ProfileContextService } from '../../services/profile-context.service';
import { ProfileEditSessionService } from '../../services/profile-edit-session.service';
import { ProfileService } from '../../services/profile.service';

type EditableAboutMeField = Exclude<keyof UpdateProfileRequest, 'profileName' | 'version'>;
type EditableAboutMeValues = Pick<UpdateProfileRequest, EditableAboutMeField>;
type EducationEditorMode = 'create' | 'edit' | null;
type EditableEducationField = keyof EditableEducationValues;
type EditableEducationValues = {
  schoolName: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
  status: EducationStatus;
};
type LanguageEditorMode = 'create' | 'edit' | null;
type EditableLanguageField = keyof EditableLanguageValues;
type EditableLanguageValues = {
  languageId: number | string | null;
  level: LanguageLevel;
};
type CertificateEditorMode = 'create' | 'edit' | null;
type EditableCertificateField = keyof EditableCertificateValues;
type EditableCertificateValues = {
  certificateName: string;
  issueDate: string;
};

@Component({
  selector: 'app-profile-workspace',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './profile-workspace.component.html',
  styleUrl: './profile-workspace.component.scss',
})
export class ProfileWorkspaceComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly context = inject(ProfileContextService);
  readonly editSession = inject(ProfileEditSessionService);

  readonly sections = [
    ['about', 'About Me'],
    ['education', 'Education'],
    ['languages', 'Languages'],
    ['certificates', 'Certificates'],
    ['projects', 'Projects'],
    ['skills', 'Skills'],
  ] as const;
  readonly editForm = this.formBuilder.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    jobTitle: ['', [Validators.required, Validators.maxLength(100)]],
    yearsOfExperience: [0, [Validators.required, Validators.min(0)]],
    personality: ['', [Validators.maxLength(4000)]],
    technicalSummary: ['', [Validators.maxLength(4000)]],
  });
  readonly educationForm = this.formBuilder.nonNullable.group({
    schoolName: ['', [Validators.required, Validators.maxLength(255)]],
    degree: ['', [Validators.required, Validators.maxLength(255)]],
    fieldOfStudy: ['', [Validators.maxLength(255)]],
    startDate: ['', [Validators.required]],
    endDate: [''],
    status: this.formBuilder.nonNullable.control<EducationStatus>('ONGOING', [Validators.required]),
  }, { validators: this.educationDateRangeValidator() });
  readonly languageLevels: ReadonlyArray<{ value: LanguageLevel; label: string }> = [
    { value: 'BEGINNER', label: 'Beginner' },
    { value: 'INTERMEDIATE', label: 'Intermediate' },
    { value: 'UPPER_INTERMEDIATE', label: 'Upper Intermediate' },
    { value: 'ADVANCED', label: 'Advanced' },
    { value: 'NATIVE', label: 'Native' },
  ];
  readonly languageForm = this.formBuilder.group({
    languageId: this.formBuilder.control<number | string | null>(null, [Validators.required]),
    level: this.formBuilder.nonNullable.control<LanguageLevel>('BEGINNER', [Validators.required, this.languageLevelValidator()]),
  });
  readonly certificateForm = this.formBuilder.nonNullable.group({
    certificateName: ['', [Validators.required, Validators.maxLength(255)]],
    issueDate: ['', [Validators.required, this.certificateIssueDateValidator()]],
  });
  readonly certificateDateMax = this.currentDate();

  activeSection = 'about';
  isEditing = false;
  isSubmitting = false;
  isReloading = false;
  isDeleting = false;
  conflict = false;
  cancelConfirmation = false;
  reloadConfirmation = false;
  deleteConfirmation = false;
  deleteTarget: { id: string; name: string } | null = null;
  private notFoundRecoveryInProgress = false;
  private lastNotFoundProfileId: string | null = null;
  private originalAboutMeValues: EditableAboutMeValues | null = null;
  errorMessage = '';
  saveMessage = '';
  deleteErrorMessage = '';
  previewInvalidated = false;
  educations: Education[] = [];
  educationLoading = false;
  educationError: unknown | null = null;
  educationEditorMode: EducationEditorMode = null;
  educationConflict = false;
  isEducationSubmitting = false;
  educationErrorMessage = '';
  educationMessage = '';
  isEducationDeleting = false;
  educationDeleteConfirmation = false;
  educationDeleteTarget: Education | null = null;
  educationDeleteErrorMessage = '';
  languages: ProfileLanguage[] = [];
  languageLoading = false;
  languageError: unknown | null = null;
  languageEditorMode: LanguageEditorMode = null;
  languageConflict = false;
  isLanguageSubmitting = false;
  languageErrorMessage = '';
  languageMessage = '';
  isLanguageDeleting = false;
  languageDeleteConfirmation = false;
  languageDeleteTarget: ProfileLanguage | null = null;
  languageDeleteErrorMessage = '';
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
  languageMasterOptions: LanguageMasterOption[] = [];
  languageMasterPage = 0;
  languageMasterSize = 10;
  languageMasterTotalElements = 0;
  languageMasterTotalPages = 0;
  languageMasterSearch = '';
  languageMasterSearchDraft = '';
  languageMasterLoading = false;
  languageMasterError: unknown | null = null;
  languageMasterReady = false;
  private readonly educationListCancel = new Subject<void>();
  private readonly languageListCancel = new Subject<void>();
  private readonly certificateListCancel = new Subject<void>();
  private readonly languageMasterCancel = new Subject<void>();
  private educationListGeneration = 0;
  private educationMutationGeneration = 0;
  private languageListGeneration = 0;
  private languageMutationGeneration = 0;
  private certificateListGeneration = 0;
  private certificateMutationGeneration = 0;
  private languageMasterGeneration = 0;
  private activeProfileId: string | null = null;
  private editingEducationId: number | string | null = null;
  private originalEducationValues: EditableEducationValues | null = null;
  private editingProfileLanguageId: number | string | null = null;
  private originalLanguageValues: EditableLanguageValues | null = null;
  private editingCertificateId: number | string | null = null;
  private originalCertificateValues: EditableCertificateValues | null = null;

  constructor() {
    this.context.loadSummaries();
    this.editForm.valueChanges.subscribe(() => this.syncDirtyState());
    this.educationForm.valueChanges.subscribe(() => this.syncDirtyState());
    this.languageForm.valueChanges.subscribe(() => this.syncDirtyState());
    this.certificateForm.valueChanges.subscribe(() => this.syncDirtyState());
    this.educationForm.controls.status.valueChanges.subscribe(() => this.updateEducationDateValidation());
    this.route.paramMap.subscribe((params) => {
      this.closeEditor();
      this.closeDeleteConfirmation();
      this.closeEducationDeleteConfirmation();
      this.closeLanguageDeleteConfirmation();
      this.closeCertificateDeleteConfirmation();
      this.resetEducationState();
      this.resetLanguageState();
      this.resetCertificateState();
      const profileId = params.get('profileId');
      this.activeProfileId = profileId;
      if (profileId) {
        this.context.loadDetail(profileId);
        this.loadEducations(profileId);
        this.loadProfileLanguages(profileId);
        this.loadCertificates(profileId);
      } else {
        this.context.beginSelection(null);
      }
    });
    effect(() => {
      const summaries = this.context.summaries();
      if (!this.context.summariesLoading() && !this.context.summariesError() && !this.context.selectedId() && summaries.length) {
        void this.router.navigate(['/profiles', summaries[0].id]);
      }
    });
    effect(() => {
      const selectedId = this.context.selectedId();
      const detail = this.context.detail();
      if (detail && String(detail.id) === selectedId) this.lastNotFoundProfileId = null;

      const error = this.context.detailError();
      if (!error || !this.context.isNotFound(error) || this.notFoundRecoveryInProgress) return;
      if (selectedId && this.lastNotFoundProfileId === selectedId) return;

      this.lastNotFoundProfileId = selectedId;
      this.notFoundRecoveryInProgress = true;
      this.context.refreshSummariesAndSelectFirst().subscribe({
        next: (first) => {
          this.notFoundRecoveryInProgress = false;
          void this.router.navigate(first ? ['/profiles', first.id] : ['/profiles']);
        },
        error: () => {
          this.notFoundRecoveryInProgress = false;
          void this.router.navigate(['/profiles']);
        },
      });
    }, { allowSignalWrites: true });
  }

  selectProfile(profileId: number | string): void {
    void this.router.navigate(['/profiles', profileId]);
  }

  openDeleteConfirmation(): void {
    if (this.isDeleting || this.context.summaries().length <= 1) return;
    const profileId = this.context.selectedId();
    const profile = this.context.detail();
    if (!profileId || !profile || String(profile.id) !== profileId) return;

    this.syncDirtyState();
    this.deleteTarget = { id: profileId, name: profile.profileName };
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
    if (this.context.selectedId() !== target.id || String(this.context.detail()?.id) !== target.id) {
      this.closeDeleteConfirmation();
      return;
    }

    this.isDeleting = true;
    this.deleteErrorMessage = '';
    this.profileService.delete(target.id).subscribe({
      next: () => this.finishDelete(),
      error: (error: unknown) => {
        if (this.context.isNotFound(error)) {
          this.finishDelete();
          return;
        }
        this.isDeleting = false;
        this.deleteErrorMessage = this.apiError(error)?.message?.trim() || 'Unable to delete this Profile right now. Your current Profile and changes are still here.';
      },
    });
  }

  scrollToSection(sectionId: string): void {
    this.activeSection = sectionId;
    document.getElementById(`workspace-section-${sectionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  profileName(): string {
    return this.context.detail()?.profileName ?? this.selectedSummary()?.profileName ?? 'Profile Workspace';
  }

  selectedSummary() {
    return this.context.summaries().find((summary) => String(summary.id) === this.context.selectedId()) ?? null;
  }

  retryEducations(): void {
    const profileId = this.activeProfileId ?? this.context.selectedId();
    if (profileId) this.loadEducations(profileId);
  }

  retryLanguages(): void {
    const profileId = this.activeProfileId ?? this.context.selectedId();
    if (profileId) this.loadProfileLanguages(profileId);
  }

  retryCertificates(): void {
    const profileId = this.activeProfileId ?? this.context.selectedId();
    if (profileId) this.loadCertificates(profileId);
  }

  searchLanguageMaster(): void {
    this.languageMasterSearch = this.languageMasterSearchDraft.trim();
    this.loadLanguageMaster(0, this.languageMasterSearch);
  }

  previousLanguageMasterPage(): void {
    if (this.languageMasterLoading || this.languageMasterPage <= 0) return;
    this.loadLanguageMaster(this.languageMasterPage - 1, this.languageMasterSearch);
  }

  nextLanguageMasterPage(): void {
    if (this.languageMasterLoading || this.languageMasterPage + 1 >= this.languageMasterTotalPages) return;
    this.loadLanguageMaster(this.languageMasterPage + 1, this.languageMasterSearch);
  }

  openLanguageDeleteConfirmation(language: ProfileLanguage): void {
    if (this.isLanguageDeleting || this.languageEditorMode) return;
    const profileId = this.context.selectedId();
    const profile = this.context.detail();
    if (!profileId || !profile || String(profile.id) !== profileId) return;

    this.languageDeleteTarget = language;
    this.languageDeleteErrorMessage = '';
    this.languageDeleteConfirmation = true;
  }

  cancelLanguageDelete(): void {
    if (this.isLanguageDeleting) return;
    this.closeLanguageDeleteConfirmation();
  }

  confirmLanguageDelete(): void {
    const target = this.languageDeleteTarget;
    const profileId = this.context.selectedId();
    const profile = this.context.detail();
    if (!this.languageDeleteConfirmation || !target || this.isLanguageDeleting || !profileId || !profile) return;
    if (String(profile.id) !== profileId) {
      this.closeLanguageDeleteConfirmation();
      return;
    }

    const operationGeneration = ++this.languageMutationGeneration;
    this.isLanguageDeleting = true;
    this.languageDeleteErrorMessage = '';
    this.profileService.deleteProfileLanguage(profileId, target.profileLanguageId, profile.version).subscribe({
      next: (result) => {
        if (!this.isCurrentLanguageOperation(profileId, operationGeneration, false)) return;
        if (!this.context.applyMutationVersion(profileId, result.profileVersion)) return;

        this.languages = this.languages.filter((language) => String(language.profileLanguageId) !== String(target.profileLanguageId));
        this.isLanguageDeleting = false;
        this.previewInvalidated = true;
        this.languageMessage = 'Language deleted. Preview is no longer current; generate a new preview before exporting.';
        this.closeLanguageDeleteConfirmation();
      },
      error: (error: unknown) => {
        if (!this.isCurrentLanguageOperation(profileId, operationGeneration, false)) return;
        this.isLanguageDeleting = false;
        this.languageDeleteErrorMessage = this.apiError(error)?.message?.trim() || 'Unable to delete this Language right now. The record is still here and you can retry.';
      },
    });
  }

  openCertificateDeleteConfirmation(certificate: Certificate): void {
    if (this.isCertificateDeleting || this.certificateEditorMode) return;
    const profileId = this.context.selectedId();
    const profile = this.context.detail();
    if (!profileId || !profile || String(profile.id) !== profileId) return;

    this.certificateDeleteTarget = certificate;
    this.certificateDeleteErrorMessage = '';
    this.certificateDeleteConfirmation = true;
  }

  cancelCertificateDelete(): void {
    if (this.isCertificateDeleting) return;
    this.closeCertificateDeleteConfirmation();
  }

  confirmCertificateDelete(): void {
    const target = this.certificateDeleteTarget;
    const profileId = this.context.selectedId();
    const profile = this.context.detail();
    if (!this.certificateDeleteConfirmation || !target || this.isCertificateDeleting || !profileId || !profile) return;
    if (String(profile.id) !== profileId || !this.certificates.some((certificate) => String(certificate.id) === String(target.id))) {
      this.closeCertificateDeleteConfirmation();
      return;
    }

    const operationGeneration = this.certificateMutationGeneration;
    this.isCertificateDeleting = true;
    this.certificateDeleteErrorMessage = '';
    this.profileService.deleteCertificate(profileId, target.id, profile.version).subscribe({
      next: (result) => {
        if (!this.isCurrentCertificateOperation(profileId, operationGeneration, false)) return;
        if (!this.context.applyMutationVersion(profileId, result.profileVersion)) return;

        this.certificates = this.certificates.filter((certificate) => String(certificate.id) !== String(target.id));
        this.isCertificateDeleting = false;
        this.previewInvalidated = true;
        this.certificateMessage = 'Certificate deleted. Preview is no longer current; generate a new preview before exporting.';
        this.closeCertificateDeleteConfirmation();
      },
      error: (error: unknown) => {
        if (!this.isCurrentCertificateOperation(profileId, operationGeneration, false)) return;
        this.isCertificateDeleting = false;
        this.certificateDeleteErrorMessage = this.apiError(error)?.message?.trim() || 'Unable to delete this Certificate right now. The record is still here and you can retry.';
      },
    });
  }

  openEducationDeleteConfirmation(education: Education): void {
    if (this.isEducationDeleting || this.educationEditorMode) return;
    const profileId = this.context.selectedId();
    const profile = this.context.detail();
    if (!profileId || !profile || String(profile.id) !== profileId) return;

    this.educationDeleteTarget = education;
    this.educationDeleteErrorMessage = '';
    this.educationDeleteConfirmation = true;
  }

  cancelEducationDelete(): void {
    if (this.isEducationDeleting) return;
    this.closeEducationDeleteConfirmation();
  }

  confirmEducationDelete(): void {
    const target = this.educationDeleteTarget;
    const profileId = this.context.selectedId();
    const profile = this.context.detail();
    if (!this.educationDeleteConfirmation || !target || this.isEducationDeleting || !profileId || !profile) return;
    if (String(profile.id) !== profileId) {
      this.closeEducationDeleteConfirmation();
      return;
    }

    const operationGeneration = ++this.educationMutationGeneration;
    this.isEducationDeleting = true;
    this.educationDeleteErrorMessage = '';
    this.profileService.deleteEducation(profileId, target.id, profile.version).subscribe({
      next: (result) => {
        if (!this.isCurrentEducationOperation(profileId, operationGeneration, false)) return;
        if (!this.context.applyMutationVersion(profileId, result.profileVersion)) return;

        this.educations = this.educations.filter((education) => String(education.id) !== String(target.id));
        this.isEducationDeleting = false;
        this.previewInvalidated = true;
        this.educationMessage = 'Education deleted. Preview is no longer current; generate a new preview before exporting.';
        this.closeEducationDeleteConfirmation();
      },
      error: (error: unknown) => {
        if (!this.isCurrentEducationOperation(profileId, operationGeneration, false)) return;
        this.isEducationDeleting = false;
        this.educationDeleteErrorMessage = this.apiError(error)?.message?.trim() || 'Unable to delete this Education right now. The record is still here and you can retry.';
      },
    });
  }

  startEditing(): void {
    const profile = this.context.detail();
    if (!profile || this.conflict || this.educationEditorMode) return;
    const values = this.formValues(profile);
    this.originalAboutMeValues = this.normalizeAboutMeValues(values);
    this.editForm.reset(values);
    this.editForm.markAsPristine();
    this.editForm.markAsUntouched();
    this.isEditing = true;
    this.cancelConfirmation = false;
    this.errorMessage = '';
    this.saveMessage = '';
    this.syncDirtyState();
  }

  startEducationCreate(): void {
    this.openEducationEditor();
  }

  startEducationEdit(education: Education): void {
    this.openEducationEditor(education);
  }

  startLanguageCreate(): void {
    this.openLanguageEditor();
  }

  startLanguageEdit(language: ProfileLanguage): void {
    this.openLanguageEditor(language);
  }

  startCertificateCreate(): void {
    this.openCertificateEditor();
  }

  startCertificateEdit(certificate: Certificate): void {
    this.openCertificateEditor(certificate);
  }

  cancelEditing(): void {
    if (this.certificateEditorMode) {
      if (this.isCertificateSubmitting) return;
      if (this.certificateForm.dirty) {
        this.cancelConfirmation = true;
        return;
      }
      this.closeCertificateEditor();
      return;
    }
    if (this.languageEditorMode) {
      if (this.isLanguageSubmitting) return;
      if (this.languageForm.dirty) {
        this.cancelConfirmation = true;
        return;
      }
      this.closeLanguageEditor();
      return;
    }
    if (this.educationEditorMode) {
      if (this.isEducationSubmitting) return;
      if (this.educationForm.dirty) {
        this.cancelConfirmation = true;
        return;
      }
      this.closeEducationEditor();
      return;
    }
    if (!this.isEditing || this.isSubmitting) return;
    if (this.editForm.dirty) {
      this.cancelConfirmation = true;
      return;
    }
    this.closeEditor();
  }

  keepEditing(): void {
    this.cancelConfirmation = false;
    this.reloadConfirmation = false;
  }

  discardEditing(): void {
    this.cancelConfirmation = false;
    if (this.languageEditorMode) {
      this.closeLanguageEditor();
      return;
    }
    if (this.certificateEditorMode) {
      this.closeCertificateEditor();
      return;
    }
    if (this.educationEditorMode) {
      this.closeEducationEditor();
      return;
    }
    this.closeEditor();
  }

  submit(): void {
    this.errorMessage = '';
    this.saveMessage = '';
    if (this.isSubmitting || this.conflict) return;

    this.clearBackendErrors();
    this.trimFormValues();
    if (!this.hasAboutMeChanges()) return;
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      this.syncDirtyState();
      return;
    }

    const profile = this.context.detail();
    const profileId = this.context.selectedId();
    if (!profile || !profileId) return;

    const value = this.editForm.getRawValue();
    const update: UpdateProfileRequest = {
      profileName: profile.profileName,
      firstName: value.firstName,
      lastName: value.lastName,
      jobTitle: value.jobTitle,
      yearsOfExperience: value.yearsOfExperience,
      personality: value.personality,
      technicalSummary: value.technicalSummary,
      version: profile.version,
    };

    this.isSubmitting = true;
    this.profileService.update(profileId, update).subscribe({
      next: (updated) => {
        this.context.replaceDetail(updated);
        this.isSubmitting = false;
        this.conflict = false;
        this.previewInvalidated = !updated.hasPreviewed;
        this.saveMessage = this.previewInvalidated
          ? 'About Me saved. Preview is no longer current; generate a new preview before exporting.'
          : 'About Me saved.';
        this.closeEditor();
      },
      error: (error: unknown) => this.handleSaveError(error),
    });
  }

  submitEducation(): void {
    const mode = this.educationEditorMode;
    if (!mode || this.isEducationSubmitting || this.educationConflict) return;

    this.educationErrorMessage = '';
    this.educationMessage = '';
    this.clearEducationBackendErrors();
    this.trimEducationFormValues();
    this.updateEducationDateValidation();
    if (!this.hasEducationChanges()) return;
    if (this.educationForm.invalid) {
      this.educationForm.markAllAsTouched();
      this.syncDirtyState();
      return;
    }

    const profile = this.context.detail();
    const profileId = this.context.selectedId();
    if (!profile || !profileId || String(profile.id) !== profileId) return;

    const value = this.educationForm.getRawValue();
    const request: EducationRequest = {
      schoolName: value.schoolName,
      degree: value.degree,
      fieldOfStudy: value.fieldOfStudy || null,
      startDate: value.startDate,
      endDate: value.status === 'ONGOING' ? null : value.endDate || null,
      status: value.status,
      version: profile.version,
    };
    const educationId = this.editingEducationId;
    const operationGeneration = this.educationMutationGeneration;
    this.isEducationSubmitting = true;
    const request$ = mode === 'edit' && educationId !== null
      ? this.profileService.updateEducation(profileId, educationId, request)
      : this.profileService.createEducation(profileId, request);

    request$.subscribe({
      next: (result) => {
        if (!this.isCurrentEducationOperation(profileId, operationGeneration)) return;
        if (!this.context.applyMutationVersion(profileId, result.profileVersion)) return;

        this.educations = mode === 'edit' && educationId !== null
          ? this.educations.map((education) => String(education.id) === String(educationId) ? result.education : education)
          : this.sortEducations([...this.educations, result.education]);
        this.isEducationSubmitting = false;
        this.educationConflict = false;
        this.previewInvalidated = true;
        this.educationMessage = mode === 'edit'
          ? 'Education updated. Preview is no longer current; generate a new preview before exporting.'
          : 'Education added. Preview is no longer current; generate a new preview before exporting.';
        this.closeEducationEditor();
      },
      error: (error: unknown) => {
        if (!this.isCurrentEducationOperation(profileId, operationGeneration)) return;
        this.handleEducationSaveError(error);
      },
    });
  }

  submitLanguage(): void {
    const mode = this.languageEditorMode;
    if (!mode || this.isLanguageSubmitting || this.languageConflict) return;

    this.languageErrorMessage = '';
    this.languageMessage = '';
    this.clearLanguageBackendErrors();
    if (!this.hasLanguageChanges()) return;
    if (!this.languageMasterReady || this.languageMasterLoading || this.languageMasterError) {
      this.languageErrorMessage = this.languageMasterLoading
        ? 'Language options are still loading. Please try again when they are available.'
        : 'Language options are unavailable. Retry the Language Master request before saving.';
      this.syncDirtyState();
      return;
    }
    if (this.languageForm.invalid) {
      this.languageForm.markAllAsTouched();
      this.syncDirtyState();
      return;
    }

    const profile = this.context.detail();
    const profileId = this.context.selectedId();
    if (!profile || !profileId || String(profile.id) !== profileId) return;

    const value = this.languageForm.getRawValue();
    const duplicate = this.languages.some((language) => String(language.languageId) === String(value.languageId)
      && (mode !== 'edit' || String(language.profileLanguageId) !== String(this.editingProfileLanguageId)));
    if (duplicate) {
      this.setLanguageFieldError('languageId', 'This Language is already assigned to this Profile.', 'duplicate');
      this.languageErrorMessage = 'This Language is already assigned to this Profile.';
      this.syncDirtyState();
      return;
    }

    const request: ProfileLanguageRequest = {
      languageId: value.languageId as number | string,
      level: value.level,
      version: profile.version,
    };
    const languageId = this.editingProfileLanguageId;
    const operationGeneration = this.languageMutationGeneration;
    this.isLanguageSubmitting = true;
    const request$ = mode === 'edit' && languageId !== null
      ? this.profileService.updateProfileLanguage(profileId, languageId, request)
      : this.profileService.createProfileLanguage(profileId, request);

    request$.subscribe({
      next: (result) => {
        if (!this.isCurrentLanguageOperation(profileId, operationGeneration)) return;
        if (!this.context.applyMutationVersion(profileId, result.profileVersion)) return;

        this.languages = mode === 'edit' && languageId !== null
          ? this.sortProfileLanguages(this.languages.map((language) => String(language.profileLanguageId) === String(languageId) ? result.profileLanguage : language))
          : this.sortProfileLanguages([...this.languages, result.profileLanguage]);
        this.isLanguageSubmitting = false;
        this.languageConflict = false;
        this.previewInvalidated = true;
        this.languageMessage = mode === 'edit'
          ? 'Language updated. Preview is no longer current; generate a new preview before exporting.'
          : 'Language added. Preview is no longer current; generate a new preview before exporting.';
        this.closeLanguageEditor();
      },
      error: (error: unknown) => {
        if (!this.isCurrentLanguageOperation(profileId, operationGeneration)) return;
        this.handleLanguageSaveError(error);
      },
    });
  }

  submitCertificate(): void {
    const mode = this.certificateEditorMode;
    if (!mode || this.isCertificateSubmitting || this.certificateConflict) return;

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
    const operationGeneration = this.certificateMutationGeneration;
    this.isCertificateSubmitting = true;
    const request$ = mode === 'edit' && certificateId !== null
      ? this.profileService.updateCertificate(profileId, certificateId, request)
      : this.profileService.createCertificate(profileId, request);

    request$.subscribe({
      next: (result) => {
        if (!this.isCurrentCertificateOperation(profileId, operationGeneration)) return;
        if (!this.context.applyMutationVersion(profileId, result.profileVersion)) return;

        this.certificates = this.sortCertificates(mode === 'edit' && certificateId !== null
          ? this.certificates.map((certificate) => String(certificate.id) === String(certificateId) ? result.certificate : certificate)
          : [...this.certificates, result.certificate]);
        this.isCertificateSubmitting = false;
        this.certificateConflict = false;
        this.previewInvalidated = true;
        this.certificateMessage = mode === 'edit'
          ? 'Certificate updated. Preview is no longer current; generate a new preview before exporting.'
          : 'Certificate added. Preview is no longer current; generate a new preview before exporting.';
        this.closeCertificateEditor();
      },
      error: (error: unknown) => {
        if (!this.isCurrentCertificateOperation(profileId, operationGeneration)) return;
        this.handleCertificateSaveError(error);
      },
    });
  }

  reloadLatest(): void {
    if (this.certificateEditorMode) {
      if (this.isReloading || !this.certificateConflict) return;
      if (this.certificateForm.dirty) {
        this.reloadConfirmation = true;
        return;
      }
      this.fetchLatestCertificate();
      return;
    }
    if (this.languageEditorMode) {
      if (this.isReloading || !this.languageConflict) return;
      if (this.languageForm.dirty) {
        this.reloadConfirmation = true;
        return;
      }
      this.fetchLatestLanguage();
      return;
    }
    if (this.educationEditorMode) {
      if (this.isReloading || !this.educationConflict) return;
      if (this.educationForm.dirty) {
        this.reloadConfirmation = true;
        return;
      }
      this.fetchLatestEducation();
      return;
    }
    if (this.isReloading || !this.conflict) return;
    if (this.editForm.dirty) {
      this.reloadConfirmation = true;
      return;
    }
    this.fetchLatest();
  }

  confirmReloadLatest(): void {
    this.reloadConfirmation = false;
    if (this.certificateEditorMode) {
      this.fetchLatestCertificate();
    } else if (this.languageEditorMode) {
      this.fetchLatestLanguage();
    } else if (this.educationEditorMode) {
      this.fetchLatestEducation();
    } else {
      this.fetchLatest();
    }
  }

  fieldError(field: EditableAboutMeField): string {
    const errors = this.editForm.controls[field].errors;
    if (!errors) return '';
    if (errors['backend']) return errors['backend'];
    if (errors['required']) return 'This field is required.';
    if (errors['maxlength']) return `Use ${errors['maxlength'].requiredLength} characters or fewer.`;
    if (errors['min']) return 'Enter a non-negative number.';
    return 'This value is not valid.';
  }

  educationFieldError(field: EditableEducationField): string {
    const errors = this.educationForm.controls[field].errors;
    if (errors?.['backend']) return errors['backend'];
    if (errors?.['required']) return 'This field is required.';
    if (errors?.['maxlength']) return `Use ${errors['maxlength'].requiredLength} characters or fewer.`;
    if (field === 'endDate' && this.educationForm.errors?.['dateRange']) return 'End date must be on or after the start date.';
    return errors ? 'This value is not valid.' : '';
  }

  educationFieldInvalid(field: EditableEducationField): boolean {
    const control = this.educationForm.controls[field];
    return control.invalid && control.touched || field === 'endDate' && !!this.educationForm.errors?.['dateRange'] && control.touched;
  }

  languageFieldError(field: EditableLanguageField): string {
    const errors = this.languageForm.controls[field].errors;
    if (errors?.['backend']) return errors['backend'];
    if (errors?.['duplicate']) return errors['duplicate'];
    if (errors?.['required']) return 'This field is required.';
    if (errors?.['invalidLevel']) return 'Select a supported proficiency level.';
    return errors ? 'This value is not valid.' : '';
  }

  languageFieldInvalid(field: EditableLanguageField): boolean {
    const control = this.languageForm.controls[field];
    return control.invalid && control.touched;
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

  languageRecordLabel(language: ProfileLanguage): string {
    return `${language.languageName} (${this.languageLevelLabel(language.level)})`;
  }

  languageLevelLabel(level: LanguageLevel): string {
    return this.languageLevels.find((option) => option.value === level)?.label ?? level;
  }

  languageOptions(): LanguageMasterOption[] {
    const selectedId = this.languageForm.controls.languageId.value;
    const assignedIds = new Set(this.languages.map((language) => String(language.languageId)));
    const options = this.languageMasterOptions.filter((option) => !assignedIds.has(String(option.id)) || String(option.id) === String(selectedId));
    if (selectedId !== null && selectedId !== undefined && !options.some((option) => String(option.id) === String(selectedId))) {
      const selected = this.languages.find((language) => String(language.languageId) === String(selectedId));
      if (selected) options.unshift({ id: selected.languageId, name: selected.languageName });
    }
    return options;
  }

  educationDateLabel(education: Education): string {
    return `${education.startDate} - ${education.endDate ?? 'Present'}`;
  }

  educationRecordLabel(education: Education): string {
    return `${education.degree} at ${education.schoolName}`;
  }

  certificateRecordLabel(certificate: Certificate): string {
    return `${certificate.certificateName} (${certificate.issueDate})`;
  }

  discardPendingNavigation(): void {
    this.closeEditor();
    this.editSession.resolveNavigation(true);
  }

  keepPendingNavigation(): void {
    this.editSession.resolveNavigation(false);
  }

  private loadEducations(profileId: string): void {
    this.educationListCancel.next();
    const generation = ++this.educationListGeneration;
    this.educations = [];
    this.educationLoading = true;
    this.educationError = null;
    this.profileService.listEducations(profileId).pipe(takeUntil(this.educationListCancel)).subscribe({
      next: (educations) => {
        if (!this.isCurrentEducationProfile(profileId, generation)) return;
        this.educations = educations;
        this.educationLoading = false;
      },
      error: (error: unknown) => {
        if (!this.isCurrentEducationProfile(profileId, generation)) return;
        this.educationError = error;
        this.educationLoading = false;
      },
    });
  }

  private loadProfileLanguages(profileId: string): void {
    this.languageListCancel.next();
    const generation = ++this.languageListGeneration;
    this.languages = [];
    this.languageLoading = true;
    this.languageError = null;
    this.languageMessage = '';
    this.profileService.listProfileLanguages(profileId).pipe(takeUntil(this.languageListCancel)).subscribe({
      next: (languages) => {
        if (!this.isCurrentLanguageProfile(profileId, generation)) return;
        this.languages = this.sortProfileLanguages(languages);
        this.languageLoading = false;
      },
      error: (error: unknown) => {
        if (!this.isCurrentLanguageProfile(profileId, generation)) return;
        this.languageError = error;
        this.languageLoading = false;
      },
    });
  }

  private loadCertificates(profileId: string): void {
    this.certificateListCancel.next();
    const generation = ++this.certificateListGeneration;
    this.certificates = [];
    this.certificateLoading = true;
    this.certificateError = null;
    this.profileService.listCertificates(profileId).pipe(takeUntil(this.certificateListCancel)).subscribe({
      next: (certificates) => {
        if (!this.isCurrentCertificateProfile(profileId, generation)) return;
        this.certificates = this.sortCertificates(certificates);
        this.certificateLoading = false;
      },
      error: (error: unknown) => {
        if (!this.isCurrentCertificateProfile(profileId, generation)) return;
        this.certificateError = error;
        this.certificateLoading = false;
      },
    });
  }

  private loadLanguageMaster(page: number, search: string): void {
    this.languageMasterCancel.next();
    const generation = ++this.languageMasterGeneration;
    this.languageMasterLoading = true;
    this.languageMasterError = null;
    this.languageMasterReady = false;
    this.profileService.listLanguageMaster(page, this.languageMasterSize, search).pipe(takeUntil(this.languageMasterCancel)).subscribe({
      next: (result) => {
        if (this.languageMasterGeneration !== generation) return;
        this.languageMasterOptions = result.content;
        this.languageMasterPage = result.page;
        this.languageMasterTotalElements = result.totalElements;
        this.languageMasterTotalPages = result.totalPages;
        this.languageMasterSearch = search;
        this.languageMasterSearchDraft = search;
        this.languageMasterLoading = false;
        this.languageMasterReady = true;
      },
      error: (error: unknown) => {
        if (this.languageMasterGeneration !== generation) return;
        this.languageMasterError = error;
        this.languageMasterLoading = false;
      },
    });
  }

  private fetchLatest(): void {
    const profileId = this.context.selectedId();
    if (!profileId) return;

    const current = this.context.detail();
    if (current) this.editForm.reset(this.formValues(current));
    this.editForm.markAsPristine();
    this.editForm.markAsUntouched();
    this.isEditing = false;
    this.isReloading = true;
    this.isSubmitting = false;
    this.errorMessage = '';
    this.saveMessage = '';
    this.editSession.setDirty(false);

    this.context.reloadDetail(profileId).subscribe({
      next: (latest) => {
        this.editForm.reset(this.formValues(latest));
        this.editForm.markAsPristine();
        this.editForm.markAsUntouched();
        this.isReloading = false;
        this.conflict = false;
        this.saveMessage = 'Latest Profile data loaded. Review it before editing.';
      },
      error: (error: unknown) => {
        this.isReloading = false;
        this.conflict = true;
        this.errorMessage = this.apiError(error)?.message?.trim() || 'Unable to reload the latest Profile right now. Please try again.';
      },
    });
  }

  private fetchLatestEducation(): void {
    const profileId = this.context.selectedId();
    if (!profileId) return;

    this.closeEducationEditor();
    this.isReloading = true;
    this.educationErrorMessage = '';
    this.educationMessage = '';
    this.context.reloadDetail(profileId).subscribe({
      next: () => {
        if (this.context.selectedId() !== profileId) return;
        this.isReloading = false;
        this.educationConflict = false;
        this.educationMessage = 'Latest Profile and Education data loaded. Review it before editing.';
        this.loadEducations(profileId);
      },
      error: (error: unknown) => {
        this.isReloading = false;
        this.educationErrorMessage = this.apiError(error)?.message?.trim() || 'Unable to reload the latest Profile right now. Please try again.';
      },
    });
  }

  private fetchLatestLanguage(): void {
    const profileId = this.context.selectedId();
    if (!profileId) return;

    this.closeLanguageEditor();
    this.isReloading = true;
    this.languageErrorMessage = '';
    this.languageMessage = '';
    this.context.reloadDetail(profileId).subscribe({
      next: () => {
        if (this.context.selectedId() !== profileId || this.activeProfileId !== profileId) return;
        this.isReloading = false;
        this.languageConflict = false;
        this.languageMessage = 'Latest Profile and Language data loaded. Review it before editing.';
        this.loadProfileLanguages(profileId);
      },
      error: (error: unknown) => {
        if (this.context.selectedId() !== profileId || this.activeProfileId !== profileId) return;
        this.isReloading = false;
        this.languageErrorMessage = this.apiError(error)?.message?.trim() || 'Unable to reload the latest Profile right now. Please try again.';
      },
    });
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
        if (this.context.selectedId() !== profileId || this.activeProfileId !== profileId) return;
        this.isReloading = false;
        this.certificateConflict = false;
        this.certificateMessage = 'Latest Profile and Certificate data loaded. Review it before editing.';
        this.loadCertificates(profileId);
      },
      error: (error: unknown) => {
        if (this.context.selectedId() !== profileId || this.activeProfileId !== profileId) return;
        this.isReloading = false;
        this.certificateErrorMessage = this.apiError(error)?.message?.trim() || 'Unable to reload the latest Profile right now. Please try again.';
      },
    });
  }

  private closeEditor(): void {
    this.originalAboutMeValues = null;
    this.isEditing = false;
    this.isSubmitting = false;
    this.cancelConfirmation = false;
    this.reloadConfirmation = false;
    this.conflict = false;
    this.editSession.setDirty(false);
    this.closeEducationEditor();
    this.closeLanguageEditor();
    this.closeCertificateEditor();
    const profile = this.context.detail();
    if (profile) {
      this.editForm.reset(this.formValues(profile));
      this.editForm.markAsPristine();
      this.editForm.markAsUntouched();
    }
  }

  private closeEducationEditor(): void {
    this.educationMutationGeneration++;
    this.educationEditorMode = null;
    this.editingEducationId = null;
    this.originalEducationValues = null;
    this.isEducationSubmitting = false;
    this.educationConflict = false;
    this.cancelConfirmation = false;
    this.reloadConfirmation = false;
    this.educationForm.reset(this.emptyEducationValues());
    this.educationForm.markAsPristine();
    this.educationForm.markAsUntouched();
    this.updateEducationDateValidation();
    this.syncDirtyState();
  }

  private closeLanguageEditor(): void {
    this.languageMutationGeneration++;
    this.languageEditorMode = null;
    this.editingProfileLanguageId = null;
    this.originalLanguageValues = null;
    this.isLanguageSubmitting = false;
    this.languageConflict = false;
    this.cancelConfirmation = false;
    this.reloadConfirmation = false;
    this.languageForm.reset(this.emptyLanguageValues());
    this.languageForm.markAsPristine();
    this.languageForm.markAsUntouched();
    this.clearLanguageBackendErrors();
    this.syncDirtyState();
  }

  private closeCertificateEditor(): void {
    this.certificateMutationGeneration++;
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

  private closeDeleteConfirmation(): void {
    this.deleteConfirmation = false;
    this.deleteTarget = null;
    this.deleteErrorMessage = '';
  }

  private closeEducationDeleteConfirmation(): void {
    this.educationDeleteConfirmation = false;
    this.educationDeleteTarget = null;
    this.educationDeleteErrorMessage = '';
    this.isEducationDeleting = false;
  }

  private closeLanguageDeleteConfirmation(): void {
    this.languageDeleteConfirmation = false;
    this.languageDeleteTarget = null;
    this.languageDeleteErrorMessage = '';
    this.isLanguageDeleting = false;
  }

  private closeCertificateDeleteConfirmation(): void {
    this.certificateDeleteConfirmation = false;
    this.certificateDeleteTarget = null;
    this.certificateDeleteErrorMessage = '';
    this.isCertificateDeleting = false;
  }

  private resetEducationState(): void {
    this.educationListCancel.next();
    this.educationListGeneration++;
    this.educationMutationGeneration++;
    this.educations = [];
    this.educationLoading = false;
    this.educationError = null;
    this.educationMessage = '';
    this.educationErrorMessage = '';
    this.previewInvalidated = false;
  }

  private resetLanguageState(): void {
    this.languageListCancel.next();
    this.languageListGeneration++;
    this.languageMutationGeneration++;
    this.languages = [];
    this.languageLoading = false;
    this.languageError = null;
    this.languageMessage = '';
    this.languageErrorMessage = '';
    this.closeLanguageDeleteConfirmation();
    this.previewInvalidated = false;
  }

  private resetCertificateState(): void {
    this.certificateListCancel.next();
    this.certificateListGeneration++;
    this.certificateMutationGeneration++;
    this.certificates = [];
    this.certificateLoading = false;
    this.certificateError = null;
    this.certificateMessage = '';
    this.certificateErrorMessage = '';
    this.closeCertificateDeleteConfirmation();
    this.previewInvalidated = false;
  }

  private finishDelete(): void {
    this.closeEditor();
    this.closeDeleteConfirmation();
    this.isDeleting = false;

    this.context.refreshSummariesAndSelectFirst().subscribe({
      next: (first) => void this.router.navigate(first ? ['/profiles', first.id] : ['/profiles']),
      error: () => void this.router.navigate(['/profiles']),
    });
  }

  private handleSaveError(error: unknown): void {
    this.isSubmitting = false;
    const response = this.apiError(error);
    if (response?.errorCode === 'PROFILE_VERSION_CONFLICT') {
      this.conflict = true;
      this.errorMessage = response.message?.trim() || 'This Profile changed elsewhere. Reload the latest version before saving again.';
      this.syncDirtyState();
      return;
    }
    if (response?.errorCode === 'VALIDATION_ERROR') {
      this.applyFieldErrors(response.data);
      this.errorMessage = 'Please correct the highlighted fields.';
      this.syncDirtyState();
      return;
    }
    this.errorMessage = response?.message?.trim() || 'Unable to save this Profile right now. Your changes are still here.';
    this.syncDirtyState();
  }

  private openEducationEditor(education?: Education): void {
    const profile = this.context.detail();
    if (!profile || this.isEditing || this.educationEditorMode) return;

    const values = education ? this.educationFormValues(education) : this.emptyEducationValues();
    this.educationEditorMode = education ? 'edit' : 'create';
    this.editingEducationId = education ? education.id : null;
    this.originalEducationValues = this.normalizeEducationValues(values);
    this.educationForm.reset(values);
    this.educationForm.markAsPristine();
    this.educationForm.markAsUntouched();
    this.educationMutationGeneration++;
    this.educationConflict = false;
    this.cancelConfirmation = false;
    this.reloadConfirmation = false;
    this.educationErrorMessage = '';
    this.educationMessage = '';
    this.updateEducationDateValidation();
    this.syncDirtyState();
  }

  private handleEducationSaveError(error: unknown): void {
    this.isEducationSubmitting = false;
    const response = this.apiError(error);
    if (response?.errorCode === 'PROFILE_VERSION_CONFLICT') {
      this.educationConflict = true;
      this.educationErrorMessage = response.message?.trim() || 'This Profile changed elsewhere. Reload the latest version before saving again.';
      this.syncDirtyState();
      return;
    }
    if (response?.errorCode === 'VALIDATION_ERROR') {
      this.applyEducationFieldErrors(response.data);
      this.educationErrorMessage = 'Please correct the highlighted fields.';
      this.syncDirtyState();
      return;
    }

    const businessField: Record<string, EditableEducationField> = {
      EDUCATION_INVALID_STATUS: 'status',
      EDUCATION_END_DATE_REQUIRED: 'endDate',
      EDUCATION_DATE_RANGE_INVALID: 'endDate',
    };
    const field = response?.errorCode ? businessField[response.errorCode] : undefined;
    if (field) this.setEducationFieldError(field, response?.message || 'This value is not valid.');
    this.educationErrorMessage = response?.message?.trim() || 'Unable to save this Education right now. Your changes are still here.';
    this.syncDirtyState();
  }

  private openLanguageEditor(language?: ProfileLanguage): void {
    const profile = this.context.detail();
    if (!profile || this.isEditing || this.educationEditorMode || this.languageEditorMode) return;

    const values = language ? this.languageFormValues(language) : this.emptyLanguageValues();
    this.languageEditorMode = language ? 'edit' : 'create';
    this.editingProfileLanguageId = language ? language.profileLanguageId : null;
    this.originalLanguageValues = this.normalizeLanguageValues(values);
    this.languageForm.reset(values);
    this.languageForm.markAsPristine();
    this.languageForm.markAsUntouched();
    this.languageMutationGeneration++;
    this.languageConflict = false;
    this.cancelConfirmation = false;
    this.reloadConfirmation = false;
    this.languageErrorMessage = '';
    this.languageMessage = '';
    this.loadLanguageMaster(0, this.languageMasterSearch);
    this.syncDirtyState();
  }

  private handleLanguageSaveError(error: unknown): void {
    this.isLanguageSubmitting = false;
    const response = this.apiError(error);
    if (response?.errorCode === 'PROFILE_VERSION_CONFLICT') {
      this.languageConflict = true;
      this.languageErrorMessage = response.message?.trim() || 'This Profile changed elsewhere. Reload the latest version before saving again.';
      this.syncDirtyState();
      return;
    }
    if (response?.errorCode === 'VALIDATION_ERROR') {
      this.applyLanguageFieldErrors(response.data);
      this.languageErrorMessage = 'Please correct the highlighted fields.';
      this.syncDirtyState();
      return;
    }

    if (response?.errorCode === 'PROFILE_LANGUAGE_ALREADY_EXISTS') {
      this.setLanguageFieldError('languageId', response.message || 'This Language is already assigned to this Profile.');
    } else if (response?.errorCode === 'PROFILE_LANGUAGE_INVALID_LEVEL') {
      this.setLanguageFieldError('level', response.message || 'Select a supported proficiency level.');
    }
    this.languageErrorMessage = response?.message?.trim() || 'Unable to save this Language right now. Your changes are still here.';
    this.syncDirtyState();
  }

  private openCertificateEditor(certificate?: Certificate): void {
    const profile = this.context.detail();
    if (!profile || this.isEditing || this.educationEditorMode || this.languageEditorMode || this.certificateEditorMode) return;

    const values = certificate ? this.certificateFormValues(certificate) : this.emptyCertificateValues();
    this.certificateEditorMode = certificate ? 'edit' : 'create';
    this.editingCertificateId = certificate ? certificate.id : null;
    this.originalCertificateValues = this.normalizeCertificateValues(values);
    this.certificateForm.reset(values);
    this.certificateForm.markAsPristine();
    this.certificateForm.markAsUntouched();
    this.certificateMutationGeneration++;
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

  private trimFormValues(): void {
    const value = this.editForm.getRawValue();
    this.editForm.patchValue({
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      jobTitle: value.jobTitle.trim(),
      personality: value.personality.trim(),
      technicalSummary: value.technicalSummary.trim(),
    }, { emitEvent: false });
    this.editForm.updateValueAndValidity({ emitEvent: false });
  }

  private trimEducationFormValues(): void {
    const value = this.educationForm.getRawValue();
    this.educationForm.patchValue({
      schoolName: value.schoolName.trim(),
      degree: value.degree.trim(),
      fieldOfStudy: value.fieldOfStudy.trim(),
      startDate: value.startDate.trim(),
      endDate: value.endDate.trim(),
    }, { emitEvent: false });
    this.educationForm.updateValueAndValidity({ emitEvent: false });
  }

  private trimCertificateFormValues(): void {
    const value = this.certificateForm.getRawValue();
    this.certificateForm.patchValue({
      certificateName: value.certificateName.trim(),
      issueDate: value.issueDate.trim(),
    }, { emitEvent: false });
    this.certificateForm.updateValueAndValidity({ emitEvent: false });
  }

  private applyLanguageFieldErrors(data: unknown): void {
    const errors = (data as { errors?: unknown } | undefined)?.errors;
    if (!Array.isArray(errors)) return;
    for (const error of errors) {
      if (!error || typeof error !== 'object') continue;
      const { field, message } = error as { field?: unknown; message?: unknown };
      const normalizedField = typeof field === 'string' ? field.split('.').pop() : undefined;
      if (normalizedField && typeof message === 'string' && normalizedField in this.languageForm.controls) {
        this.setLanguageFieldError(normalizedField as EditableLanguageField, message);
      }
    }
  }

  private applyFieldErrors(data: unknown): void {
    const errors = (data as { errors?: unknown } | undefined)?.errors;
    if (!Array.isArray(errors)) return;
    for (const error of errors) {
      if (!error || typeof error !== 'object') continue;
      const { field, message } = error as { field?: unknown; message?: unknown };
      if (typeof field === 'string' && typeof message === 'string' && field in this.editForm.controls) {
        this.setBackendFieldError(field as EditableAboutMeField, message);
      }
    }
  }

  private clearBackendErrors(): void {
    for (const control of Object.values(this.editForm.controls)) {
      if (!control.errors?.['backend']) continue;
      const errors = { ...control.errors };
      delete errors['backend'];
      control.setErrors(Object.keys(errors).length ? errors : null);
    }
  }

  private setBackendFieldError(field: EditableAboutMeField, message: string): void {
    const control = this.editForm.controls[field];
    control.setErrors({ ...control.errors, backend: message.trim() || 'This value is not valid.' });
    control.markAsTouched();
  }

  private applyEducationFieldErrors(data: unknown): void {
    const errors = (data as { errors?: unknown } | undefined)?.errors;
    if (!Array.isArray(errors)) return;
    for (const error of errors) {
      if (!error || typeof error !== 'object') continue;
      const { field, message } = error as { field?: unknown; message?: unknown };
      const normalizedField = typeof field === 'string' ? field.split('.').pop() : undefined;
      if (normalizedField && typeof message === 'string' && normalizedField in this.educationForm.controls) {
        this.setEducationFieldError(normalizedField as EditableEducationField, message);
      }
    }
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

  private clearEducationBackendErrors(): void {
    for (const control of Object.values(this.educationForm.controls)) {
      if (!control.errors?.['backend']) continue;
      const errors = { ...control.errors };
      delete errors['backend'];
      control.setErrors(Object.keys(errors).length ? errors : null);
    }
  }

  private clearLanguageBackendErrors(): void {
    for (const control of Object.values(this.languageForm.controls)) {
      if (!control.errors?.['backend']) continue;
      const errors = { ...control.errors };
      delete errors['backend'];
      control.setErrors(Object.keys(errors).length ? errors : null);
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

  private setEducationFieldError(field: EditableEducationField, message: string): void {
    const control = this.educationForm.controls[field];
    control.setErrors({ ...control.errors, backend: message.trim() || 'This value is not valid.' });
    control.markAsTouched();
  }

  private setLanguageFieldError(field: EditableLanguageField, message: string, key = 'backend'): void {
    const control = this.languageForm.controls[field];
    control.setErrors({ ...control.errors, [key]: message.trim() || 'This value is not valid.' });
    control.markAsTouched();
  }

  private setCertificateFieldError(field: EditableCertificateField, message: string, key = 'backend'): void {
    const control = this.certificateForm.controls[field];
    control.setErrors({ ...control.errors, [key]: message.trim() || 'This value is not valid.' });
    control.markAsTouched();
  }

  private formValues(profile: ProfileDetail) {
    return {
      firstName: profile.firstName,
      lastName: profile.lastName,
      jobTitle: profile.jobTitle,
      yearsOfExperience: profile.yearsOfExperience,
      personality: profile.personality ?? '',
      technicalSummary: profile.technicalSummary ?? '',
    };
  }

  private emptyEducationValues(): EditableEducationValues {
    return { schoolName: '', degree: '', fieldOfStudy: '', startDate: '', endDate: '', status: 'ONGOING' };
  }

  private emptyLanguageValues(): EditableLanguageValues {
    return { languageId: null, level: 'BEGINNER' };
  }

  private emptyCertificateValues(): EditableCertificateValues {
    return { certificateName: '', issueDate: '' };
  }

  private educationFormValues(education: Education): EditableEducationValues {
    return {
      schoolName: education.schoolName,
      degree: education.degree,
      fieldOfStudy: education.fieldOfStudy ?? '',
      startDate: education.startDate,
      endDate: education.endDate ?? '',
      status: education.status,
    };
  }

  private languageFormValues(language: ProfileLanguage): EditableLanguageValues {
    return { languageId: language.languageId, level: language.level };
  }

  private certificateFormValues(certificate: Certificate): EditableCertificateValues {
    return { certificateName: certificate.certificateName, issueDate: certificate.issueDate };
  }

  private educationDateRangeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value as Partial<EditableEducationValues> | null;
      if (value?.status === 'COMPLETED' && value.startDate && value.endDate && value.startDate > value.endDate) {
        return { dateRange: true };
      }
      return null;
    };
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

  private updateEducationDateValidation(): void {
    const endDate = this.educationForm.controls.endDate;
    endDate.setValidators(this.educationForm.controls.status.value === 'COMPLETED' ? [Validators.required] : []);
    endDate.updateValueAndValidity({ emitEvent: false });
    this.educationForm.updateValueAndValidity({ emitEvent: false });
  }

  private normalizeEducationValues(value: EditableEducationValues): EditableEducationValues {
    return {
      schoolName: value.schoolName.trim(),
      degree: value.degree.trim(),
      fieldOfStudy: value.fieldOfStudy.trim(),
      startDate: value.startDate.trim(),
      endDate: value.endDate.trim(),
      status: value.status,
    };
  }

  private normalizeLanguageValues(value: EditableLanguageValues): EditableLanguageValues {
    return { languageId: value.languageId, level: value.level };
  }

  private normalizeCertificateValues(value: EditableCertificateValues): EditableCertificateValues {
    return { certificateName: value.certificateName.trim(), issueDate: value.issueDate.trim() };
  }

  hasEducationChanges(): boolean {
    const original = this.originalEducationValues;
    if (!original) return false;
    const current = this.normalizeEducationValues(this.educationForm.getRawValue());
    return current.schoolName !== original.schoolName
      || current.degree !== original.degree
      || current.fieldOfStudy !== original.fieldOfStudy
      || current.startDate !== original.startDate
      || current.endDate !== original.endDate
      || current.status !== original.status;
  }

  hasLanguageChanges(): boolean {
    const original = this.originalLanguageValues;
    if (!original) return false;
    const current = this.normalizeLanguageValues(this.languageForm.getRawValue());
    return current.languageId !== original.languageId || current.level !== original.level;
  }

  hasCertificateChanges(): boolean {
    const original = this.originalCertificateValues;
    if (!original) return false;
    const current = this.normalizeCertificateValues(this.certificateForm.getRawValue());
    return current.certificateName !== original.certificateName || current.issueDate !== original.issueDate;
  }

  private isCurrentEducationProfile(profileId: string, generation: number): boolean {
    return this.activeProfileId === profileId
      && this.educationListGeneration === generation;
  }

  private isCurrentLanguageProfile(profileId: string, generation: number): boolean {
    return this.activeProfileId === profileId
      && this.languageListGeneration === generation;
  }

  private isCurrentCertificateProfile(profileId: string, generation: number): boolean {
    return this.activeProfileId === profileId
      && this.certificateListGeneration === generation;
  }

  private isCurrentEducationOperation(profileId: string, generation: number, requiresEditor = true): boolean {
    return this.activeProfileId === profileId
      && this.context.selectedId() === profileId
      && String(this.context.detail()?.id) === profileId
      && this.educationMutationGeneration === generation
      && (!requiresEditor || this.educationEditorMode !== null);
  }

  private isCurrentLanguageOperation(profileId: string, generation: number, requiresEditor = true): boolean {
    return this.activeProfileId === profileId
      && this.context.selectedId() === profileId
      && String(this.context.detail()?.id) === profileId
      && this.languageMutationGeneration === generation
      && (!requiresEditor || this.languageEditorMode !== null);
  }

  private isCurrentCertificateOperation(profileId: string, generation: number, requiresEditor = true): boolean {
    return this.activeProfileId === profileId
      && this.context.selectedId() === profileId
      && String(this.context.detail()?.id) === profileId
      && this.certificateMutationGeneration === generation
      && (!requiresEditor || this.certificateEditorMode !== null);
  }

  private sortEducations(educations: Education[]): Education[] {
    return educations.sort((left, right) => {
      const leftId = Number(left.id);
      const rightId = Number(right.id);
      if (Number.isFinite(leftId) && Number.isFinite(rightId)) return leftId - rightId;
      return String(left.id).localeCompare(String(right.id));
    });
  }

  private sortProfileLanguages(languages: ProfileLanguage[]): ProfileLanguage[] {
    const proficiencyOrder: Record<LanguageLevel, number> = {
      NATIVE: 0,
      ADVANCED: 1,
      UPPER_INTERMEDIATE: 2,
      INTERMEDIATE: 3,
      BEGINNER: 4,
    };
    return languages.sort((left, right) => {
      const levelDifference = proficiencyOrder[left.level] - proficiencyOrder[right.level];
      if (levelDifference) return levelDifference;
      const nameDifference = left.languageName.toLocaleLowerCase().localeCompare(right.languageName.toLocaleLowerCase());
      if (nameDifference) return nameDifference;
      const leftId = Number(left.profileLanguageId);
      const rightId = Number(right.profileLanguageId);
      if (Number.isFinite(leftId) && Number.isFinite(rightId)) return leftId - rightId;
      return String(left.profileLanguageId).localeCompare(String(right.profileLanguageId));
    });
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

  private languageLevelValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => this.languageLevels?.some((option) => option.value === control.value)
      ? null
      : { invalidLevel: true };
  }

  hasAboutMeChanges(): boolean {
    const original = this.originalAboutMeValues;
    if (!original) return false;

    const current = this.normalizeAboutMeValues(this.editForm.getRawValue());
    return current.firstName !== original.firstName
      || current.lastName !== original.lastName
      || current.jobTitle !== original.jobTitle
      || current.yearsOfExperience !== original.yearsOfExperience
      || current.personality !== original.personality
      || current.technicalSummary !== original.technicalSummary;
  }

  private normalizeAboutMeValues(value: EditableAboutMeValues): EditableAboutMeValues {
    return {
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      jobTitle: value.jobTitle.trim(),
      yearsOfExperience: value.yearsOfExperience,
      personality: value.personality.trim(),
      technicalSummary: value.technicalSummary.trim(),
    };
  }

  private apiError(error: unknown): ApiErrorResponse | undefined {
    return error instanceof HttpErrorResponse ? error.error as ApiErrorResponse : undefined;
  }

  private syncDirtyState(): void {
    this.editSession.setDirty((this.isEditing && (this.editForm.dirty || this.hasAboutMeChanges()))
      || (this.educationEditorMode !== null && (this.educationForm.dirty || this.hasEducationChanges()))
      || (this.languageEditorMode !== null && (this.languageForm.dirty || this.hasLanguageChanges()))
      || (this.certificateEditorMode !== null && (this.certificateForm.dirty || this.hasCertificateChanges())));
  }
}
