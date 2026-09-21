import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { ApiErrorResponse } from '../../../../core/http/api.models';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { Project, ProjectRequest, ProjectStatus } from '../../models/profile.models';
import { ProfileContextService } from '../../services/profile-context.service';
import { ProfileEditSessionService } from '../../services/profile-edit-session.service';
import { ProfileService } from '../../services/profile.service';

type ProjectEditorMode = 'create' | 'edit';
type ProjectSaveState = 'clean' | 'dirty' | 'saving' | 'saved' | 'failure' | 'conflict';
type ProjectPostSaveIntent = 'close' | 'add-another';
type EditableProjectField = keyof EditableProjectValues;
type EditableProjectValues = {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  position: string;
  teamSize: number | null;
  responsibilities: string;
  programmingLanguages: string;
  tools: string;
};

@Component({
  selector: 'app-project-editor',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './project-editor.component.html',
  styleUrl: './project-editor.component.scss',
})
export class ProjectEditorComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  readonly context = inject(ProfileContextService);
  readonly editSession = inject(ProfileEditSessionService);

  readonly projectForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', [Validators.required]],
    startDate: [''],
    endDate: [''],
    status: this.formBuilder.nonNullable.control<ProjectStatus>('ONGOING', [Validators.required, this.projectStatusValidator()]),
    position: ['', [Validators.required, Validators.maxLength(255)]],
    teamSize: this.formBuilder.control<number | null>(null, [this.wholeNumberValidator(), Validators.min(1)]),
    responsibilities: [''],
    programmingLanguages: [''],
    tools: [''],
  }, { validators: this.projectDateRangeValidator() });

  readonly statusOptions: ReadonlyArray<{ value: ProjectStatus; label: string }> = [
    { value: 'ONGOING', label: 'Ongoing' },
    { value: 'COMPLETED', label: 'Completed' },
  ];

  profileId: string | null = null;
  projectId: string | null = null;
  editorMode: ProjectEditorMode = 'create';
  project: Project | null = null;
  savedProject: Project | null = null;
  isLoading = true;
  isSubmitting = false;
  isReloading = false;
  conflict = false;
  cancelConfirmation = false;
  reloadConfirmation = false;
  loadErrorMessage = '';
  errorMessage = '';
  saveMessage = '';
  saveState: ProjectSaveState = 'clean';

  private readonly projectListCancel = new Subject<void>();
  private listGeneration = 0;
  private requestGeneration = 0;
  private originalValues: EditableProjectValues | null = null;

  constructor() {
    this.projectForm.valueChanges.subscribe(() => this.syncDirtyState());
    this.projectForm.controls.status.valueChanges.subscribe(() => this.updateEndDateState());
    this.route.paramMap.subscribe((params) => this.openRoute(params.get('profileId'), params.get('projectId')));
  }

  profileName(): string {
    return this.context.detail()?.profileName ?? 'Profile';
  }

  editorTitle(): string {
    return this.editorMode === 'edit' && this.project ? `Edit ${this.project.name}` : 'Add Project';
  }

  statusLabel(): string {
    return this.projectForm.controls.status.value;
  }

  returnToWorkspace(): void {
    if (this.profileId) void this.router.navigate(['/profiles', this.profileId]);
  }

  projectFieldError(field: EditableProjectField): string {
    const errors = this.projectForm.controls[field].errors;
    if (errors?.['backend']) return errors['backend'];
    if (errors?.['required']) return 'This field is required.';
    if (errors?.['maxlength']) return `Use ${errors['maxlength'].requiredLength} characters or fewer.`;
    if (errors?.['min']) return 'Enter a whole number of at least 1.';
    if (errors?.['wholeNumber']) return 'Enter a whole number of at least 1.';
    if (errors?.['invalidStatus']) return 'Select a supported Project status.';
    if (field === 'endDate' && this.projectForm.errors?.['dateRange']) return 'End date must be on or after the start date.';
    return errors ? 'This value is not valid.' : '';
  }

  projectFieldInvalid(field: EditableProjectField): boolean {
    const control = this.projectForm.controls[field];
    return (control.invalid && control.touched)
      || (field === 'endDate' && !!this.projectForm.errors?.['dateRange'] && control.touched);
  }

  saveStateLabel(): string {
    switch (this.saveState) {
      case 'dirty': return 'Unsaved changes';
      case 'saving': return 'Saving...';
      case 'saved': return 'Saved';
      case 'failure': return 'Save failed. Try again';
      case 'conflict': return 'Reload required';
      default: return 'No changes';
    }
  }

  hasProjectChanges(): boolean {
    const original = this.originalValues;
    if (!original) return false;
    const current = this.normalizeProjectValues(this.projectForm.getRawValue());
    return current.name !== original.name
      || current.description !== original.description
      || current.startDate !== original.startDate
      || current.endDate !== original.endDate
      || current.status !== original.status
      || current.position !== original.position
      || current.teamSize !== original.teamSize
      || current.responsibilities !== original.responsibilities
      || current.programmingLanguages !== original.programmingLanguages
      || current.tools !== original.tools;
  }

  submit(intent: ProjectPostSaveIntent = 'close'): void {
    if (this.isSubmitting || this.conflict) return;
    const addAnother = intent === 'add-another' && this.editorMode === 'create';

    this.errorMessage = '';
    this.saveMessage = '';
    this.clearBackendErrors();
    this.trimProjectFormValues();
    this.updateEndDateState();
    if (this.editorMode === 'edit' && !this.hasProjectChanges()) return;
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      this.syncDirtyState();
      return;
    }

    const profileId = this.profileId;
    const profile = this.context.detail();
    if (!profileId || !profile || this.context.selectedId() !== profileId || String(profile.id) !== profileId) {
      this.errorMessage = 'The selected Profile is no longer available. Return to the Profile Workspace and try again.';
      this.saveState = 'failure';
      return;
    }

    const value = this.projectForm.getRawValue();
    const request: ProjectRequest = {
      name: value.name,
      description: value.description,
      startDate: value.startDate || null,
      endDate: value.status === 'ONGOING' ? null : value.endDate || null,
      status: value.status,
      position: value.position,
      teamSize: value.teamSize === null ? null : Number(value.teamSize),
      responsibilities: value.responsibilities || null,
      programmingLanguages: value.programmingLanguages || null,
      tools: value.tools || null,
      version: profile.version,
    };
    const operationGeneration = ++this.requestGeneration;
    this.isSubmitting = true;
    this.saveState = 'saving';

    const request$ = this.editorMode === 'edit' && this.projectId !== null
      ? this.profileService.updateProject(profileId, this.projectId, request)
      : this.profileService.createProject(profileId, request);

    request$.subscribe({
      next: (result) => {
        if (!this.isCurrentOperation(profileId, operationGeneration)) return;
        if (!this.context.applyMutationVersion(profileId, result.profileVersion)) {
          this.isSubmitting = false;
          return;
        }

        this.isSubmitting = false;
        this.conflict = false;
        const message = this.editorMode === 'edit' ? 'Project updated successfully.' : 'Project added successfully.';
        this.notifications.showSuccess(message);
        if (addAnother) {
          this.resetCreateAfterSave();
          return;
        }

        this.project = result.project;
        this.savedProject = result.project;
        this.saveState = 'saved';
        this.saveMessage = message;
        this.originalValues = this.normalizeProjectValues(this.formValues(result.project));
        this.projectForm.reset(this.formValues(result.project));
        this.projectForm.markAsPristine();
        this.projectForm.markAsUntouched();
        this.updateEndDateState();
        this.editSession.setDirty(false);
        void this.router.navigate(['/profiles', profileId]);
      },
      error: (error: unknown) => {
        if (!this.isCurrentOperation(profileId, operationGeneration)) return;
        this.handleSaveError(error);
      },
    });
  }

  cancelEditing(): void {
    if (this.isSubmitting) return;
    if (this.projectForm.dirty || this.hasProjectChanges()) {
      this.cancelConfirmation = true;
      return;
    }
    this.discardEditing();
  }

  keepEditing(): void {
    this.cancelConfirmation = false;
    this.reloadConfirmation = false;
  }

  discardEditing(): void {
    this.cancelConfirmation = false;
    this.editSession.setDirty(false);
    if (this.profileId) void this.router.navigate(['/profiles', this.profileId]);
  }

  reloadLatest(): void {
    if (this.isReloading || !this.conflict) return;
    if (this.projectForm.dirty || this.hasProjectChanges()) {
      this.reloadConfirmation = true;
      return;
    }
    this.fetchLatest();
  }

  confirmReloadLatest(): void {
    this.reloadConfirmation = false;
    this.fetchLatest();
  }

  keepPendingNavigation(): void {
    this.editSession.resolveNavigation(false);
  }

  discardPendingNavigation(): void {
    this.editSession.setDirty(false);
    this.editSession.resolveNavigation(true);
  }

  private openRoute(profileId: string | null, projectId: string | null): void {
    this.projectListCancel.next();
    this.listGeneration++;
    this.requestGeneration++;
    this.profileId = profileId;
    this.projectId = projectId;
    this.editorMode = projectId ? 'edit' : 'create';
    this.project = null;
    this.savedProject = null;
    this.isLoading = true;
    this.isSubmitting = false;
    this.isReloading = false;
    this.conflict = false;
    this.cancelConfirmation = false;
    this.reloadConfirmation = false;
    this.loadErrorMessage = '';
    this.errorMessage = '';
    this.saveMessage = '';
    this.saveState = 'clean';
    this.originalValues = this.emptyProjectValues();
    this.projectForm.reset(this.emptyProjectValues());
    this.projectForm.markAsPristine();
    this.projectForm.markAsUntouched();
    this.updateEndDateState();
    this.editSession.setDirty(false);

    if (!profileId) {
      this.isLoading = false;
      this.loadErrorMessage = 'This Project route is missing its Profile context.';
      return;
    }

    this.context.loadSummaries();
    const currentProfile = this.context.detail();
    if (this.context.selectedId() === profileId && currentProfile && String(currentProfile.id) === profileId) {
      this.loadProjects(profileId);
      return;
    }

    const generation = this.listGeneration;
    this.context.reloadDetail(profileId).subscribe({
      next: () => {
        if (this.profileId !== profileId || this.listGeneration !== generation) return;
        this.loadProjects(profileId);
      },
      error: (error: unknown) => {
        if (this.profileId !== profileId || this.listGeneration !== generation) return;
        this.isLoading = false;
        this.loadErrorMessage = this.apiError(error)?.message?.trim() || 'Unable to load this Profile right now. Please try again.';
      },
    });
  }

  private resetCreateAfterSave(): void {
    this.requestGeneration++;
    this.editorMode = 'create';
    this.projectId = null;
    this.project = null;
    this.savedProject = null;
    this.conflict = false;
    this.cancelConfirmation = false;
    this.reloadConfirmation = false;
    this.errorMessage = '';
    this.saveMessage = '';
    this.saveState = 'clean';
    const values = this.emptyProjectValues();
    this.originalValues = values;
    this.projectForm.reset(values);
    this.projectForm.markAsPristine();
    this.projectForm.markAsUntouched();
    this.updateEndDateState();
    this.editSession.setDirty(false);
    document.getElementById('project-name')?.focus();
  }

  private loadProjects(profileId: string): void {
    this.projectListCancel.next();
    const generation = ++this.listGeneration;
    this.isLoading = true;
    this.loadErrorMessage = '';
    this.profileService.listProjects(profileId).pipe(takeUntil(this.projectListCancel)).subscribe({
      next: (projects) => {
        if (!this.isCurrentProjectList(profileId, generation)) return;
        const selected = this.editorMode === 'edit'
          ? projects.find((project) => String(project.id) === String(this.projectId)) ?? null
          : null;
        if (this.editorMode === 'edit' && !selected) {
          this.isLoading = false;
          this.loadErrorMessage = 'This Project is no longer available in the selected Profile.';
          return;
        }
        this.initializeEditor(selected);
      },
      error: (error: unknown) => {
        if (!this.isCurrentProjectList(profileId, generation)) return;
        this.isLoading = false;
        if (this.isReloading) {
          this.isReloading = false;
          this.conflict = true;
          this.saveState = 'conflict';
          this.errorMessage = this.apiError(error)?.message?.trim() || 'Unable to reload the latest Project right now. Please try again.';
        } else {
          this.loadErrorMessage = this.apiError(error)?.message?.trim() || 'Unable to load this Project right now. Please try again.';
        }
      },
    });
  }

  private initializeEditor(project: Project | null): void {
    const reloaded = this.isReloading;
    this.project = project;
    const values = project ? this.formValues(project) : this.emptyProjectValues();
    this.originalValues = this.normalizeProjectValues(values);
    this.projectForm.reset(values);
    this.projectForm.markAsPristine();
    this.projectForm.markAsUntouched();
    this.updateEndDateState();
    this.isLoading = false;
    this.isReloading = false;
    this.conflict = false;
    this.errorMessage = '';
    this.saveState = 'clean';
    this.saveMessage = reloaded ? 'Latest Profile and Project data loaded. Review it before editing.' : '';
    this.editSession.setDirty(false);
  }

  private fetchLatest(): void {
    const profileId = this.profileId;
    if (!profileId) return;

    this.isReloading = true;
    this.errorMessage = '';
    this.saveMessage = '';
    this.requestGeneration++;
    this.context.reloadDetail(profileId).subscribe({
      next: () => {
        if (!this.isCurrentProfile(profileId)) return;
        this.loadProjects(profileId);
      },
      error: (error: unknown) => {
        if (!this.isCurrentProfile(profileId)) return;
        this.isReloading = false;
        this.conflict = true;
        this.saveState = 'conflict';
        this.errorMessage = this.apiError(error)?.message?.trim() || 'Unable to reload the latest Profile right now. Please try again.';
      },
    });
  }

  private handleSaveError(error: unknown): void {
    this.isSubmitting = false;
    const response = this.apiError(error);
    if (response?.errorCode === 'PROFILE_VERSION_CONFLICT') {
      this.conflict = true;
      this.saveState = 'conflict';
      this.errorMessage = response.message?.trim() || 'This Profile changed elsewhere. Reload the latest version before saving again.';
      this.syncDirtyState();
      return;
    }
    if (response?.errorCode === 'VALIDATION_ERROR') {
      this.applyFieldErrors(response.data);
      this.errorMessage = 'Please correct the highlighted fields.';
      this.syncDirtyState();
      this.saveState = 'failure';
      return;
    }

    const businessField: Record<string, EditableProjectField> = {
      PROJECT_INVALID_STATUS: 'status',
      PROJECT_END_DATE_REQUIRED: 'endDate',
      PROJECT_DATE_RANGE_INVALID: 'endDate',
    };
    const field = response?.errorCode ? businessField[response.errorCode] : undefined;
    if (field) this.setBackendFieldError(field, response?.message || 'This value is not valid.');
    this.errorMessage = response?.message?.trim() || 'Unable to save this Project right now. Your changes are still here.';
    this.syncDirtyState();
    this.saveState = 'failure';
  }

  private trimProjectFormValues(): void {
    const value = this.projectForm.getRawValue();
    this.projectForm.patchValue({
      name: value.name.trim(),
      description: value.description.trim(),
      startDate: value.startDate.trim(),
      endDate: value.endDate.trim(),
      position: value.position.trim(),
      responsibilities: value.responsibilities.trim(),
      programmingLanguages: value.programmingLanguages.trim(),
      tools: value.tools.trim(),
    }, { emitEvent: false });
    this.projectForm.updateValueAndValidity({ emitEvent: false });
  }

  private applyFieldErrors(data: unknown): void {
    const errors = (data as { errors?: unknown } | undefined)?.errors;
    if (!Array.isArray(errors)) return;
    for (const error of errors) {
      if (!error || typeof error !== 'object') continue;
      const { field, message } = error as { field?: unknown; message?: unknown };
      const normalizedField = typeof field === 'string' ? field.split('.').pop() : undefined;
      if (normalizedField && typeof message === 'string' && normalizedField in this.projectForm.controls) {
        this.setBackendFieldError(normalizedField as EditableProjectField, message);
      }
    }
  }

  private clearBackendErrors(): void {
    for (const control of Object.values(this.projectForm.controls)) {
      if (!control.errors?.['backend']) continue;
      const errors = { ...control.errors };
      delete errors['backend'];
      control.setErrors(Object.keys(errors).length ? errors : null);
    }
  }

  private setBackendFieldError(field: EditableProjectField, message: string): void {
    const control = this.projectForm.controls[field];
    control.setErrors({ ...control.errors, backend: message.trim() || 'This value is not valid.' });
    control.markAsTouched();
  }

  private emptyProjectValues(): EditableProjectValues {
    return {
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      status: 'ONGOING',
      position: '',
      teamSize: null,
      responsibilities: '',
      programmingLanguages: '',
      tools: '',
    };
  }

  private formValues(project: Project): EditableProjectValues {
    return {
      name: project.name,
      description: project.description,
      startDate: project.startDate ?? '',
      endDate: project.endDate ?? '',
      status: project.status,
      position: project.position,
      teamSize: project.teamSize,
      responsibilities: project.responsibilities ?? '',
      programmingLanguages: project.programmingLanguages ?? '',
      tools: project.tools ?? '',
    };
  }

  private normalizeProjectValues(value: EditableProjectValues): EditableProjectValues {
    const rawTeamSize = value.teamSize as number | string | null;
    const teamSize = rawTeamSize === null || rawTeamSize === '' ? null : Number(rawTeamSize);
    return {
      name: value.name.trim(),
      description: value.description.trim(),
      startDate: value.startDate.trim(),
      endDate: value.endDate.trim(),
      status: value.status,
      position: value.position.trim(),
      teamSize: Number.isNaN(teamSize) ? null : teamSize,
      responsibilities: value.responsibilities.trim(),
      programmingLanguages: value.programmingLanguages.trim(),
      tools: value.tools.trim(),
    };
  }

  private projectDateRangeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value as Partial<EditableProjectValues> | null;
      if (value?.status === 'COMPLETED' && value.startDate && value.endDate && value.startDate > value.endDate) {
        return { dateRange: true };
      }
      return null;
    };
  }

  private projectStatusValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => control.value === 'ONGOING' || control.value === 'COMPLETED'
      ? null
      : { invalidStatus: true };
  }

  private wholeNumberValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (value === null || value === '') return null;
      const number = Number(value);
      return Number.isInteger(number) && number >= 1 ? null : { wholeNumber: true };
    };
  }

  private updateEndDateState(): void {
    const endDate = this.projectForm.controls.endDate;
    const ongoing = this.projectForm.controls.status.value === 'ONGOING';
    if (ongoing) {
      endDate.setValue('', { emitEvent: false });
      endDate.setValidators([]);
      endDate.disable({ emitEvent: false });
    } else {
      endDate.setValidators([Validators.required]);
      endDate.enable({ emitEvent: false });
    }
    endDate.updateValueAndValidity({ emitEvent: false });
    this.projectForm.updateValueAndValidity({ emitEvent: false });
  }

  private isCurrentProfile(profileId: string): boolean {
    return this.profileId === profileId
      && this.context.selectedId() === profileId
      && String(this.context.detail()?.id) === profileId;
  }

  private isCurrentProjectList(profileId: string, generation: number): boolean {
    return this.isCurrentProfile(profileId) && this.listGeneration === generation;
  }

  private isCurrentOperation(profileId: string, generation: number): boolean {
    return this.isCurrentProfile(profileId) && this.requestGeneration === generation;
  }

  private syncDirtyState(): void {
    const dirty = this.projectForm.dirty || this.hasProjectChanges();
    this.editSession.setDirty(dirty);
    if (this.isSubmitting) return;
    if (this.conflict) {
      this.saveState = 'conflict';
    } else if (dirty && this.saveState !== 'failure') {
      this.saveState = 'dirty';
    } else if (this.saveState !== 'saved') {
      this.saveState = 'clean';
    }
  }

  private apiError(error: unknown): ApiErrorResponse | undefined {
    return error instanceof HttpErrorResponse ? error.error as ApiErrorResponse : undefined;
  }
}
