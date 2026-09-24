import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Subject, Subscription, takeUntil } from 'rxjs';

import { ApiErrorResponse } from '../../../../../../core/http/api.models';
import { NotificationService } from '../../../../../../core/notifications/notification.service';
import { LanguageLevel, LanguageMasterOption, ProfileDetail, ProfileLanguage, ProfileLanguageRequest } from '../../../../models/profile.models';
import { ProfileContextService } from '../../../../services/profile-context.service';
import { ProfileEditSessionService } from '../../../../services/profile-edit-session.service';
import { ProfileService } from '../../../../services/profile.service';

type LanguageEditorMode = 'create' | 'edit' | null;
type EditableLanguageField = keyof EditableLanguageValues;
type EditableLanguageValues = {
  languageId: number | string | null;
  level: LanguageLevel | null;
};
type MasterComboboxState = 'idle' | 'loading' | 'results' | 'empty' | 'error' | 'selected';
type MutationPostSaveIntent = 'close' | 'add-another';

@Component({
  selector: 'app-language-section',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './language-section.component.html',
  styleUrl: './language-section.component.scss',
})
export class LanguageSectionComponent implements OnChanges, OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly notifications = inject(NotificationService);
  readonly context = inject(ProfileContextService);
  readonly editSession = inject(ProfileEditSessionService);

  @Input({ required: true }) profile!: ProfileDetail;
  @Input() mutationBlocked = false;
  @Output() readonly interactionActiveChange = new EventEmitter<boolean>();

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
  isReloading = false;
  cancelConfirmation = false;
  reloadConfirmation = false;

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

  private activeProfileId: string | null = null;
  private activeMemberId: string | null = null;
  private editingProfileLanguageId: number | string | null = null;
  private originalLanguageValues: EditableLanguageValues | null = null;
  private originalLanguageInputValue = '';
  private readonly languageListCancel = new Subject<void>();
  private readonly languageMasterCancel = new Subject<void>();
  private languageListGeneration = 0;
  private languageMutationGeneration = 0;
  private languageMasterGeneration = 0;
  private deleteRecoveryGeneration = 0;
  private languageSearchTimer: ReturnType<typeof setTimeout> | null = null;
  private deleteConflict = false;
  private interactionActive = false;
  private readonly navigationDiscardSubscription: Subscription;

  constructor() {
    this.languageForm.valueChanges.subscribe(() => this.syncDirtyState());
    this.navigationDiscardSubscription = this.editSession.navigationDiscarded$().subscribe(() => this.discardEditing());
  }

  ngOnChanges(changes: SimpleChanges): void {
    const profileChange = changes['profile'];
    if (!profileChange || !this.profile) return;
    const nextProfileId = String(this.profile.id);
    if (profileChange.firstChange || this.activeProfileId !== nextProfileId || this.activeMemberId !== this.currentMemberId()) this.resetForProfile();
  }

  ngOnDestroy(): void {
    this.navigationDiscardSubscription.unsubscribe();
    this.languageListCancel.next();
    this.languageListCancel.complete();
    this.languageMasterCancel.next();
    this.languageMasterCancel.complete();
    this.clearSearchTimer();
    this.editSession.setDirty(false);
    this.setInteractionActive(false);
  }

  resetForProfile(): void {
    this.languageListCancel.next();
    this.languageMasterCancel.next();
    this.clearSearchTimer();
    this.languageListGeneration++;
    this.languageMutationGeneration++;
    this.languageMasterGeneration++;
    this.deleteRecoveryGeneration++;
    this.activeProfileId = this.profile ? String(this.profile.id) : null;
    this.activeMemberId = this.currentMemberId();
    this.languages = [];
    this.languageLoading = false;
    this.languageError = null;
    this.languageMessage = '';
    this.languageErrorMessage = '';
    this.isReloading = false;
    this.closeLanguageEditor();
    this.closeLanguageDeleteConfirmation();
    this.resetLanguageMasterSelector();
    this.syncDirtyState();
    if (this.activeProfileId) this.loadProfileLanguages(this.activeProfileId);
  }

  retryLanguages(): void {
    if (this.activeProfileId) this.loadProfileLanguages(this.activeProfileId);
  }

  startLanguageCreate(): void {
    this.openLanguageEditor();
  }

  startLanguageEdit(language: ProfileLanguage): void {
    this.openLanguageEditor(language);
  }

  cancelEditing(): void {
    if (!this.languageEditorMode || this.isLanguageSubmitting) return;
    if (this.languageForm.dirty) {
      this.cancelConfirmation = true;
      this.syncDirtyState();
      return;
    }
    this.closeLanguageEditor();
  }

  keepEditing(): void {
    this.cancelConfirmation = false;
    this.reloadConfirmation = false;
    this.syncDirtyState();
  }

  discardEditing(): void {
    this.cancelConfirmation = false;
    this.closeLanguageEditor();
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

    const profile = this.selectedProfile();
    const profileId = this.selectedProfileId();
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
    this.syncDirtyState();
    const request$ = mode === 'edit' && languageId !== null
      ? this.profileService.updateProfileLanguage(profileId, languageId, request)
      : this.profileService.createProfileLanguage(profileId, request);

    request$.subscribe({
      next: (result) => {
        if (!this.isCurrentLanguageOperation(profileId, operationGeneration)) return;
        if (!this.context.applyMutationVersion(profileId, result.profileVersion)) {
          this.isLanguageSubmitting = false;
          this.syncDirtyState();
          return;
        }
        this.refreshManagedProfile(profileId);

        this.languages = mode === 'edit' && languageId !== null
          ? this.sortProfileLanguages(this.languages.map((language) => String(language.profileLanguageId) === String(languageId) ? result.profileLanguage : language))
          : this.sortProfileLanguages([...this.languages, result.profileLanguage]);
        this.isLanguageSubmitting = false;
        this.languageConflict = false;
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

  openLanguageDeleteConfirmation(language: ProfileLanguage): void {
    if (this.mutationBlocked || !this.isCurrentLanguageRecord(language)) return;
    const profileId = this.selectedProfileId();
    const profile = this.selectedProfile();
    if (!profileId || !profile || String(profile.id) !== profileId) return;

    this.languageDeleteTarget = language;
    this.languageDeleteErrorMessage = '';
    this.languageDeleteConfirmation = true;
    this.syncDirtyState();
  }

  cancelLanguageDelete(): void {
    if (this.isLanguageDeleting) return;
    this.closeLanguageDeleteConfirmation();
  }

  confirmLanguageDelete(): void {
    const target = this.languageDeleteTarget;
    const profileId = this.selectedProfileId();
    const profile = this.selectedProfile();
    if (!this.languageDeleteConfirmation || !target || this.isLanguageDeleting || this.hasDeleteConflict() || !profileId || !profile) return;
    if (String(profile.id) !== profileId || !this.isCurrentLanguageRecord(target)) {
      this.closeLanguageDeleteConfirmation();
      return;
    }

    const operationGeneration = ++this.languageMutationGeneration;
    this.isLanguageDeleting = true;
    this.languageDeleteErrorMessage = '';
    this.syncDirtyState();
    this.profileService.deleteProfileLanguage(profileId, target.profileLanguageId, profile.version).subscribe({
      next: (result) => {
        if (!this.isCurrentLanguageOperation(profileId, operationGeneration, false)) return;
        if (!this.context.applyMutationVersion(profileId, result.profileVersion)) {
          this.isLanguageDeleting = false;
          this.syncDirtyState();
          return;
        }
        this.refreshManagedProfile(profileId);

        this.languages = this.languages.filter((language) => String(language.profileLanguageId) !== String(target.profileLanguageId));
        this.isLanguageDeleting = false;
        this.languageMessage = 'Language deleted successfully.';
        this.notifications.showSuccess(this.languageMessage);
        this.closeLanguageDeleteConfirmation();
      },
      error: (error: unknown) => {
        if (!this.isCurrentLanguageOperation(profileId, operationGeneration, false)) return;
        this.isLanguageDeleting = false;
        if (this.isProfileVersionConflict(error)) {
          this.deleteConflict = true;
          this.languageDeleteErrorMessage = this.deleteConflictMessage();
          this.deleteRecoveryGeneration++;
          this.syncDirtyState();
          return;
        }
        this.languageDeleteErrorMessage = this.apiError(error)?.message?.trim() || 'Unable to delete this Language right now. The record is still here and you can retry.';
        this.syncDirtyState();
      },
    });
  }

  reloadLatest(): void {
    if (this.hasDeleteConflict()) {
      if (this.languageEditorMode) {
        this.languageDeleteErrorMessage = 'Finish or discard the active draft before reloading the latest Profile.';
        return;
      }
      if (!this.isReloading) this.fetchLatestDeleteConflict();
      return;
    }
    if (this.isReloading || !this.languageEditorMode || !this.languageConflict) return;
    if (this.languageForm.dirty) {
      this.reloadConfirmation = true;
      this.syncDirtyState();
      return;
    }
    this.fetchLatestLanguage();
  }

  confirmReloadLatest(): void {
    this.reloadConfirmation = false;
    if (this.hasDeleteConflict()) this.fetchLatestDeleteConflict();
    else this.fetchLatestLanguage();
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

  languageRecordLabel(language: ProfileLanguage): string {
    return `${language.languageName} (${this.languageLevelLabel(language.level)})`;
  }

  languageLevelLabel(level: LanguageLevel): string {
    return this.languageLevels.find((option) => option.value === level)?.label ?? level;
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
    this.clearSearchTimer();
    this.languageMasterSearch = this.languageInputValue.trim();
    this.languageMasterDropdownOpen = true;
    this.loadLanguageMaster(0, this.languageMasterSearch);
  }

  loadMoreLanguageMaster(): void {
    if (this.languageMasterLoading || this.languageMasterPage + 1 >= this.languageMasterTotalPages) return;
    this.loadLanguageMaster(this.languageMasterPage + 1, this.languageMasterSearch, true);
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

  hasLanguageChanges(): boolean {
    const original = this.originalLanguageValues;
    if (!original) return false;
    const current = this.normalizeLanguageValues(this.languageForm.getRawValue());
    return current.languageId !== original.languageId
      || current.level !== original.level
      || this.languageInputValue.trim() !== this.originalLanguageInputValue;
  }

  private loadProfileLanguages(profileId: string, onLoaded?: () => void, onError?: () => void): void {
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
        onLoaded?.();
      },
      error: (error: unknown) => {
        if (!this.isCurrentLanguageProfile(profileId, generation)) return;
        this.languageError = error;
        this.languageLoading = false;
        onError?.();
      },
    });
  }

  private scheduleLanguageMasterSearch(value: string): void {
    this.clearSearchTimer();
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

  private loadLanguageMaster(page: number, search: string, append = false): void {
    this.languageMasterCancel.next();
    const generation = ++this.languageMasterGeneration;
    this.languageMasterLoading = true;
    this.languageMasterError = null;
    this.languageMasterReady = false;
    this.languageMasterState = 'loading';
    this.profileService.listLanguageMaster(page, this.languageMasterSize, search).pipe(takeUntil(this.languageMasterCancel)).subscribe({
      next: (result) => {
        if (this.languageMasterGeneration !== generation || !this.languageEditorMode) return;
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
        if (this.languageMasterGeneration !== generation || !this.languageEditorMode) return;
        this.languageMasterError = error;
        this.languageMasterLoading = false;
        this.languageMasterState = 'error';
      },
    });
  }

  private fetchLatestLanguage(): void {
    const profileId = this.selectedProfileId();
    if (!profileId) return;

    this.closeLanguageEditor();
    this.isReloading = true;
    this.languageErrorMessage = '';
    this.languageMessage = '';
    this.context.reloadDetail(profileId).subscribe({
      next: () => {
        if (!this.isCurrentProfileContext(profileId)) return;
        this.isReloading = false;
        this.languageConflict = false;
        this.languageMessage = 'Latest Profile and Language data loaded. Review it before editing.';
        this.loadProfileLanguages(profileId);
      },
      error: (error: unknown) => {
        if (!this.isCurrentProfileContext(profileId)) return;
        this.isReloading = false;
        this.languageErrorMessage = this.apiError(error)?.message?.trim() || 'Unable to reload the latest Profile right now. Please try again.';
      },
    });
  }

  private fetchLatestDeleteConflict(): void {
    const profileId = this.selectedProfileId();
    if (!profileId || !this.hasDeleteConflict()) return;

    const recoveryGeneration = ++this.deleteRecoveryGeneration;
    this.isReloading = true;
    this.languageDeleteErrorMessage = '';
    this.context.reloadDetail(profileId).subscribe({
      next: () => {
        if (!this.isCurrentDeleteRecovery(profileId, recoveryGeneration)) return;
        this.loadProfileLanguages(profileId, () => this.completeDeleteRecovery(profileId, recoveryGeneration), () => this.failDeleteRecovery(profileId, recoveryGeneration));
      },
      error: (error: unknown) => {
        if (!this.isCurrentDeleteRecovery(profileId, recoveryGeneration)) return;
        this.isReloading = false;
        this.languageDeleteErrorMessage = `Latest Profile data could not be loaded. ${this.apiError(error)?.message?.trim() || 'Please try Reload Latest again.'}`;
      },
    });
  }

  private completeDeleteRecovery(profileId: string, recoveryGeneration: number): void {
    if (!this.isCurrentDeleteRecovery(profileId, recoveryGeneration)) return;
    this.isReloading = false;
    const target = this.languageDeleteTarget;
    const current = target && this.languages.find((language) => String(language.profileLanguageId) === String(target.profileLanguageId));
    if (!current) {
      this.closeLanguageDeleteConfirmation();
      this.languageMessage = 'Latest Profile and Language data loaded. The record is no longer available.';
      return;
    }
    this.languageDeleteTarget = current;
    this.deleteConflict = false;
    this.languageDeleteErrorMessage = '';
    this.languageMessage = 'Latest Profile and Language data loaded. Confirm the deletion again if it is still wanted.';
    this.syncDirtyState();
  }

  private failDeleteRecovery(profileId: string, recoveryGeneration: number): void {
    if (!this.isCurrentDeleteRecovery(profileId, recoveryGeneration)) return;
    this.isReloading = false;
    this.languageDeleteErrorMessage = 'Latest Language data could not be loaded. Please try Reload Latest again.';
    this.syncDirtyState();
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

  private resetLanguageMasterSelector(): void {
    this.clearSearchTimer();
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

  private closeLanguageDeleteConfirmation(): void {
    this.languageDeleteConfirmation = false;
    this.deleteConflict = false;
    this.languageDeleteTarget = null;
    this.languageDeleteErrorMessage = '';
    this.isLanguageDeleting = false;
    this.syncDirtyState();
  }

  private openLanguageEditor(language?: ProfileLanguage): void {
    if (!this.profile || this.mutationBlocked || (language && !this.isCurrentLanguageRecord(language))) return;

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

  private clearLanguageBackendErrors(): void {
    for (const control of Object.values(this.languageForm.controls)) {
      if (!control.errors?.['backend'] && !control.errors?.['duplicate']) continue;
      const errors = { ...control.errors };
      delete errors['backend'];
      delete errors['duplicate'];
      control.setErrors(Object.keys(errors).length ? errors : null);
    }
  }

  private setLanguageFieldError(field: EditableLanguageField, message: string, key = 'backend'): void {
    const control = this.languageForm.controls[field];
    control.setErrors({ ...control.errors, [key]: message.trim() || 'This value is not valid.' });
    control.markAsTouched();
  }

  private emptyLanguageValues(): EditableLanguageValues {
    return { languageId: null, level: null };
  }

  private languageFormValues(language: ProfileLanguage): EditableLanguageValues {
    return { languageId: language.languageId, level: language.level };
  }

  private normalizeLanguageValues(value: EditableLanguageValues): EditableLanguageValues {
    return { languageId: value.languageId, level: value.level };
  }

  private languageLevelValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => this.languageLevels?.some((option) => option.value === control.value)
      ? null
      : { invalidLevel: true };
  }

  private isCommittedLanguageSelection(): boolean {
    const selected = this.selectedLanguageMasterOption;
    const id = this.languageForm.controls.languageId.value;
    return !!selected
      && id !== null
      && String(selected.id) === String(id)
      && this.languageInputValue.trim() === selected.name.trim();
  }

  private languageMasterOption(language: ProfileLanguage): LanguageMasterOption {
    return { id: language.languageId, name: language.languageName };
  }

  private nextMasterOptionIndex(
    options: LanguageMasterOption[],
    currentIndex: number,
    direction: 1 | -1,
    disabled: (option: LanguageMasterOption) => boolean,
  ): number {
    if (!options.length) return -1;
    const startIndex = currentIndex < 0 ? (direction === 1 ? -1 : options.length) : currentIndex;
    for (let step = 1; step <= options.length; step++) {
      const index = (startIndex + direction * step + options.length) % options.length;
      if (!disabled(options[index])) return index;
    }
    return -1;
  }

  private mergeMasterOptions(current: LanguageMasterOption[], incoming: LanguageMasterOption[]): LanguageMasterOption[] {
    const options = new Map<string, LanguageMasterOption>();
    for (const option of [...current, ...incoming]) options.set(String(option.id), option);
    return [...options.values()];
  }

  private clearSearchTimer(): void {
    if (this.languageSearchTimer !== null) clearTimeout(this.languageSearchTimer);
    this.languageSearchTimer = null;
  }

  private isCurrentLanguageProfile(profileId: string, generation: number): boolean {
    return this.activeProfileId === profileId
      && this.languageListGeneration === generation
      && this.isCurrentProfileContext(profileId);
  }

  private isCurrentProfileContext(profileId: string): boolean {
    return this.activeProfileId === profileId
      && this.activeMemberId === this.currentMemberId()
      && this.selectedProfileId() === profileId
      && String(this.selectedProfile()?.id) === profileId;
  }

  private isCurrentLanguageOperation(profileId: string, generation: number, requiresEditor = true): boolean {
    return this.isCurrentProfileContext(profileId)
      && this.languageMutationGeneration === generation
      && (!requiresEditor || this.languageEditorMode !== null);
  }

  private isCurrentLanguageRecord(language: ProfileLanguage): boolean {
    return this.languages.some((item) => String(item.profileLanguageId) === String(language.profileLanguageId));
  }

  private isCurrentDeleteRecovery(profileId: string, generation: number): boolean {
    return this.hasDeleteConflict()
      && this.deleteRecoveryGeneration === generation
      && this.isCurrentProfileContext(profileId);
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

  hasDeleteConflict(): boolean {
    return this.deleteConflict;
  }

  private isProfileVersionConflict(error: unknown): boolean {
    return this.apiError(error)?.errorCode === 'PROFILE_VERSION_CONFLICT';
  }

  private deleteConflictMessage(): string {
    return 'The Profile changed before this Language could be deleted. Reload Latest to refresh the current Language data before deciding again.';
  }

  private syncDirtyState(): void {
    this.editSession.setDirty(this.languageEditorMode !== null && (this.languageForm.dirty || this.hasLanguageChanges()));
    this.setInteractionActive(this.languageEditorMode !== null
      || this.isLanguageSubmitting
      || this.languageConflict
      || this.cancelConfirmation
      || this.reloadConfirmation
      || this.languageDeleteConfirmation
      || this.isLanguageDeleting
      || this.isReloading);
  }

  private setInteractionActive(active: boolean): void {
    if (this.interactionActive === active) return;
    this.interactionActive = active;
    this.interactionActiveChange.emit(active);
  }

  private focusEditorField(id: string): void {
    const fields = document.querySelectorAll<HTMLElement>(`#${id}`);
    const field = fields.item(fields.length - 1);
    field?.focus();
    if (field && document.activeElement !== field) setTimeout(() => { if (document.activeElement === document.body) field.focus(); });
  }

  private apiError(error: unknown): ApiErrorResponse | undefined {
    return error instanceof HttpErrorResponse ? error.error as ApiErrorResponse : undefined;
  }

  private currentMemberId(): string | null {
    const member = this.context.managedMember?.();
    return member ? String(member.id) : null;
  }

  private selectedProfileId(): string | null {
    return this.context.managedMember?.() ? this.context.managedSelectedId() : this.context.selectedId();
  }

  private selectedProfile(): ProfileDetail | null {
    return this.context.managedMember?.() ? this.context.managedDetail() : this.context.detail();
  }

  private refreshManagedProfile(profileId: string): void {
    const refresh$ = this.context.refreshManagedProfile?.(profileId);
    refresh$?.subscribe({ error: () => undefined });
  }
}
