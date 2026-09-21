import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';

import { ProfileDetail, Project } from '../../models/profile.models';
import { ProfileContextService } from '../../services/profile-context.service';
import { ProfileEditSessionService } from '../../services/profile-edit-session.service';
import { ProfileService } from '../../services/profile.service';
import { ProjectEditorComponent } from './project-editor.component';

describe('ProjectEditorComponent', () => {
  let fixture: ComponentFixture<ProjectEditorComponent>;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let router: { navigate: jasmine.Spy };
  let context: {
    summaries: ReturnType<typeof signal>;
    selectedId: ReturnType<typeof signal>;
    detail: ReturnType<typeof signal>;
    loadSummaries: jasmine.Spy;
    reloadDetail: jasmine.Spy;
    applyMutationVersion: jasmine.Spy;
  };
  let profiles: { listProjects: jasmine.Spy; createProject: jasmine.Spy; updateProject: jasmine.Spy };

  const detail: ProfileDetail = {
    id: 1,
    profileName: 'Backend CV',
    firstName: 'A',
    lastName: 'User',
    jobTitle: 'Engineer',
    updatedAt: '2026-01-01',
    yearsOfExperience: 5,
    personality: 'Methodical',
    technicalSummary: 'Angular and Java',
    hasPreviewed: true,
    version: 3,
    createdAt: '2026-01-01',
  };
  const project: Project = {
    id: 1,
    name: 'Order Platform',
    description: 'Modernized order flow',
    startDate: '2025-01-01',
    endDate: null,
    status: 'ONGOING',
    position: 'Backend Lead',
    teamSize: 5,
    responsibilities: 'Design services\nReview incidents',
    programmingLanguages: 'Java\nSQL',
    tools: 'Kafka',
  };

  beforeEach(async () => {
    params = new BehaviorSubject(convertToParamMap({ profileId: '1' }));
    router = { navigate: jasmine.createSpy('navigate') };
    profiles = {
      listProjects: jasmine.createSpy('listProjects').and.returnValue(of([project])),
      createProject: jasmine.createSpy('createProject'),
      updateProject: jasmine.createSpy('updateProject'),
    };
    context = {
      summaries: signal([]),
      selectedId: signal('1'),
      detail: signal<ProfileDetail | null>(detail),
      loadSummaries: jasmine.createSpy('loadSummaries'),
      reloadDetail: jasmine.createSpy('reloadDetail').and.returnValue(of(detail)),
      applyMutationVersion: jasmine.createSpy('applyMutationVersion').and.returnValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [ProjectEditorComponent],
      providers: [
        { provide: ProfileService, useValue: profiles },
        { provide: ProfileContextService, useValue: context },
        { provide: ActivatedRoute, useValue: { paramMap: params } },
        { provide: Router, useValue: router },
        ProfileEditSessionService,
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ProjectEditorComponent);
    fixture.detectChanges();
  });

  function openEdit(): void {
    params.next(convertToParamMap({ profileId: '1', projectId: '1' }));
    fixture.detectChanges();
  }

  function fillProjectDraft(overrides: Partial<{
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    status: 'ONGOING' | 'COMPLETED';
    position: string;
    teamSize: number | null;
    responsibilities: string;
    programmingLanguages: string;
    tools: string;
  }> = {}): void {
    fixture.componentInstance.projectForm.patchValue({
      name: 'Order Platform',
      description: 'Modernized order flow',
      startDate: '2025-01-01',
      endDate: '',
      status: 'ONGOING',
      position: 'Backend Lead',
      teamSize: null,
      responsibilities: 'Design services\nReview incidents',
      programmingLanguages: 'Java\nSQL',
      tools: 'Kafka',
      ...overrides,
    });
    fixture.componentInstance.projectForm.markAsDirty();
    fixture.detectChanges();
  }

  it('uses one form structure for create and edit and populates edit data from the canonical list response', () => {
    expect(fixture.componentInstance.editorMode).toBe('create');
    expect(fixture.nativeElement.querySelector('#project-form')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('#project-form input, #project-form textarea, #project-form select').length).toBe(10);
    expect(fixture.nativeElement.querySelector('#project-editor-title')?.textContent).toContain('Add Project');

    openEdit();

    expect(fixture.componentInstance.editorMode).toBe('edit');
    expect(fixture.componentInstance.project).toEqual(project);
    expect(fixture.componentInstance.projectForm.getRawValue()).toEqual({
      name: project.name,
      description: project.description,
      startDate: project.startDate ?? '',
      endDate: '',
      status: project.status,
      position: project.position,
      teamSize: project.teamSize,
      responsibilities: project.responsibilities ?? '',
      programmingLanguages: project.programmingLanguages ?? '',
      tools: project.tools ?? '',
    });
    expect(fixture.nativeElement.querySelector('#project-editor-title')?.textContent).toContain('Edit Order Platform');
  });

  it('requires Name, Description, and Position and enforces the confirmed text limits', () => {
    fixture.componentInstance.submit();

    expect(profiles.createProject).not.toHaveBeenCalled();
    expect(fixture.componentInstance.projectForm.controls.name.touched).toBeTrue();
    expect(fixture.componentInstance.projectForm.controls.description.touched).toBeTrue();
    expect(fixture.componentInstance.projectForm.controls.position.touched).toBeTrue();

    fillProjectDraft({ name: 'x'.repeat(256), position: 'x'.repeat(256) });
    fixture.componentInstance.submit();

    expect(profiles.createProject).not.toHaveBeenCalled();
    expect(fixture.componentInstance.projectForm.controls.name.errors?.['maxlength']).toBeTruthy();
    expect(fixture.componentInstance.projectForm.controls.position.errors?.['maxlength']).toBeTruthy();
  });

  it('keeps Start Date optional, validates whole-number Team Size, and allows an omitted Team Size', () => {
    fillProjectDraft({ startDate: '', teamSize: 0 });
    fixture.componentInstance.submit();
    expect(profiles.createProject).not.toHaveBeenCalled();
    expect(fixture.componentInstance.projectForm.controls.teamSize.errors?.['wholeNumber']).toBeTrue();

    fillProjectDraft({ startDate: '', teamSize: 1.5 });
    fixture.componentInstance.submit();
    expect(profiles.createProject).not.toHaveBeenCalled();
    expect(fixture.componentInstance.projectForm.controls.teamSize.errors?.['wholeNumber']).toBeTrue();

    const created = { ...project, id: 2, teamSize: null, startDate: null };
    profiles.createProject.and.returnValue(of({ project: created, profileVersion: 4 }));
    fillProjectDraft({ startDate: '', teamSize: null });
    fixture.componentInstance.submit();

    expect(profiles.createProject).toHaveBeenCalledWith('1', jasmine.objectContaining({ startDate: null, teamSize: null }));
  });

  it('requires a completed End Date and rejects a completed range in reverse order', () => {
    fillProjectDraft({ status: 'COMPLETED', startDate: '2025-03-01', endDate: '' });
    expect(fixture.componentInstance.projectForm.controls.endDate.enabled).toBeTrue();
    fixture.componentInstance.submit();
    expect(profiles.createProject).not.toHaveBeenCalled();
    expect(fixture.componentInstance.projectForm.controls.endDate.errors?.['required']).toBeTrue();

    fillProjectDraft({ status: 'COMPLETED', startDate: '2025-03-01', endDate: '2025-02-01' });
    fixture.componentInstance.submit();
    expect(profiles.createProject).not.toHaveBeenCalled();
    expect(fixture.componentInstance.projectForm.errors?.['dateRange']).toBeTrue();
    expect(fixture.componentInstance.projectFieldError('endDate')).toContain('on or after');
  });

  it('clears a Project End Date when switching to Ongoing and does not restore it for Completed', () => {
    fillProjectDraft({ status: 'COMPLETED', startDate: '2025-03-01', endDate: '2025-06-01' });

    fixture.componentInstance.projectForm.controls.status.setValue('ONGOING');
    expect(fixture.componentInstance.projectForm.controls.endDate.value).toBe('');
    expect(fixture.componentInstance.projectForm.controls.endDate.disabled).toBeTrue();

    fixture.componentInstance.projectForm.controls.status.setValue('COMPLETED');
    expect(fixture.componentInstance.projectForm.controls.endDate.value).toBe('');
    expect(fixture.componentInstance.projectForm.controls.endDate.enabled).toBeTrue();
    expect(fixture.componentInstance.projectForm.controls.endDate.errors?.['required']).toBeTrue();
  });

  it('disables ongoing End Date, sends exact LocalDate values, preserves multiline text, and keeps technologies free text', () => {
    const created: Project = { ...project, id: 8, name: 'Canonical Project', startDate: '2025-02-03', teamSize: null };
    profiles.createProject.and.returnValue(of({ project: created, profileVersion: 4 }));
    fillProjectDraft({
      name: '  Draft Project  ',
      description: '  Description  ',
      startDate: '2025-02-03',
      endDate: '2026-02-04',
      status: 'ONGOING',
      position: '  Technical Lead  ',
      teamSize: null,
      responsibilities: 'Line one\nLine two',
      programmingLanguages: 'Java\nSQL',
      tools: 'Kafka\nPostgreSQL',
    });

    expect(fixture.componentInstance.projectForm.controls.endDate.disabled).toBeTrue();
    fixture.componentInstance.submit();

    expect(profiles.createProject).toHaveBeenCalledWith('1', {
      name: 'Draft Project',
      description: 'Description',
      startDate: '2025-02-03',
      endDate: null,
      status: 'ONGOING',
      position: 'Technical Lead',
      teamSize: null,
      responsibilities: 'Line one\nLine two',
      programmingLanguages: 'Java\nSQL',
      tools: 'Kafka\nPostgreSQL',
      version: 3,
    });
    expect(context.applyMutationVersion).toHaveBeenCalledWith('1', 4);
    expect(fixture.componentInstance.savedProject).toEqual(created);
    expect(fixture.componentInstance.saveState).toBe('saved');
    expect(fixture.componentInstance.editSession.dirty()).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/profiles', '1']);
  });

  it('prevents duplicate saves and preserves a retryable draft after an ordinary failure', () => {
    const pending = new Subject<{ project: Project; profileVersion: number }>();
    profiles.createProject.and.returnValue(pending);
    fillProjectDraft({ name: 'Pending Project' });
    fixture.componentInstance.submit();
    fixture.componentInstance.submit();

    expect(profiles.createProject).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.isSubmitting).toBeTrue();
    pending.next({ project: { ...project, name: 'Pending Project' }, profileVersion: 4 });
    pending.complete();

    profiles.createProject.and.returnValue(throwError(() => new HttpErrorResponse({ status: 503, error: { message: 'Service unavailable' } })));
    fillProjectDraft({ name: 'Retryable Project' });
    fixture.componentInstance.submit();

    expect(fixture.componentInstance.isSubmitting).toBeFalse();
    expect(fixture.componentInstance.saveState).toBe('failure');
    expect(fixture.componentInstance.projectForm.controls.name.value).toBe('Retryable Project');
    expect(fixture.componentInstance.projectForm.dirty).toBeTrue();
    expect(fixture.componentInstance.editSession.dirty()).toBeTrue();
    expect(fixture.componentInstance.errorMessage).toBe('Service unavailable');
  });

  it('maps Project validation and business errors to fields while preserving the draft', () => {
    profiles.createProject.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { errorCode: 'VALIDATION_ERROR', data: { errors: [{ field: 'project.name', message: 'Name is invalid' }] } } })));
    fillProjectDraft({ name: 'Entered Project' });
    fixture.componentInstance.submit();
    expect(fixture.componentInstance.projectForm.controls.name.errors?.['backend']).toBe('Name is invalid');

    profiles.createProject.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { errorCode: 'PROJECT_END_DATE_REQUIRED', message: 'End Date is required.' } })));
    fixture.componentInstance.submit();
    expect(fixture.componentInstance.projectForm.controls.endDate.errors?.['backend']).toBe('End Date is required.');
    expect(fixture.componentInstance.editorMode).toBe('create');
  });

  it('preserves a conflict draft and reloads the latest Profile and canonical Project after confirmation', () => {
    openEdit();
    const reload = new Subject<ProfileDetail>();
    const refreshedProjects = new Subject<Project[]>();
    context.reloadDetail.and.returnValue(reload);
    profiles.listProjects.and.returnValue(refreshedProjects);
    profiles.updateProject.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'PROFILE_VERSION_CONFLICT', message: 'Profile changed elsewhere.' } })));
    fixture.componentInstance.projectForm.controls.name.setValue('Conflict Draft');
    fixture.componentInstance.projectForm.markAsDirty();
    fixture.componentInstance.submit();

    expect(fixture.componentInstance.conflict).toBeTrue();
    expect(fixture.componentInstance.saveState).toBe('conflict');
    expect(fixture.componentInstance.projectForm.controls.name.value).toBe('Conflict Draft');

    fixture.componentInstance.reloadLatest();
    expect(fixture.componentInstance.reloadConfirmation).toBeTrue();
    fixture.componentInstance.keepEditing();
    expect(fixture.componentInstance.conflict).toBeTrue();
    fixture.componentInstance.reloadLatest();
    fixture.componentInstance.confirmReloadLatest();
    expect(context.reloadDetail).toHaveBeenCalledWith('1');

    const latest = { ...project, name: 'Latest Project' };
    reload.next({ ...detail, version: 4 });
    refreshedProjects.next([latest]);
    fixture.detectChanges();

    expect(fixture.componentInstance.conflict).toBeFalse();
    expect(fixture.componentInstance.project).toEqual(latest);
    expect(fixture.componentInstance.projectForm.controls.name.value).toBe('Latest Project');
    expect(fixture.componentInstance.saveMessage).toContain('Latest Profile and Project data loaded');
    expect(fixture.componentInstance.editSession.dirty()).toBeFalse();
  });

  it('protects dirty cancellation and route navigation with Keep Editing and Discard actions', () => {
    fillProjectDraft({ name: 'Unsaved Project' });
    fixture.componentInstance.cancelEditing();
    expect(fixture.componentInstance.cancelConfirmation).toBeTrue();
    fixture.componentInstance.keepEditing();
    expect(fixture.componentInstance.cancelConfirmation).toBeFalse();
    expect(fixture.componentInstance.editSession.dirty()).toBeTrue();

    const navigation = fixture.componentInstance.editSession.requestNavigation('/profiles/2');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Your unsaved Project changes will be discarded');
    fixture.componentInstance.keepPendingNavigation();
    expect(fixture.componentInstance.editSession.dirty()).toBeTrue();

    fixture.componentInstance.discardPendingNavigation();
    expect(fixture.componentInstance.editSession.dirty()).toBeFalse();
    void navigation;
  });

  it('ignores stale Project list and mutation responses after Profile switching', () => {
    const first = new Subject<Project[]>();
    const second = new Subject<Project[]>();
    profiles.listProjects.calls.reset();
    profiles.listProjects.and.returnValues(first, second);
    params.next(convertToParamMap({ profileId: '1', projectId: '1' }));
    context.selectedId.set('2');
    context.detail.set({ ...detail, id: 2 });
    params.next(convertToParamMap({ profileId: '2', projectId: '2' }));
    first.next([project]);
    expect(fixture.componentInstance.project).toBeNull();
    const other = { ...project, id: 2, name: 'Other Profile Project' };
    second.next([other]);
    expect(fixture.componentInstance.project).toEqual(other);

    context.selectedId.set('1');
    context.detail.set(detail);
    profiles.listProjects.and.returnValue(of([project]));
    params.next(convertToParamMap({ profileId: '1', projectId: '1' }));
    const pending = new Subject<{ project: Project; profileVersion: number }>();
    profiles.updateProject.and.returnValue(pending);
    fixture.componentInstance.projectForm.controls.name.setValue('Pending Project');
    fixture.componentInstance.projectForm.markAsDirty();
    fixture.componentInstance.submit();
    context.selectedId.set('2');
    context.detail.set({ ...detail, id: 2 });
    params.next(convertToParamMap({ profileId: '2', projectId: '2' }));
    pending.next({ project: other, profileVersion: 4 });

    expect(context.applyMutationVersion).not.toHaveBeenCalledWith('1', 4);
  });
});
