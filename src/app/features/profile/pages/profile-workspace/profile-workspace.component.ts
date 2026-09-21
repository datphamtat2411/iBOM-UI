import { HttpErrorResponse } from '@angular/common/http';
import { Component, effect, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { ApiErrorResponse } from '../../../../core/http/api.models';
import { NotificationService } from '../../../../core/notifications/notification.service';
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
  Project,
  ProfileSkill,
  ProfileSkillRequest,
  ProfileDetail,
  SkillMasterOption,
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
  level: LanguageLevel | null;
};
type CertificateEditorMode = 'create' | 'edit' | null;
type EditableCertificateField = keyof EditableCertificateValues;
type EditableCertificateValues = {
  certificateName: string;
  issueDate: string;
};
type SkillEditorMode = 'create' | 'edit' | null;
type EditableSkillField = keyof EditableSkillValues;
type EditableSkillValues = {
  skillId: number | string | null;
  experienceYears: number | null;
  lastUsed: string;
};
type MasterComboboxState = 'idle' | 'loading' | 'results' | 'empty' | 'error' | 'selected';
type MutationPostSaveIntent = 'close' | 'add-another';

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
  private readonly notifications = inject(NotificationService);
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
    level: this.formBuilder.control<LanguageLevel | null>(null, [Validators.required, this.languageLevelValidator()]),
  });
  readonly certificateForm = this.formBuilder.nonNullable.group({
    certificateName: ['', [Validators.required, Validators.maxLength(255)]],
    issueDate: ['', [Validators.required, this.certificateIssueDateValidator()]],
  });
  readonly certificateDateMax = this.currentDate();
  readonly skillForm = this.formBuilder.group({
    skillId: this.formBuilder.control<number | string | null>(null, [Validators.required]),
    experienceYears: this.formBuilder.control<number | null>(null, [Validators.required, Validators.min(0)]),
    lastUsed: this.formBuilder.nonNullable.control('', [this.skillLastUsedValidator()]),
  });
  readonly skillDateMax = this.currentDate();

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
  projects: Project[] = [];
  private readonly expandedProjectIds = new Set<string>();
  projectLoading = false;
  projectError: unknown | null = null;
  projectMessage = '';
  isProjectDeleting = false;
  projectDeleteConfirmation = false;
  projectDeleteTarget: Project | null = null;
  projectDeleteErrorMessage = '';
  skills: ProfileSkill[] = [];
  skillLoading = false;
  skillError: unknown | null = null;
  skillEditorMode: SkillEditorMode = null;
  skillConflict = false;
  isSkillSubmitting = false;
  skillErrorMessage = '';
  skillMessage = '';
  isSkillDeleting = false;
  skillDeleteConfirmation = false;
  skillDeleteTarget: ProfileSkill | null = null;
  skillDeleteErrorMessage = '';
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
  languageMasterState: MasterComboboxState = 'idle';
  languageMasterDropdownOpen = false;
  languageMasterHighlightedIndex = -1;
  languageInputValue = '';
  selectedLanguageMasterOption: LanguageMasterOption | null = null;
  skillMasterOptions: SkillMasterOption[] = [];
  skillMasterPage = 0;
  skillMasterSize = 10;
  skillMasterTotalElements = 0;
  skillMasterTotalPages = 0;
  skillMasterSearch = '';
  skillMasterSearchDraft = '';
  skillMasterLoading = false;
  skillMasterError: unknown | null = null;
  skillMasterReady = false;
  skillMasterState: MasterComboboxState = 'idle';
  skillMasterDropdownOpen = false;
  skillMasterHighlightedIndex = -1;
  skillInputValue = '';
  selectedSkillMasterOption: SkillMasterOption | null = null;
  private readonly educationListCancel = new Subject<void>();
  private readonly languageListCancel = new Subject<void>();
  private readonly certificateListCancel = new Subject<void>();
  private readonly projectListCancel = new Subject<void>();
  private readonly languageMasterCancel = new Subject<void>();
  private readonly skillListCancel = new Subject<void>();
  private readonly skillMasterCancel = new Subject<void>();
  private educationListGeneration = 0;
  private educationMutationGeneration = 0;
  private languageListGeneration = 0;
  private languageMutationGeneration = 0;
  private certificateListGeneration = 0;
  private certificateMutationGeneration = 0;
  private projectListGeneration = 0;
  private projectMutationGeneration = 0;
  private languageMasterGeneration = 0;
  private skillListGeneration = 0;
  private skillMutationGeneration = 0;
  private skillMasterGeneration = 0;
  private languageSearchTimer: ReturnType<typeof setTimeout> | null = null;
  private skillSearchTimer: ReturnType<typeof setTimeout> | null = null;
  private activeProfileId: string | null = null;
  private editingEducationId: number | string | null = null;
  private originalEducationValues: EditableEducationValues | null = null;
  private editingProfileLanguageId: number | string | null = null;
  private originalLanguageValues: EditableLanguageValues | null = null;
  private originalLanguageInputValue = '';
  private editingCertificateId: number | string | null = null;
  private originalCertificateValues: EditableCertificateValues | null = null;
  private editingProfileSkillId: number | string | null = null;
  private originalSkillValues: EditableSkillValues | null = null;
  private originalSkillInputValue = '';

  constructor() {
    this.context.loadSummaries();
    this.editForm.valueChanges.subscribe(() => this.syncDirtyState());
    this.educationForm.valueChanges.subscribe(() => this.syncDirtyState());
    this.languageForm.valueChanges.subscribe(() => this.syncDirtyState());
    this.certificateForm.valueChanges.subscribe(() => this.syncDirtyState());
    this.skillForm.valueChanges.subscribe(() => this.syncDirtyState());
    this.educationForm.controls.status.valueChanges.subscribe(() => this.updateEducationDateValidation());
    this.route.paramMap.subscribe((params) => {
      this.closeEditor();
      this.closeDeleteConfirmation();
      this.closeEducationDeleteConfirmation();
      this.closeLanguageDeleteConfirmation();
      this.closeCertificateDeleteConfirmation();
      this.closeProjectDeleteConfirmation();
      this.closeSkillDeleteConfirmation();
      this.resetEducationState();
      this.resetLanguageState();
      this.resetCertificateState();
      this.resetProjectState();
      this.resetSkillState();
      const profileId = params.get('profileId');
      this.activeProfileId = profileId;
      if (profileId) {
        this.context.loadDetail(profileId);
        this.loadEducations(profileId);
        this.loadProfileLanguages(profileId);
        this.loadCertificates(profileId);
        this.loadProjects(profileId);
        this.loadProfileSkills(profileId);
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

  retrySkills(): void {
    const profileId = this.activeProfileId ?? this.context.selectedId();
    if (profileId) this.loadProfileSkills(profileId);
  }

  retryProjects(): void {
    const profileId = this.activeProfileId ?? this.context.selectedId();
    if (profileId) this.loadProjects(profileId);
  }

  startProjectCreate(): void {
    const profileId = this.context.selectedId();
    const profile = this.context.detail();
    if (!profileId || !profile || String(profile.id) !== profileId || this.isProjectDeleting) return;
    void this.router.navigate(['/profiles', profileId, 'projects', 'new']);
  }

  startProjectEdit(project: Project): void {
    const profileId = this.context.selectedId();
    const profile = this.context.detail();
    if (!profileId || !profile || String(profile.id) !== profileId || this.isProjectDeleting) return;
    if (!this.projects.some((item) => String(item.id) === String(project.id))) return;
    void this.router.navigate(['/profiles', profileId, 'projects', project.id]);
  }

  openProjectDeleteConfirmation(project: Project): void {
    if (this.isProjectDeleting) return;
    const profileId = this.context.selectedId();
    const profile = this.context.detail();
    if (!profileId || !profile || String(profile.id) !== profileId) return;
    if (!this.projects.some((item) => String(item.id) === String(project.id))) return;

    this.projectDeleteTarget = project;
    this.projectDeleteErrorMessage = '';
    this.projectDeleteConfirmation = true;
  }

  cancelProjectDelete(): void {
    if (this.isProjectDeleting) return;
    this.closeProjectDeleteConfirmation();
  }

  confirmProjectDelete(): void {
    const target = this.projectDeleteTarget;
    const profileId = this.context.selectedId();
    const profile = this.context.detail();
    if (!this.projectDeleteConfirmation || !target || this.isProjectDeleting || !profileId || !profile) return;
    if (String(profile.id) !== profileId || !this.projects.some((project) => String(project.id) === String(target.id))) {
      this.closeProjectDeleteConfirmation();
      return;
    }

    const operationGeneration = ++this.projectMutationGeneration;
    this.isProjectDeleting = true;
    this.projectDeleteErrorMessage = '';
    this.profileService.deleteProject(profileId, target.id, profile.version).subscribe({
      next: (result) => {
        if (!this.isCurrentProjectOperation(profileId, operationGeneration, false)) return;
        if (!this.context.applyMutationVersion(profileId, result.profileVersion)) return;

        this.isProjectDeleting = false;
        this.expandedProjectIds.delete(String(target.id));
        this.closeProjectDeleteConfirmation();
        this.previewInvalidated = true;
        this.projectMessage = 'Project deleted successfully.';
        this.notifications.showSuccess(this.projectMessage);
        this.loadProjects(profileId);
      },
      error: (error: unknown) => {
        if (!this.isCurrentProjectOperation(profileId, operationGeneration, false)) return;
        this.isProjectDeleting = false;
        this.projectDeleteErrorMessage = this.apiError(error)?.message?.trim() || 'Unable to delete this Project right now. The record is still here and you can retry.';
      },
    });
  }

  languageMasterInputChanged(value: string): void {
    this.languageInputValue = value;
    this.languageMasterSearchDraft = value;
    this.languageMasterDropdownOpen = true;
    this.languageMasterHighlightedIndex = -1;
    this.clearLanguageBackendErrors();

    const selected = this.selectedLanguageMasterOption;
    if (!selected || value.trim() !== selected.name.trim()) {
      this.selectedLanguageMasterOption = null;
      this.languageForm.controls.languageId.setValue(null);
      this.languageForm.controls.languageId.markAsDirty();
      this.languageForm.markAsDirty();
    }
    this.syncDirtyState();
    this.scheduleLanguageMasterSearch(value);
  }

  clearLanguageMasterInput(): void {
    this.languageMasterInputChanged('');
  }

  languageMasterFocused(): void {
    this.languageMasterDropdownOpen = true;
  }

  languageMasterBlurred(): void {
    setTimeout(() => {
      if (this.languageEditorMode) this.languageMasterDropdownOpen = false;
    }, 0);
  }

  languageMasterKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.languageMasterDropdownOpen = false;
      this.languageMasterHighlightedIndex = -1;
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.languageMasterDropdownOpen = true;
      this.languageMasterHighlightedIndex = this.nextMasterOptionIndex(
        this.languageOptions(),
        this.languageMasterHighlightedIndex,
        event.key === 'ArrowDown' ? 1 : -1,
        (option) => this.languageMasterOptionDisabled(option),
      );
      return;
    }
    if (event.key === 'Enter' && this.languageMasterDropdownOpen && this.languageMasterHighlightedIndex >= 0) {
      event.preventDefault();
      const option = this.languageOptions()[this.languageMasterHighlightedIndex];
      if (option) this.selectLanguageMasterOption(option);
    }
  }

  languageMasterOptionId(): string | null {
    const option = this.languageOptions()[this.languageMasterHighlightedIndex];
    return option && !this.languageMasterOptionDisabled(option) ? `language-master-option-${option.id}` : null;
  }

  selectLanguageMasterOption(option: LanguageMasterOption): void {
    if (this.languageMasterOptionDisabled(option)) return;
    const changed = String(this.languageForm.controls.languageId.value) !== String(option.id)
      || this.languageInputValue.trim() !== option.name.trim();
    this.selectedLanguageMasterOption = option;
    this.languageInputValue = option.name;
    this.languageMasterSearchDraft = option.name;
    this.languageForm.controls.languageId.setValue(option.id);
    if (changed) this.languageForm.markAsDirty();
    this.languageMasterDropdownOpen = false;
    this.languageMasterHighlightedIndex = -1;
    this.languageMasterState = 'selected';
    this.languageMasterReady = true;
    this.clearLanguageBackendErrors();
    this.syncDirtyState();
  }

  searchLanguageMaster(): void {
    this.clearSearchTimer('language');
    this.languageMasterSearch = this.languageInputValue.trim();
    this.languageMasterDropdownOpen = true;
    this.loadLanguageMaster(0, this.languageMasterSearch);
  }

  loadMoreLanguageMaster(): void {
    if (this.languageMasterLoading || this.languageMasterPage + 1 >= this.languageMasterTotalPages) return;
    this.loadLanguageMaster(this.languageMasterPage + 1, this.languageMasterSearch, true);
  }

  skillMasterInputChanged(value: string): void {
    this.skillInputValue = value;
    this.skillMasterSearchDraft = value;
    this.skillMasterDropdownOpen = true;
    this.skillMasterHighlightedIndex = -1;
    this.clearSkillBackendErrors();

    const selected = this.selectedSkillMasterOption;
    if (!selected || value.trim() !== selected.name.trim()) {
      this.selectedSkillMasterOption = null;
      this.skillForm.controls.skillId.setValue(null);
      this.skillForm.controls.skillId.markAsDirty();
      this.skillForm.markAsDirty();
    }
    this.syncDirtyState();
    this.scheduleSkillMasterSearch(value);
  }

  clearSkillMasterInput(): void {
    this.skillMasterInputChanged('');
  }

  skillMasterFocused(): void {
    this.skillMasterDropdownOpen = true;
  }

  skillMasterBlurred(): void {
    setTimeout(() => {
      if (this.skillEditorMode) this.skillMasterDropdownOpen = false;
    }, 0);
  }

  skillMasterKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.skillMasterDropdownOpen = false;
      this.skillMasterHighlightedIndex = -1;
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.skillMasterDropdownOpen = true;
      this.skillMasterHighlightedIndex = this.nextMasterOptionIndex(
        this.skillOptions(),
        this.skillMasterHighlightedIndex,
        event.key === 'ArrowDown' ? 1 : -1,
        (option) => this.skillMasterOptionDisabled(option),
      );
      return;
    }
    if (event.key === 'Enter' && this.skillMasterDropdownOpen && this.skillMasterHighlightedIndex >= 0) {
      event.preventDefault();
      const option = this.skillOptions()[this.skillMasterHighlightedIndex];
      if (option) this.selectSkillMasterOption(option);
    }
  }

  skillMasterOptionId(): string | null {
    const option = this.skillOptions()[this.skillMasterHighlightedIndex];
    return option && !this.skillMasterOptionDisabled(option) ? `skill-master-option-${option.id}` : null;
  }

  selectSkillMasterOption(option: SkillMasterOption): void {
    if (this.skillMasterOptionDisabled(option)) return;
    const changed = String(this.skillForm.controls.skillId.value) !== String(option.id)
      || this.skillInputValue.trim() !== option.name.trim();
    this.selectedSkillMasterOption = option;
    this.skillInputValue = option.name;
    this.skillMasterSearchDraft = option.name;
    this.skillForm.controls.skillId.setValue(option.id);
    if (changed) this.skillForm.markAsDirty();
    this.skillMasterDropdownOpen = false;
    this.skillMasterHighlightedIndex = -1;
    this.skillMasterState = 'selected';
    this.skillMasterReady = true;
    this.clearSkillBackendErrors();
    this.syncDirtyState();
  }

  searchSkillMaster(): void {
    this.clearSearchTimer('skill');
    this.skillMasterSearch = this.skillInputValue.trim();
    this.skillMasterDropdownOpen = true;
    this.loadSkillMaster(0, this.skillMasterSearch);
  }

  loadMoreSkillMaster(): void {
    if (this.skillMasterLoading || this.skillMasterPage + 1 >= this.skillMasterTotalPages) return;
    this.loadSkillMaster(this.skillMasterPage + 1, this.skillMasterSearch, true);
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
        this.languageMessage = 'Language deleted successfully.';
        this.notifications.showSuccess(this.languageMessage);
        this.closeLanguageDeleteConfirmation();
      },
      error: (error: unknown) => {
        if (!this.isCurrentLanguageOperation(profileId, operationGeneration, false)) return;
        this.isLanguageDeleting = false;
        this.languageDeleteErrorMessage = this.apiError(error)?.message?.trim() || 'Unable to delete this Language right now. The record is still here and you can retry.';
      },
    });
  }

  openSkillDeleteConfirmation(skill: ProfileSkill): void {
    if (this.isSkillDeleting || this.skillEditorMode) return;
    const profileId = this.context.selectedId();
    const profile = this.context.detail();
    if (!profileId || !profile || String(profile.id) !== profileId) return;

    this.skillDeleteTarget = skill;
    this.skillDeleteErrorMessage = '';
    this.skillDeleteConfirmation = true;
  }

  cancelSkillDelete(): void {
    if (this.isSkillDeleting) return;
    this.closeSkillDeleteConfirmation();
  }

  confirmSkillDelete(): void {
    const target = this.skillDeleteTarget;
    const profileId = this.context.selectedId();
    const profile = this.context.detail();
    if (!this.skillDeleteConfirmation || !target || this.isSkillDeleting || !profileId || !profile) return;
    if (String(profile.id) !== profileId || !this.skills.some((skill) => String(skill.profileSkillId) === String(target.profileSkillId))) {
      this.closeSkillDeleteConfirmation();
      return;
    }

    const operationGeneration = ++this.skillMutationGeneration;
    this.isSkillDeleting = true;
    this.skillDeleteErrorMessage = '';
    this.profileService.deleteProfileSkill(profileId, target.profileSkillId, profile.version).subscribe({
      next: (result) => {
        if (!this.isCurrentSkillOperation(profileId, operationGeneration, false)) return;
        if (!this.context.applyMutationVersion(profileId, result.profileVersion)) return;

        this.skills = this.sortProfileSkills(this.skills.filter((skill) => String(skill.profileSkillId) !== String(target.profileSkillId)));
        this.isSkillDeleting = false;
        this.previewInvalidated = true;
        this.skillMessage = 'Skill deleted successfully.';
        this.notifications.showSuccess(this.skillMessage);
        this.closeSkillDeleteConfirmation();
      },
      error: (error: unknown) => {
        if (!this.isCurrentSkillOperation(profileId, operationGeneration, false)) return;
        this.isSkillDeleting = false;
        this.skillDeleteErrorMessage = this.apiError(error)?.message?.trim() || 'Unable to delete this Skill right now. The record is still here and you can retry.';
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
        this.certificateMessage = 'Certificate deleted successfully.';
        this.notifications.showSuccess(this.certificateMessage);
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
        this.educationMessage = 'Education deleted successfully.';
        this.notifications.showSuccess(this.educationMessage);
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

  startSkillCreate(): void {
    this.openSkillEditor();
  }

  startSkillEdit(skill: ProfileSkill): void {
    this.openSkillEditor(skill);
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
    if (this.skillEditorMode) {
      if (this.isSkillSubmitting) return;
      if (this.skillForm.dirty) {
        this.cancelConfirmation = true;
        return;
      }
      this.closeSkillEditor();
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
    if (this.skillEditorMode) {
      this.closeSkillEditor();
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
        this.saveMessage = 'About Me updated successfully.';
        this.notifications.showSuccess(this.saveMessage);
        this.closeEditor();
      },
      error: (error: unknown) => this.handleSaveError(error),
    });
  }

  submitEducation(intent: MutationPostSaveIntent = 'close'): void {
    const mode = this.educationEditorMode;
    if (!mode || this.isEducationSubmitting || this.educationConflict) return;
    const addAnother = intent === 'add-another' && mode === 'create';

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
        if (!this.context.applyMutationVersion(profileId, result.profileVersion)) {
          this.isEducationSubmitting = false;
          return;
        }

        this.educations = mode === 'edit' && educationId !== null
          ? this.educations.map((education) => String(education.id) === String(educationId) ? result.education : education)
          : this.sortEducations([...this.educations, result.education]);
        this.isEducationSubmitting = false;
        this.educationConflict = false;
        this.previewInvalidated = true;
        this.educationMessage = mode === 'edit' ? 'Education updated successfully.' : 'Education added successfully.';
        this.notifications.showSuccess(this.educationMessage);
        if (addAnother) this.resetEducationForAnother();
        else this.closeEducationEditor();
      },
      error: (error: unknown) => {
        if (!this.isCurrentEducationOperation(profileId, operationGeneration)) return;
        this.handleEducationSaveError(error);
      },
    });
  }

  submitLanguage(intent: MutationPostSaveIntent = 'close'): void {
    const mode = this.languageEditorMode;
    if (!mode || this.isLanguageSubmitting || this.languageConflict) return;
    const addAnother = intent === 'add-another' && mode === 'create';

    this.languageErrorMessage = '';
    this.languageMessage = '';
    this.clearLanguageBackendErrors();
    if (mode === 'edit' && !this.hasLanguageChanges()) return;
    if (this.languageForm.invalid) {
      this.languageForm.markAllAsTouched();
      this.syncDirtyState();
      return;
    }

    const profile = this.context.detail();
    const profileId = this.context.selectedId();
    if (!profile || !profileId || String(profile.id) !== profileId) return;

    const value = this.languageForm.getRawValue();
    if (value.level === null) {
      this.languageForm.controls.level.markAsTouched();
      this.syncDirtyState();
      return;
    }
    if (!this.isCommittedLanguageSelection()) {
      this.setLanguageFieldError('languageId', 'Select a Language from Language Master.', 'backend');
      this.languageErrorMessage = 'Select a Language from Language Master.';
      this.syncDirtyState();
      return;
    }
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
        if (!this.context.applyMutationVersion(profileId, result.profileVersion)) {
          this.isLanguageSubmitting = false;
          return;
        }

        this.languages = mode === 'edit' && languageId !== null
          ? this.sortProfileLanguages(this.languages.map((language) => String(language.profileLanguageId) === String(languageId) ? result.profileLanguage : language))
          : this.sortProfileLanguages([...this.languages, result.profileLanguage]);
        this.isLanguageSubmitting = false;
        this.languageConflict = false;
        this.previewInvalidated = true;
        this.languageMessage = mode === 'edit' ? 'Language updated successfully.' : 'Language added successfully.';
        this.notifications.showSuccess(this.languageMessage);
        if (addAnother) this.resetLanguageForAnother();
        else this.closeLanguageEditor();
      },
      error: (error: unknown) => {
        if (!this.isCurrentLanguageOperation(profileId, operationGeneration)) return;
        this.handleLanguageSaveError(error);
      },
    });
  }

  submitSkill(intent: MutationPostSaveIntent = 'close'): void {
    const mode = this.skillEditorMode;
    if (!mode || this.isSkillSubmitting || this.skillConflict) return;
    const addAnother = intent === 'add-another' && mode === 'create';

    this.skillErrorMessage = '';
    this.skillMessage = '';
    this.clearSkillBackendErrors();
    this.trimSkillFormValues();
    if (mode === 'edit' && !this.hasSkillChanges()) return;
    if (this.skillForm.invalid) {
      this.skillForm.markAllAsTouched();
      this.syncDirtyState();
      return;
    }

    const profile = this.context.detail();
    const profileId = this.context.selectedId();
    if (!profile || !profileId || String(profile.id) !== profileId) return;

    const value = this.skillForm.getRawValue();
    if (!this.isCommittedSkillSelection()) {
      this.setSkillFieldError('skillId', 'Select a Skill from Skill Master.', 'backend');
      this.skillErrorMessage = 'Select a Skill from Skill Master.';
      this.syncDirtyState();
      return;
    }

    const duplicate = this.skills.some((skill) => String(skill.skillId) === String(value.skillId)
      && (mode !== 'edit' || String(skill.profileSkillId) !== String(this.editingProfileSkillId)));
    if (duplicate) {
      this.setSkillFieldError('skillId', 'This Skill is already assigned to this Profile.', 'duplicate');
      this.skillErrorMessage = 'This Skill is already assigned to this Profile.';
      this.syncDirtyState();
      return;
    }

    const request: ProfileSkillRequest = {
      skillId: value.skillId as number | string,
      experienceYears: Number(value.experienceYears),
      lastUsed: value.lastUsed || null,
      version: profile.version,
    };
    const profileSkillId = this.editingProfileSkillId;
    const operationGeneration = this.skillMutationGeneration;
    this.isSkillSubmitting = true;
    const request$ = mode === 'edit' && profileSkillId !== null
      ? this.profileService.updateProfileSkill(profileId, profileSkillId, request)
      : this.profileService.createProfileSkill(profileId, request);

    request$.subscribe({
      next: (result) => {
        if (!this.isCurrentSkillOperation(profileId, operationGeneration)) return;
        if (!this.context.applyMutationVersion(profileId, result.profileVersion)) {
          this.isSkillSubmitting = false;
          return;
        }

        this.skills = this.sortProfileSkills(mode === 'edit' && profileSkillId !== null
          ? this.skills.map((skill) => String(skill.profileSkillId) === String(profileSkillId) ? result.profileSkill : skill)
          : [...this.skills, result.profileSkill]);
        this.isSkillSubmitting = false;
        this.skillConflict = false;
        this.previewInvalidated = true;
        this.skillMessage = mode === 'edit' ? 'Skill updated successfully.' : 'Skill added successfully.';
        this.notifications.showSuccess(this.skillMessage);
        if (addAnother) this.resetSkillForAnother();
        else this.closeSkillEditor();
      },
      error: (error: unknown) => {
        if (!this.isCurrentSkillOperation(profileId, operationGeneration)) return;
        this.handleSkillSaveError(error);
      },
    });
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
    const operationGeneration = this.certificateMutationGeneration;
    this.isCertificateSubmitting = true;
    const request$ = mode === 'edit' && certificateId !== null
      ? this.profileService.updateCertificate(profileId, certificateId, request)
      : this.profileService.createCertificate(profileId, request);

    request$.subscribe({
      next: (result) => {
        if (!this.isCurrentCertificateOperation(profileId, operationGeneration)) return;
        if (!this.context.applyMutationVersion(profileId, result.profileVersion)) {
          this.isCertificateSubmitting = false;
          return;
        }

        this.certificates = this.sortCertificates(mode === 'edit' && certificateId !== null
          ? this.certificates.map((certificate) => String(certificate.id) === String(certificateId) ? result.certificate : certificate)
          : [...this.certificates, result.certificate]);
        this.isCertificateSubmitting = false;
        this.certificateConflict = false;
        this.previewInvalidated = true;
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
    if (this.skillEditorMode) {
      if (this.isReloading || !this.skillConflict) return;
      if (this.skillForm.dirty) {
        this.reloadConfirmation = true;
        return;
      }
      this.fetchLatestSkill();
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
    } else if (this.skillEditorMode) {
      this.fetchLatestSkill();
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

  skillFieldError(field: EditableSkillField): string {
    const errors = this.skillForm.controls[field].errors;
    if (errors?.['backend']) return errors['backend'];
    if (errors?.['duplicate']) return errors['duplicate'];
    if (errors?.['required']) return 'This field is required.';
    if (errors?.['min']) return 'Enter a non-negative number.';
    if (errors?.['futureDate']) return 'Last Used cannot be in the future.';
    return errors ? 'This value is not valid.' : '';
  }

  skillFieldInvalid(field: EditableSkillField): boolean {
    const control = this.skillForm.controls[field];
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
    const options = [...this.languageMasterOptions];
    if (selectedId !== null && selectedId !== undefined && !options.some((option) => String(option.id) === String(selectedId))) {
      const current = this.languages.find((language) => String(language.languageId) === String(selectedId));
      const selected = this.selectedLanguageMasterOption ?? (current ? this.languageMasterOption(current) : undefined);
      if (selected) options.unshift(selected);
    }
    return options;
  }

  languageMasterOptionDisabled(option: LanguageMasterOption): boolean {
    return this.languages.some((language) => String(language.languageId) === String(option.id)
      && String(language.profileLanguageId) !== String(this.editingProfileLanguageId));
  }

  isLanguageMasterOptionSelected(option: LanguageMasterOption): boolean {
    return !!this.selectedLanguageMasterOption && String(this.selectedLanguageMasterOption.id) === String(option.id);
  }

  skillOptions(): SkillMasterOption[] {
    const selectedId = this.skillForm.controls.skillId.value;
    const options = [...this.skillMasterOptions];
    if (selectedId !== null && selectedId !== undefined && !options.some((option) => String(option.id) === String(selectedId))) {
      const current = this.skills.find((skill) => String(skill.skillId) === String(selectedId));
      const selected = this.selectedSkillMasterOption ?? (current ? this.skillMasterOption(current) : undefined);
      if (selected) options.unshift(selected);
    }
    return options;
  }

  skillMasterOptionDisabled(option: SkillMasterOption): boolean {
    return this.skills.some((skill) => String(skill.skillId) === String(option.id)
      && String(skill.profileSkillId) !== String(this.editingProfileSkillId));
  }

  isSkillMasterOptionSelected(option: SkillMasterOption): boolean {
    return !!this.selectedSkillMasterOption && String(this.selectedSkillMasterOption.id) === String(option.id);
  }

  skillOptionCategory(option: SkillMasterOption): string {
    return option.categoryName?.trim() || option.categoryCode?.trim() || 'Category unavailable';
  }

  selectedSkillCategory(): string {
    const selectedId = this.skillForm.controls.skillId.value;
    if (selectedId === null || selectedId === undefined) return '—';
    const selected = this.selectedSkillMasterOption?.id !== undefined
      && String(this.selectedSkillMasterOption.id) === String(selectedId)
      ? this.selectedSkillMasterOption
      : null;
    if (!selected) return '—';
    return selected.categoryName?.trim() || selected.categoryCode?.trim() || '—';
  }

  skillCategoryLabel(skill: ProfileSkill): string {
    return skill.categoryName?.trim() || skill.categoryCode?.trim() || '—';
  }

  skillLastUsedLabel(skill: ProfileSkill): string {
    return this.formatSkillLastUsed(skill.lastUsed);
  }

  skillRecordLabel(skill: ProfileSkill): string {
    return `${skill.skillName} (${skill.experienceYears} years)`;
  }

  private skillMasterOption(skill: ProfileSkill): SkillMasterOption {
    return {
      id: skill.skillId,
      name: skill.skillName,
      categoryId: skill.categoryId,
      categoryCode: skill.categoryCode,
      categoryName: skill.categoryName,
    };
  }

  private languageMasterOption(language: ProfileLanguage): LanguageMasterOption {
    return { id: language.languageId, name: language.languageName };
  }

  private isCommittedLanguageSelection(): boolean {
    const selected = this.selectedLanguageMasterOption;
    const id = this.languageForm.controls.languageId.value;
    return !!selected
      && id !== null
      && String(selected.id) === String(id)
      && this.languageInputValue.trim() === selected.name.trim();
  }

  private isCommittedSkillSelection(): boolean {
    const selected = this.selectedSkillMasterOption;
    const id = this.skillForm.controls.skillId.value;
    return !!selected
      && id !== null
      && String(selected.id) === String(id)
      && this.skillInputValue.trim() === selected.name.trim();
  }

  private nextMasterOptionIndex<T extends LanguageMasterOption | SkillMasterOption>(
    options: T[],
    currentIndex: number,
    direction: 1 | -1,
    disabled: (option: T) => boolean,
  ): number {
    if (!options.length) return -1;
    const startIndex = currentIndex < 0 ? (direction === 1 ? -1 : options.length) : currentIndex;
    for (let step = 1; step <= options.length; step++) {
      const index = (startIndex + direction * step + options.length) % options.length;
      if (!disabled(options[index])) return index;
    }
    return -1;
  }

  private formatSkillLastUsed(lastUsed: string | null | undefined): string {
    if (!lastUsed) return '—';
    const date = new Date(`${lastUsed.slice(0, 10)}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
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

  projectDateRange(project: Project): string {
    const start = project.startDate ? this.formatProjectDate(project.startDate) : 'Date not set';
    const end = project.status === 'ONGOING' || !project.endDate ? 'Present' : this.formatProjectDate(project.endDate);
    return `${start} – ${end}`;
  }

  isProjectExpanded(project: Project): boolean {
    return this.expandedProjectIds.has(String(project.id));
  }

  toggleProjectDetails(project: Project): void {
    const projectId = String(project.id);
    if (this.expandedProjectIds.has(projectId)) {
      this.expandedProjectIds.delete(projectId);
    } else if (this.projects.some((item) => String(item.id) === projectId)) {
      this.expandedProjectIds.add(projectId);
    }
  }

  projectRecordLabel(project: Project): string {
    return `${project.name} (${project.position})`;
  }

  private formatProjectDate(value: string): string {
    const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
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

  private loadProjects(profileId: string): void {
    this.projectListCancel.next();
    const generation = ++this.projectListGeneration;
    this.projects = [];
    this.projectLoading = true;
    this.projectError = null;
    this.profileService.listProjects(profileId).pipe(takeUntil(this.projectListCancel)).subscribe({
      next: (projects) => {
        if (!this.isCurrentProjectProfile(profileId, generation)) return;
        this.projects = projects;
        for (const projectId of this.expandedProjectIds) {
          if (!projects.some((project) => String(project.id) === projectId)) this.expandedProjectIds.delete(projectId);
        }
        this.projectLoading = false;
      },
      error: (error: unknown) => {
        if (!this.isCurrentProjectProfile(profileId, generation)) return;
        this.projectError = error;
        this.projectLoading = false;
      },
    });
  }

  private loadProfileSkills(profileId: string): void {
    this.skillListCancel.next();
    const generation = ++this.skillListGeneration;
    this.skills = [];
    this.skillLoading = true;
    this.skillError = null;
    this.profileService.listProfileSkills(profileId).pipe(takeUntil(this.skillListCancel)).subscribe({
      next: (skills) => {
        if (!this.isCurrentSkillProfile(profileId, generation)) return;
        this.skills = this.sortProfileSkills(skills);
        this.skillLoading = false;
      },
      error: (error: unknown) => {
        if (!this.isCurrentSkillProfile(profileId, generation)) return;
        this.skillError = error;
        this.skillLoading = false;
      },
    });
  }

  private scheduleLanguageMasterSearch(value: string): void {
    this.clearSearchTimer('language');
    this.languageMasterCancel.next();
    this.languageMasterGeneration++;
    this.languageMasterError = null;
    this.languageMasterReady = false;
    this.languageMasterOptions = [];
    this.languageMasterPage = 0;
    this.languageMasterTotalElements = 0;
    this.languageMasterTotalPages = 0;
    this.languageMasterSearch = value.trim();
    if (!value.trim()) {
      this.languageMasterLoading = true;
      this.languageMasterState = 'loading';
      this.loadLanguageMaster(0, '');
      return;
    }

    this.languageMasterLoading = true;
    this.languageMasterState = 'loading';
    this.languageSearchTimer = setTimeout(() => {
      this.languageSearchTimer = null;
      this.loadLanguageMaster(0, value.trim());
    }, 300);
  }

  private scheduleSkillMasterSearch(value: string): void {
    this.clearSearchTimer('skill');
    this.skillMasterCancel.next();
    this.skillMasterGeneration++;
    this.skillMasterError = null;
    this.skillMasterReady = false;
    this.skillMasterOptions = [];
    this.skillMasterPage = 0;
    this.skillMasterTotalElements = 0;
    this.skillMasterTotalPages = 0;
    this.skillMasterSearch = value.trim();
    if (!value.trim()) {
      this.skillMasterLoading = true;
      this.skillMasterState = 'loading';
      this.loadSkillMaster(0, '');
      return;
    }

    this.skillMasterLoading = true;
    this.skillMasterState = 'loading';
    this.skillSearchTimer = setTimeout(() => {
      this.skillSearchTimer = null;
      this.loadSkillMaster(0, value.trim());
    }, 300);
  }

  private loadLanguageMaster(page: number, search: string, append = false): void {
    this.languageMasterCancel.next();
    const generation = ++this.languageMasterGeneration;
    this.languageMasterLoading = true;
    this.languageMasterError = null;
    this.languageMasterReady = false;
    this.languageMasterState = 'loading';
    this.profileService.listLanguageMaster(page, this.languageMasterSize, search).pipe(takeUntil(this.languageMasterCancel)).subscribe({
      next: (result) => {
        if (this.languageMasterGeneration !== generation) return;
        this.languageMasterOptions = append
          ? this.mergeMasterOptions(this.languageMasterOptions, result.content)
          : this.mergeMasterOptions([], result.content);
        this.languageMasterPage = result.page;
        this.languageMasterTotalElements = result.totalElements;
        this.languageMasterTotalPages = result.totalPages;
        this.languageMasterSearch = search.trim();
        this.languageMasterLoading = false;
        this.languageMasterReady = true;
        this.languageMasterState = this.languageMasterOptions.length ? 'results' : 'empty';
      },
      error: (error: unknown) => {
        if (this.languageMasterGeneration !== generation) return;
        this.languageMasterError = error;
        this.languageMasterLoading = false;
        this.languageMasterState = 'error';
      },
    });
  }

  private loadSkillMaster(page: number, search: string, append = false): void {
    this.skillMasterCancel.next();
    const generation = ++this.skillMasterGeneration;
    this.skillMasterLoading = true;
    this.skillMasterError = null;
    this.skillMasterReady = false;
    this.skillMasterState = 'loading';
    this.profileService.listSkillMaster(page, this.skillMasterSize, search).pipe(takeUntil(this.skillMasterCancel)).subscribe({
      next: (result) => {
        if (this.skillMasterGeneration !== generation) return;
        this.skillMasterOptions = append
          ? this.mergeMasterOptions(this.skillMasterOptions, result.content)
          : this.mergeMasterOptions([], result.content);
        this.skillMasterPage = result.page;
        this.skillMasterTotalElements = result.totalElements;
        this.skillMasterTotalPages = result.totalPages;
        this.skillMasterSearch = search.trim();
        this.skillMasterLoading = false;
        this.skillMasterReady = true;
        this.skillMasterState = this.skillMasterOptions.length ? 'results' : 'empty';
      },
      error: (error: unknown) => {
        if (this.skillMasterGeneration !== generation) return;
        this.skillMasterError = error;
        this.skillMasterLoading = false;
        this.skillMasterState = 'error';
      },
    });
  }

  private clearSearchTimer(kind: 'language' | 'skill'): void {
    const timer = kind === 'language' ? this.languageSearchTimer : this.skillSearchTimer;
    if (timer !== null) clearTimeout(timer);
    if (kind === 'language') this.languageSearchTimer = null;
    else this.skillSearchTimer = null;
  }

  private mergeMasterOptions<T extends LanguageMasterOption | SkillMasterOption>(current: T[], incoming: T[]): T[] {
    const options = new Map<string, T>();
    for (const option of [...current, ...incoming]) options.set(String(option.id), option);
    return [...options.values()];
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

  private fetchLatestSkill(): void {
    const profileId = this.context.selectedId();
    if (!profileId) return;

    this.closeSkillEditor();
    this.isReloading = true;
    this.skillErrorMessage = '';
    this.skillMessage = '';
    this.context.reloadDetail(profileId).subscribe({
      next: () => {
        if (this.context.selectedId() !== profileId || this.activeProfileId !== profileId) return;
        this.isReloading = false;
        this.skillConflict = false;
        this.skillMessage = 'Latest Profile and Skill data loaded. Review it before editing.';
        this.loadProfileSkills(profileId);
      },
      error: (error: unknown) => {
        if (this.context.selectedId() !== profileId || this.activeProfileId !== profileId) return;
        this.isReloading = false;
        this.skillErrorMessage = this.apiError(error)?.message?.trim() || 'Unable to reload the latest Profile right now. Please try again.';
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
    this.closeSkillEditor();
    const profile = this.context.detail();
    if (profile) {
      this.editForm.reset(this.formValues(profile));
      this.editForm.markAsPristine();
      this.editForm.markAsUntouched();
    }
  }

  private resetEducationForAnother(): void {
    this.educationMutationGeneration++;
    const values = this.emptyEducationValues();
    this.editingEducationId = null;
    this.originalEducationValues = this.normalizeEducationValues(values);
    this.educationConflict = false;
    this.educationErrorMessage = '';
    this.cancelConfirmation = false;
    this.reloadConfirmation = false;
    this.educationForm.reset(values);
    this.educationForm.markAsPristine();
    this.educationForm.markAsUntouched();
    this.updateEducationDateValidation();
    this.syncDirtyState();
    this.focusEditorField('education-school-name');
  }

  private resetLanguageForAnother(): void {
    this.languageMutationGeneration++;
    const values = this.emptyLanguageValues();
    this.editingProfileLanguageId = null;
    this.originalLanguageValues = this.normalizeLanguageValues(values);
    this.originalLanguageInputValue = '';
    this.languageConflict = false;
    this.languageErrorMessage = '';
    this.cancelConfirmation = false;
    this.reloadConfirmation = false;
    this.languageForm.reset(values);
    this.languageForm.markAsPristine();
    this.languageForm.markAsUntouched();
    this.clearLanguageBackendErrors();
    this.resetLanguageMasterSelector();
    this.loadLanguageMaster(0, '');
    this.syncDirtyState();
    this.focusEditorField('profile-language');
  }

  private resetCertificateForAnother(): void {
    this.certificateMutationGeneration++;
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

  private resetSkillForAnother(): void {
    this.skillMutationGeneration++;
    const values = this.emptySkillValues();
    this.editingProfileSkillId = null;
    this.originalSkillValues = this.normalizeSkillValues(values);
    this.originalSkillInputValue = '';
    this.skillConflict = false;
    this.skillErrorMessage = '';
    this.cancelConfirmation = false;
    this.reloadConfirmation = false;
    this.skillForm.reset(values);
    this.skillForm.markAsPristine();
    this.skillForm.markAsUntouched();
    this.clearSkillBackendErrors();
    this.resetSkillMasterSelector();
    this.loadSkillMaster(0, '');
    this.syncDirtyState();
    this.focusEditorField('profile-skill');
  }

  private focusEditorField(id: string): void {
    const fields = document.querySelectorAll<HTMLElement>(`#${id}`);
    const field = fields.item(fields.length - 1);
    field?.focus();
    if (field && document.activeElement !== field) {
      setTimeout(() => {
        if (document.activeElement === document.body) field.focus();
      });
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
    this.resetLanguageMasterSelector();
    this.originalLanguageInputValue = '';
    this.syncDirtyState();
  }

  private closeSkillEditor(): void {
    this.skillMutationGeneration++;
    this.skillEditorMode = null;
    this.editingProfileSkillId = null;
    this.originalSkillValues = null;
    this.isSkillSubmitting = false;
    this.skillConflict = false;
    this.cancelConfirmation = false;
    this.reloadConfirmation = false;
    this.skillForm.reset(this.emptySkillValues());
    this.skillForm.markAsPristine();
    this.skillForm.markAsUntouched();
    this.clearSkillBackendErrors();
    this.resetSkillMasterSelector();
    this.originalSkillInputValue = '';
    this.syncDirtyState();
  }

  private resetLanguageMasterSelector(): void {
    this.clearSearchTimer('language');
    this.languageMasterCancel.next();
    this.languageMasterGeneration++;
    this.languageMasterOptions = [];
    this.languageMasterPage = 0;
    this.languageMasterTotalElements = 0;
    this.languageMasterTotalPages = 0;
    this.languageMasterSearch = '';
    this.languageMasterSearchDraft = '';
    this.languageMasterLoading = false;
    this.languageMasterError = null;
    this.languageMasterReady = false;
    this.languageMasterState = 'idle';
    this.languageMasterDropdownOpen = false;
    this.languageMasterHighlightedIndex = -1;
    this.languageInputValue = '';
    this.selectedLanguageMasterOption = null;
  }

  private resetSkillMasterSelector(): void {
    this.clearSearchTimer('skill');
    this.skillMasterCancel.next();
    this.skillMasterGeneration++;
    this.skillMasterOptions = [];
    this.skillMasterPage = 0;
    this.skillMasterTotalElements = 0;
    this.skillMasterTotalPages = 0;
    this.skillMasterSearch = '';
    this.skillMasterSearchDraft = '';
    this.skillMasterLoading = false;
    this.skillMasterError = null;
    this.skillMasterReady = false;
    this.skillMasterState = 'idle';
    this.skillMasterDropdownOpen = false;
    this.skillMasterHighlightedIndex = -1;
    this.skillInputValue = '';
    this.selectedSkillMasterOption = null;
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

  private closeProjectDeleteConfirmation(): void {
    this.projectDeleteConfirmation = false;
    this.projectDeleteTarget = null;
    this.projectDeleteErrorMessage = '';
    this.isProjectDeleting = false;
  }

  private closeSkillDeleteConfirmation(): void {
    this.skillDeleteConfirmation = false;
    this.skillDeleteTarget = null;
    this.skillDeleteErrorMessage = '';
    this.isSkillDeleting = false;
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
    this.resetLanguageMasterSelector();
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

  private resetProjectState(): void {
    this.projectListCancel.next();
    this.projectListGeneration++;
    this.projectMutationGeneration++;
    this.projects = [];
    this.expandedProjectIds.clear();
    this.projectLoading = false;
    this.projectError = null;
    this.projectMessage = '';
    this.previewInvalidated = false;
    this.closeProjectDeleteConfirmation();
  }

  private resetSkillState(): void {
    this.skillListCancel.next();
    this.skillListGeneration++;
    this.skillMutationGeneration++;
    this.skills = [];
    this.skillLoading = false;
    this.skillError = null;
    this.skillMessage = '';
    this.skillErrorMessage = '';
    this.closeSkillDeleteConfirmation();
    this.resetSkillMasterSelector();
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
    this.selectedLanguageMasterOption = language ? this.languageMasterOption(language) : null;
    this.languageInputValue = language?.languageName ?? '';
    this.languageMasterSearchDraft = this.languageInputValue;
    this.originalLanguageInputValue = this.languageInputValue.trim();
    this.languageMasterDropdownOpen = false;
    this.languageMasterHighlightedIndex = -1;
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
    this.loadLanguageMaster(0, '');
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

  private openSkillEditor(skill?: ProfileSkill): void {
    const profile = this.context.detail();
    if (!profile || this.isEditing || this.educationEditorMode || this.languageEditorMode || this.certificateEditorMode || this.skillEditorMode) return;

    const values = skill ? this.skillFormValues(skill) : this.emptySkillValues();
    this.skillEditorMode = skill ? 'edit' : 'create';
    this.editingProfileSkillId = skill ? skill.profileSkillId : null;
    this.selectedSkillMasterOption = skill ? this.skillMasterOption(skill) : null;
    this.skillInputValue = skill?.skillName ?? '';
    this.skillMasterSearchDraft = this.skillInputValue;
    this.originalSkillInputValue = this.skillInputValue.trim();
    this.skillMasterDropdownOpen = false;
    this.skillMasterHighlightedIndex = -1;
    this.originalSkillValues = this.normalizeSkillValues(values);
    this.skillForm.reset(values);
    this.skillForm.markAsPristine();
    this.skillForm.markAsUntouched();
    this.skillMutationGeneration++;
    this.skillConflict = false;
    this.cancelConfirmation = false;
    this.reloadConfirmation = false;
    this.skillErrorMessage = '';
    this.skillMessage = '';
    this.loadSkillMaster(0, '');
    this.syncDirtyState();
  }

  private handleSkillSaveError(error: unknown): void {
    this.isSkillSubmitting = false;
    const response = this.apiError(error);
    if (response?.errorCode === 'PROFILE_VERSION_CONFLICT') {
      this.skillConflict = true;
      this.skillErrorMessage = response.message?.trim() || 'This Profile changed elsewhere. Reload the latest version before saving again.';
      this.syncDirtyState();
      return;
    }
    if (response?.errorCode === 'VALIDATION_ERROR') {
      this.applySkillFieldErrors(response.data);
      this.skillErrorMessage = 'Please correct the highlighted fields.';
      this.syncDirtyState();
      return;
    }

    const businessField: Record<string, EditableSkillField> = {
      PROFILE_SKILL_ALREADY_EXISTS: 'skillId',
      PROFILE_SKILL_LAST_USED_IN_FUTURE: 'lastUsed',
      SKILL_NOT_FOUND: 'skillId',
    };
    const field = response?.errorCode ? businessField[response.errorCode] : undefined;
    if (field) this.setSkillFieldError(field, response?.message || 'This value is not valid.');
    this.skillErrorMessage = response?.message?.trim() || 'Unable to save this Skill right now. Your changes are still here.';
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

  private trimSkillFormValues(): void {
    const value = this.skillForm.getRawValue();
    this.skillForm.patchValue({
      lastUsed: value.lastUsed.trim(),
    }, { emitEvent: false });
    this.skillForm.updateValueAndValidity({ emitEvent: false });
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

  private applySkillFieldErrors(data: unknown): void {
    const errors = (data as { errors?: unknown } | undefined)?.errors;
    if (!Array.isArray(errors)) return;
    for (const error of errors) {
      if (!error || typeof error !== 'object') continue;
      const { field, message } = error as { field?: unknown; message?: unknown };
      const normalizedField = typeof field === 'string' ? field.split('.').pop() : undefined;
      if (normalizedField && typeof message === 'string' && normalizedField in this.skillForm.controls) {
        this.setSkillFieldError(normalizedField as EditableSkillField, message);
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

  private clearSkillBackendErrors(): void {
    for (const control of Object.values(this.skillForm.controls)) {
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

  private setSkillFieldError(field: EditableSkillField, message: string, key = 'backend'): void {
    const control = this.skillForm.controls[field];
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
    return { languageId: null, level: null };
  }

  private emptyCertificateValues(): EditableCertificateValues {
    return { certificateName: '', issueDate: '' };
  }

  private emptySkillValues(): EditableSkillValues {
    return { skillId: null, experienceYears: null, lastUsed: '' };
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

  private skillFormValues(skill: ProfileSkill): EditableSkillValues {
    return {
      skillId: skill.skillId,
      experienceYears: skill.experienceYears,
      lastUsed: skill.lastUsed?.slice(0, 10) ?? '',
    };
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

  private skillLastUsedValidator(): ValidatorFn {
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
    const ongoing = this.educationForm.controls.status.value === 'ONGOING';
    if (ongoing) {
      endDate.setValue('', { emitEvent: false });
      endDate.disable({ emitEvent: false });
    } else {
      endDate.enable({ emitEvent: false });
    }
    endDate.setValidators(ongoing ? [] : [Validators.required]);
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

  private normalizeSkillValues(value: EditableSkillValues): EditableSkillValues {
    const rawExperience = value.experienceYears as number | string | null;
    const experienceYears = rawExperience === null || rawExperience === '' ? null : Number(rawExperience);
    return {
      skillId: value.skillId,
      experienceYears: Number.isNaN(experienceYears) ? null : experienceYears,
      lastUsed: value.lastUsed.trim(),
    };
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
    return current.languageId !== original.languageId
      || current.level !== original.level
      || this.languageInputValue.trim() !== this.originalLanguageInputValue;
  }

  hasCertificateChanges(): boolean {
    const original = this.originalCertificateValues;
    if (!original) return false;
    const current = this.normalizeCertificateValues(this.certificateForm.getRawValue());
    return current.certificateName !== original.certificateName || current.issueDate !== original.issueDate;
  }

  hasSkillChanges(): boolean {
    const original = this.originalSkillValues;
    if (!original) return false;
    const current = this.normalizeSkillValues(this.skillForm.getRawValue());
    return current.skillId !== original.skillId
      || current.experienceYears !== original.experienceYears
      || current.lastUsed !== original.lastUsed
      || this.skillInputValue.trim() !== this.originalSkillInputValue;
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

  private isCurrentProjectProfile(profileId: string, generation: number): boolean {
    return this.activeProfileId === profileId
      && this.projectListGeneration === generation;
  }

  private isCurrentSkillProfile(profileId: string, generation: number): boolean {
    return this.activeProfileId === profileId
      && this.skillListGeneration === generation;
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

  private isCurrentProjectOperation(profileId: string, generation: number, _requiresEditor = true): boolean {
    return this.activeProfileId === profileId
      && this.context.selectedId() === profileId
      && String(this.context.detail()?.id) === profileId
      && this.projectMutationGeneration === generation;
  }

  private isCurrentSkillOperation(profileId: string, generation: number, requiresEditor = true): boolean {
    return this.activeProfileId === profileId
      && this.context.selectedId() === profileId
      && String(this.context.detail()?.id) === profileId
      && this.skillMutationGeneration === generation
      && (!requiresEditor || this.skillEditorMode !== null);
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

  private sortProfileSkills(skills: ProfileSkill[]): ProfileSkill[] {
    return skills.sort((left, right) => {
      const experienceDifference = right.experienceYears - left.experienceYears;
      if (experienceDifference) return experienceDifference;
      const nameDifference = left.skillName.toLocaleLowerCase().localeCompare(right.skillName.toLocaleLowerCase());
      if (nameDifference) return nameDifference;
      const leftId = Number(left.profileSkillId);
      const rightId = Number(right.profileSkillId);
      if (Number.isFinite(leftId) && Number.isFinite(rightId)) return leftId - rightId;
      return String(left.profileSkillId).localeCompare(String(right.profileSkillId));
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
      || (this.certificateEditorMode !== null && (this.certificateForm.dirty || this.hasCertificateChanges()))
      || (this.skillEditorMode !== null && (this.skillForm.dirty || this.hasSkillChanges())));
  }
}
