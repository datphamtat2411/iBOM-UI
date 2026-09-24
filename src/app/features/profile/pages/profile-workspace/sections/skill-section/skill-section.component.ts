import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Subject, Subscription, takeUntil } from 'rxjs';

import { ApiErrorResponse } from '../../../../../../core/http/api.models';
import { NotificationService } from '../../../../../../core/notifications/notification.service';
import { ProfileDetail, ProfileSkill, ProfileSkillRequest, SkillMasterOption } from '../../../../models/profile.models';
import { ProfileContextService } from '../../../../services/profile-context.service';
import { ProfileEditSessionService } from '../../../../services/profile-edit-session.service';
import { ProfileService } from '../../../../services/profile.service';

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
  selector: 'app-skill-section',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './skill-section.component.html',
  styleUrl: './skill-section.component.scss',
})
export class SkillSectionComponent implements OnChanges, OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly notifications = inject(NotificationService);
  readonly context = inject(ProfileContextService);
  readonly editSession = inject(ProfileEditSessionService);

  @Input({ required: true }) profile!: ProfileDetail;
  @Input() mutationBlocked = false;
  @Output() readonly interactionActiveChange = new EventEmitter<boolean>();

  readonly skillForm = this.formBuilder.group({
    skillId: this.formBuilder.control<number | string | null>(null, [Validators.required]),
    experienceYears: this.formBuilder.control<number | null>(null, [Validators.required, Validators.min(0)]),
    lastUsed: this.formBuilder.nonNullable.control('', [this.skillLastUsedValidator()]),
  });
  readonly skillDateMax = this.currentDate();

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
  isReloading = false;
  cancelConfirmation = false;
  reloadConfirmation = false;

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

  private activeProfileId: string | null = null;
  private activeMemberId: string | null = null;
  private editingProfileSkillId: number | string | null = null;
  private originalSkillValues: EditableSkillValues | null = null;
  private originalSkillInputValue = '';
  private readonly skillListCancel = new Subject<void>();
  private readonly skillMasterCancel = new Subject<void>();
  private skillListGeneration = 0;
  private skillMutationGeneration = 0;
  private skillMasterGeneration = 0;
  private deleteRecoveryGeneration = 0;
  private skillSearchTimer: ReturnType<typeof setTimeout> | null = null;
  private deleteConflict = false;
  private interactionActive = false;
  private readonly navigationDiscardSubscription: Subscription;

  constructor() {
    this.skillForm.valueChanges.subscribe(() => this.syncDirtyState());
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
    this.skillListCancel.next();
    this.skillListCancel.complete();
    this.skillMasterCancel.next();
    this.skillMasterCancel.complete();
    this.clearSearchTimer();
    this.editSession.setDirty(false);
    this.setInteractionActive(false);
  }

  resetForProfile(): void {
    this.skillListCancel.next();
    this.skillMasterCancel.next();
    this.clearSearchTimer();
    this.skillListGeneration++;
    this.skillMutationGeneration++;
    this.skillMasterGeneration++;
    this.deleteRecoveryGeneration++;
    this.activeProfileId = this.profile ? String(this.profile.id) : null;
    this.activeMemberId = this.currentMemberId();
    this.skills = [];
    this.skillLoading = false;
    this.skillError = null;
    this.skillMessage = '';
    this.skillErrorMessage = '';
    this.isReloading = false;
    this.closeSkillEditor();
    this.closeSkillDeleteConfirmation();
    this.resetSkillMasterSelector();
    this.syncDirtyState();
    if (this.activeProfileId) this.loadProfileSkills(this.activeProfileId);
  }

  retrySkills(): void {
    if (this.activeProfileId) this.loadProfileSkills(this.activeProfileId);
  }

  startSkillCreate(): void {
    this.openSkillEditor();
  }

  startSkillEdit(skill: ProfileSkill): void {
    this.openSkillEditor(skill);
  }

  cancelEditing(): void {
    if (!this.skillEditorMode || this.isSkillSubmitting) return;
    if (this.skillForm.dirty) {
      this.cancelConfirmation = true;
      this.syncDirtyState();
      return;
    }
    this.closeSkillEditor();
  }

  keepEditing(): void {
    this.cancelConfirmation = false;
    this.reloadConfirmation = false;
    this.syncDirtyState();
  }

  discardEditing(): void {
    this.cancelConfirmation = false;
    this.closeSkillEditor();
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

    const profile = this.selectedProfile();
    const profileId = this.selectedProfileId();
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
    this.syncDirtyState();
    const request$ = mode === 'edit' && profileSkillId !== null
      ? this.profileService.updateProfileSkill(profileId, profileSkillId, request)
      : this.profileService.createProfileSkill(profileId, request);

    request$.subscribe({
      next: (result) => {
        if (!this.isCurrentSkillOperation(profileId, operationGeneration)) return;
        if (!this.context.applyMutationVersion(profileId, result.profileVersion)) {
          this.isSkillSubmitting = false;
          this.syncDirtyState();
          return;
        }
        this.refreshManagedProfile(profileId);

        this.skills = this.sortProfileSkills(mode === 'edit' && profileSkillId !== null
          ? this.skills.map((skill) => String(skill.profileSkillId) === String(profileSkillId) ? result.profileSkill : skill)
          : [...this.skills, result.profileSkill]);
        this.isSkillSubmitting = false;
        this.skillConflict = false;
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

  openSkillDeleteConfirmation(skill: ProfileSkill): void {
    if (this.mutationBlocked || !this.isCurrentSkillRecord(skill)) return;
    const profileId = this.selectedProfileId();
    const profile = this.selectedProfile();
    if (!profileId || !profile || String(profile.id) !== profileId) return;

    this.skillDeleteTarget = skill;
    this.skillDeleteErrorMessage = '';
    this.skillDeleteConfirmation = true;
    this.syncDirtyState();
  }

  cancelSkillDelete(): void {
    if (this.isSkillDeleting) return;
    this.closeSkillDeleteConfirmation();
  }

  confirmSkillDelete(): void {
    const target = this.skillDeleteTarget;
    const profileId = this.selectedProfileId();
    const profile = this.selectedProfile();
    if (!this.skillDeleteConfirmation || !target || this.isSkillDeleting || this.hasDeleteConflict() || !profileId || !profile) return;
    if (String(profile.id) !== profileId || !this.isCurrentSkillRecord(target)) {
      this.closeSkillDeleteConfirmation();
      return;
    }

    const operationGeneration = ++this.skillMutationGeneration;
    this.isSkillDeleting = true;
    this.skillDeleteErrorMessage = '';
    this.syncDirtyState();
    this.profileService.deleteProfileSkill(profileId, target.profileSkillId, profile.version).subscribe({
      next: (result) => {
        if (!this.isCurrentSkillOperation(profileId, operationGeneration, false)) return;
        if (!this.context.applyMutationVersion(profileId, result.profileVersion)) {
          this.isSkillDeleting = false;
          this.syncDirtyState();
          return;
        }
        this.refreshManagedProfile(profileId);

        this.skills = this.sortProfileSkills(this.skills.filter((skill) => String(skill.profileSkillId) !== String(target.profileSkillId)));
        this.isSkillDeleting = false;
        this.skillMessage = 'Skill deleted successfully.';
        this.notifications.showSuccess(this.skillMessage);
        this.closeSkillDeleteConfirmation();
      },
      error: (error: unknown) => {
        if (!this.isCurrentSkillOperation(profileId, operationGeneration, false)) return;
        this.isSkillDeleting = false;
        if (this.isProfileVersionConflict(error)) {
          this.deleteConflict = true;
          this.skillDeleteErrorMessage = this.deleteConflictMessage();
          this.deleteRecoveryGeneration++;
          this.syncDirtyState();
          return;
        }
        this.skillDeleteErrorMessage = this.apiError(error)?.message?.trim() || 'Unable to delete this Skill right now. The record is still here and you can retry.';
        this.syncDirtyState();
      },
    });
  }

  reloadLatest(): void {
    if (this.hasDeleteConflict()) {
      if (this.skillEditorMode) {
        this.skillDeleteErrorMessage = 'Finish or discard the active draft before reloading the latest Profile.';
        return;
      }
      if (!this.isReloading) this.fetchLatestDeleteConflict();
      return;
    }
    if (this.isReloading || !this.skillEditorMode || !this.skillConflict) return;
    if (this.skillForm.dirty) {
      this.reloadConfirmation = true;
      this.syncDirtyState();
      return;
    }
    this.fetchLatestSkill();
  }

  confirmReloadLatest(): void {
    this.reloadConfirmation = false;
    if (this.hasDeleteConflict()) this.fetchLatestDeleteConflict();
    else this.fetchLatestSkill();
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

  skillCategoryLabel(skill: ProfileSkill): string {
    return skill.categoryName?.trim() || skill.categoryCode?.trim() || '—';
  }

  skillLastUsedLabel(skill: ProfileSkill): string {
    return this.formatSkillLastUsed(skill.lastUsed);
  }

  skillRecordLabel(skill: ProfileSkill): string {
    return `${skill.skillName} (${skill.experienceYears} years)`;
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
    this.clearSearchTimer();
    this.skillMasterSearch = this.skillInputValue.trim();
    this.skillMasterDropdownOpen = true;
    this.loadSkillMaster(0, this.skillMasterSearch);
  }

  loadMoreSkillMaster(): void {
    if (this.skillMasterLoading || this.skillMasterPage + 1 >= this.skillMasterTotalPages) return;
    this.loadSkillMaster(this.skillMasterPage + 1, this.skillMasterSearch, true);
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

  hasSkillChanges(): boolean {
    const original = this.originalSkillValues;
    if (!original) return false;
    const current = this.normalizeSkillValues(this.skillForm.getRawValue());
    return current.skillId !== original.skillId
      || current.experienceYears !== original.experienceYears
      || current.lastUsed !== original.lastUsed
      || this.skillInputValue.trim() !== this.originalSkillInputValue;
  }

  hasDeleteConflict(): boolean {
    return this.deleteConflict;
  }

  private loadProfileSkills(profileId: string, onLoaded?: () => void, onError?: () => void): void {
    this.skillListCancel.next();
    const generation = ++this.skillListGeneration;
    this.skills = [];
    this.skillLoading = true;
    this.skillError = null;
    this.skillMessage = '';
    this.profileService.listProfileSkills(profileId).pipe(takeUntil(this.skillListCancel)).subscribe({
      next: (skills) => {
        if (!this.isCurrentSkillProfile(profileId, generation)) return;
        this.skills = this.sortProfileSkills(skills);
        this.skillLoading = false;
        onLoaded?.();
      },
      error: (error: unknown) => {
        if (!this.isCurrentSkillProfile(profileId, generation)) return;
        this.skillError = error;
        this.skillLoading = false;
        onError?.();
      },
    });
  }

  private scheduleSkillMasterSearch(value: string): void {
    this.clearSearchTimer();
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

  private loadSkillMaster(page: number, search: string, append = false): void {
    this.skillMasterCancel.next();
    const generation = ++this.skillMasterGeneration;
    this.skillMasterLoading = true;
    this.skillMasterError = null;
    this.skillMasterReady = false;
    this.skillMasterState = 'loading';
    this.profileService.listSkillMaster(page, this.skillMasterSize, search).pipe(takeUntil(this.skillMasterCancel)).subscribe({
      next: (result) => {
        if (this.skillMasterGeneration !== generation || !this.skillEditorMode) return;
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
        if (this.skillMasterGeneration !== generation || !this.skillEditorMode) return;
        this.skillMasterError = error;
        this.skillMasterLoading = false;
        this.skillMasterState = 'error';
      },
    });
  }

  private fetchLatestSkill(): void {
    const profileId = this.selectedProfileId();
    if (!profileId) return;

    this.closeSkillEditor();
    this.isReloading = true;
    this.skillErrorMessage = '';
    this.skillMessage = '';
    this.context.reloadDetail(profileId).subscribe({
      next: () => {
        if (!this.isCurrentProfileContext(profileId)) return;
        this.isReloading = false;
        this.skillConflict = false;
        this.skillMessage = 'Latest Profile and Skill data loaded. Review it before editing.';
        this.loadProfileSkills(profileId);
      },
      error: (error: unknown) => {
        if (!this.isCurrentProfileContext(profileId)) return;
        this.isReloading = false;
        this.skillErrorMessage = this.apiError(error)?.message?.trim() || 'Unable to reload the latest Profile right now. Please try again.';
      },
    });
  }

  private fetchLatestDeleteConflict(): void {
    const profileId = this.selectedProfileId();
    if (!profileId || !this.hasDeleteConflict()) return;

    const recoveryGeneration = ++this.deleteRecoveryGeneration;
    this.isReloading = true;
    this.skillDeleteErrorMessage = '';
    this.context.reloadDetail(profileId).subscribe({
      next: () => {
        if (!this.isCurrentDeleteRecovery(profileId, recoveryGeneration)) return;
        this.loadProfileSkills(profileId, () => this.completeDeleteRecovery(profileId, recoveryGeneration), () => this.failDeleteRecovery(profileId, recoveryGeneration));
      },
      error: (error: unknown) => {
        if (!this.isCurrentDeleteRecovery(profileId, recoveryGeneration)) return;
        this.isReloading = false;
        this.skillDeleteErrorMessage = `Latest Profile data could not be loaded. ${this.apiError(error)?.message?.trim() || 'Please try Reload Latest again.'}`;
      },
    });
  }

  private completeDeleteRecovery(profileId: string, recoveryGeneration: number): void {
    if (!this.isCurrentDeleteRecovery(profileId, recoveryGeneration)) return;
    this.isReloading = false;
    const target = this.skillDeleteTarget;
    const current = target && this.skills.find((skill) => String(skill.profileSkillId) === String(target.profileSkillId));
    if (!current) {
      this.closeSkillDeleteConfirmation();
      this.skillMessage = 'Latest Profile and Skill data loaded. The record is no longer available.';
      return;
    }
    this.skillDeleteTarget = current;
    this.deleteConflict = false;
    this.skillDeleteErrorMessage = '';
    this.skillMessage = 'Latest Profile and Skill data loaded. Confirm the deletion again if it is still wanted.';
    this.syncDirtyState();
  }

  private failDeleteRecovery(profileId: string, recoveryGeneration: number): void {
    if (!this.isCurrentDeleteRecovery(profileId, recoveryGeneration)) return;
    this.isReloading = false;
    this.skillDeleteErrorMessage = 'Latest Skill data could not be loaded. Please try Reload Latest again.';
    this.syncDirtyState();
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

  private resetSkillMasterSelector(): void {
    this.clearSearchTimer();
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

  private closeSkillDeleteConfirmation(): void {
    this.skillDeleteConfirmation = false;
    this.deleteConflict = false;
    this.skillDeleteTarget = null;
    this.skillDeleteErrorMessage = '';
    this.isSkillDeleting = false;
    this.syncDirtyState();
  }

  private openSkillEditor(skill?: ProfileSkill): void {
    if (!this.profile || this.mutationBlocked || (skill && !this.isCurrentSkillRecord(skill))) return;

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

  private trimSkillFormValues(): void {
    const value = this.skillForm.getRawValue();
    this.skillForm.patchValue({ lastUsed: value.lastUsed.trim() }, { emitEvent: false });
    this.skillForm.updateValueAndValidity({ emitEvent: false });
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

  private clearSkillBackendErrors(): void {
    for (const control of Object.values(this.skillForm.controls)) {
      if (!control.errors?.['backend'] && !control.errors?.['duplicate']) continue;
      const errors = { ...control.errors };
      delete errors['backend'];
      delete errors['duplicate'];
      control.setErrors(Object.keys(errors).length ? errors : null);
    }
  }

  private setSkillFieldError(field: EditableSkillField, message: string, key = 'backend'): void {
    const control = this.skillForm.controls[field];
    control.setErrors({ ...control.errors, [key]: message.trim() || 'This value is not valid.' });
    control.markAsTouched();
  }

  private emptySkillValues(): EditableSkillValues {
    return { skillId: null, experienceYears: null, lastUsed: '' };
  }

  private skillFormValues(skill: ProfileSkill): EditableSkillValues {
    return { skillId: skill.skillId, experienceYears: skill.experienceYears, lastUsed: skill.lastUsed?.slice(0, 10) ?? '' };
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

  private skillMasterOption(skill: ProfileSkill): SkillMasterOption {
    return {
      id: skill.skillId,
      name: skill.skillName,
      categoryId: skill.categoryId,
      categoryCode: skill.categoryCode,
      categoryName: skill.categoryName,
    };
  }

  private isCommittedSkillSelection(): boolean {
    const selected = this.selectedSkillMasterOption;
    const id = this.skillForm.controls.skillId.value;
    return !!selected
      && id !== null
      && String(selected.id) === String(id)
      && this.skillInputValue.trim() === selected.name.trim();
  }

  private nextMasterOptionIndex(
    options: SkillMasterOption[],
    currentIndex: number,
    direction: 1 | -1,
    disabled: (option: SkillMasterOption) => boolean,
  ): number {
    if (!options.length) return -1;
    const startIndex = currentIndex < 0 ? (direction === 1 ? -1 : options.length) : currentIndex;
    for (let step = 1; step <= options.length; step++) {
      const index = (startIndex + direction * step + options.length) % options.length;
      if (!disabled(options[index])) return index;
    }
    return -1;
  }

  private mergeMasterOptions(current: SkillMasterOption[], incoming: SkillMasterOption[]): SkillMasterOption[] {
    const options = new Map<string, SkillMasterOption>();
    for (const option of [...current, ...incoming]) options.set(String(option.id), option);
    return [...options.values()];
  }

  private clearSearchTimer(): void {
    if (this.skillSearchTimer !== null) clearTimeout(this.skillSearchTimer);
    this.skillSearchTimer = null;
  }

  private isCurrentSkillProfile(profileId: string, generation: number): boolean {
    return this.activeProfileId === profileId
      && this.skillListGeneration === generation
      && this.isCurrentProfileContext(profileId);
  }

  private isCurrentProfileContext(profileId: string): boolean {
    return this.activeProfileId === profileId
      && this.activeMemberId === this.currentMemberId()
      && this.selectedProfileId() === profileId
      && String(this.selectedProfile()?.id) === profileId;
  }

  private isCurrentSkillOperation(profileId: string, generation: number, requiresEditor = true): boolean {
    return this.isCurrentProfileContext(profileId)
      && this.skillMutationGeneration === generation
      && (!requiresEditor || this.skillEditorMode !== null);
  }

  private isCurrentSkillRecord(skill: ProfileSkill): boolean {
    return this.skills.some((item) => String(item.profileSkillId) === String(skill.profileSkillId));
  }

  private isCurrentDeleteRecovery(profileId: string, generation: number): boolean {
    return this.hasDeleteConflict()
      && this.deleteRecoveryGeneration === generation
      && this.isCurrentProfileContext(profileId);
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

  private formatSkillLastUsed(lastUsed: string | null | undefined): string {
    if (!lastUsed) return '—';
    const date = new Date(`${lastUsed.slice(0, 10)}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
  }

  private isProfileVersionConflict(error: unknown): boolean {
    return this.apiError(error)?.errorCode === 'PROFILE_VERSION_CONFLICT';
  }

  private deleteConflictMessage(): string {
    return 'The Profile changed before this Skill could be deleted. Reload Latest to refresh the current Skill data before deciding again.';
  }

  private syncDirtyState(): void {
    this.editSession.setDirty(this.skillEditorMode !== null && (this.skillForm.dirty || this.hasSkillChanges()));
    this.setInteractionActive(this.skillEditorMode !== null
      || this.isSkillSubmitting
      || this.skillConflict
      || this.cancelConfirmation
      || this.reloadConfirmation
      || this.skillDeleteConfirmation
      || this.isSkillDeleting
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
