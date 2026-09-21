import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';

import { NotificationService } from '../../../../core/notifications/notification.service';
import { Certificate, Education, LanguageMasterPage, ProfileDetail, ProfileLanguage, ProfileSkill, ProfileSummary, Project, SkillMasterPage } from '../../models/profile.models';
import { ProfileContextService } from '../../services/profile-context.service';
import { ProfileService } from '../../services/profile.service';
import { ProfileWorkspaceComponent } from './profile-workspace.component';

describe('ProfileWorkspaceComponent', () => {
  let fixture: ComponentFixture<ProfileWorkspaceComponent>;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let router: { navigate: jasmine.Spy };
  let context: {
    summaries: ReturnType<typeof signal>;
    summariesLoading: ReturnType<typeof signal>;
    summariesError: ReturnType<typeof signal>;
    selectedId: ReturnType<typeof signal>;
    detail: ReturnType<typeof signal>;
    detailLoading: ReturnType<typeof signal>;
    detailError: ReturnType<typeof signal>;
    loadSummaries: jasmine.Spy;
    loadDetail: jasmine.Spy;
    reloadDetail: jasmine.Spy;
    beginSelection: jasmine.Spy;
    replaceDetail: jasmine.Spy;
    refreshSummariesAndSelectFirst: jasmine.Spy;
    applyMutationVersion: jasmine.Spy;
    isNotFound: jasmine.Spy;
  };
  let notifications: { showSuccess: jasmine.Spy };
  let profiles: { update: jasmine.Spy; delete: jasmine.Spy; listEducations: jasmine.Spy; createEducation: jasmine.Spy; updateEducation: jasmine.Spy; deleteEducation: jasmine.Spy; listProfileLanguages: jasmine.Spy; createProfileLanguage: jasmine.Spy; updateProfileLanguage: jasmine.Spy; deleteProfileLanguage: jasmine.Spy; listCertificates: jasmine.Spy; createCertificate: jasmine.Spy; updateCertificate: jasmine.Spy; deleteCertificate: jasmine.Spy; listProjects: jasmine.Spy; deleteProject: jasmine.Spy; listProfileSkills: jasmine.Spy; createProfileSkill: jasmine.Spy; updateProfileSkill: jasmine.Spy; deleteProfileSkill: jasmine.Spy; listLanguageMaster: jasmine.Spy; listSkillMaster: jasmine.Spy };

  const summary: ProfileSummary = { id: 1, profileName: 'Backend CV', firstName: 'A', lastName: 'User', jobTitle: 'Engineer', updatedAt: '2026-01-01' };
  const detail: ProfileDetail = { ...summary, yearsOfExperience: 5, personality: 'Methodical', technicalSummary: 'Angular and Java', hasPreviewed: true, version: 3, createdAt: '2026-01-01' };
  const education: Education = { id: 1, schoolName: 'North University', degree: 'BSc Computer Science', fieldOfStudy: 'Computing', startDate: '2020-09-01', endDate: null, status: 'ONGOING' };
  const language: ProfileLanguage = { profileLanguageId: 1, languageId: 2, languageName: 'English', level: 'ADVANCED' };
  const certificate: Certificate = { id: 1, certificateName: 'AWS Developer', issueDate: '2025-04-01' };
  const project: Project = { id: 1, name: 'Order Platform', description: 'Modernized order flow', startDate: '2025-01-01', endDate: null, status: 'ONGOING', position: 'Backend Lead', teamSize: 5, responsibilities: 'Design services\nReview incidents', programmingLanguages: 'Java', tools: 'Kafka' };
  const skill: ProfileSkill = { profileSkillId: 1, skillId: 2, skillName: 'Java', categoryId: 1, categoryCode: 'BACKEND', categoryName: 'Backend', experienceYears: 7.5, lastUsed: '2025-04-01' };
  const languageMasterPage: LanguageMasterPage = { content: [{ id: 2, name: 'English' }, { id: 3, name: 'Japanese' }], page: 0, size: 10, totalElements: 2, totalPages: 1 };
  const skillMasterPage: SkillMasterPage = { content: [{ id: 2, name: 'Java', categoryId: 1, categoryCode: 'BACKEND', categoryName: 'Backend' }, { id: 3, name: 'TypeScript', categoryId: 2, categoryCode: 'FRONTEND', categoryName: 'Frontend' }], page: 0, size: 10, totalElements: 2, totalPages: 1 };

  beforeEach(async () => {
    params = new BehaviorSubject(convertToParamMap({ profileId: '1' }));
    profiles = {
      update: jasmine.createSpy('update'),
      delete: jasmine.createSpy('delete'),
      listEducations: jasmine.createSpy('listEducations').and.returnValue(of([])),
      createEducation: jasmine.createSpy('createEducation'),
      updateEducation: jasmine.createSpy('updateEducation'),
      deleteEducation: jasmine.createSpy('deleteEducation'),
      listProfileLanguages: jasmine.createSpy('listProfileLanguages').and.returnValue(of([])),
      createProfileLanguage: jasmine.createSpy('createProfileLanguage'),
      updateProfileLanguage: jasmine.createSpy('updateProfileLanguage'),
      deleteProfileLanguage: jasmine.createSpy('deleteProfileLanguage'),
      listCertificates: jasmine.createSpy('listCertificates').and.returnValue(of([])),
      createCertificate: jasmine.createSpy('createCertificate'),
      updateCertificate: jasmine.createSpy('updateCertificate'),
      deleteCertificate: jasmine.createSpy('deleteCertificate'),
      listProjects: jasmine.createSpy('listProjects').and.returnValue(of([])),
      deleteProject: jasmine.createSpy('deleteProject'),
      listProfileSkills: jasmine.createSpy('listProfileSkills').and.returnValue(of([])),
      createProfileSkill: jasmine.createSpy('createProfileSkill'),
      updateProfileSkill: jasmine.createSpy('updateProfileSkill'),
      deleteProfileSkill: jasmine.createSpy('deleteProfileSkill'),
      listLanguageMaster: jasmine.createSpy('listLanguageMaster').and.returnValue(of(languageMasterPage)),
      listSkillMaster: jasmine.createSpy('listSkillMaster').and.returnValue(of(skillMasterPage)),
    };
    router = { navigate: jasmine.createSpy('navigate') };
    notifications = { showSuccess: jasmine.createSpy('showSuccess') };
    context = {
      summaries: signal([summary]),
      summariesLoading: signal(false),
      summariesError: signal(null),
      selectedId: signal('1'),
      detail: signal<ProfileDetail | null>(detail),
      detailLoading: signal(false),
      detailError: signal(null),
      loadSummaries: jasmine.createSpy('loadSummaries'),
      loadDetail: jasmine.createSpy('loadDetail'),
      reloadDetail: jasmine.createSpy('reloadDetail'),
      beginSelection: jasmine.createSpy('beginSelection'),
      replaceDetail: jasmine.createSpy('replaceDetail'),
      refreshSummariesAndSelectFirst: jasmine.createSpy('refreshSummariesAndSelectFirst'),
      applyMutationVersion: jasmine.createSpy('applyMutationVersion').and.returnValue(true),
      isNotFound: jasmine.createSpy('isNotFound').and.returnValue(false),
    };
    await TestBed.configureTestingModule({
      imports: [ProfileWorkspaceComponent],
      providers: [
        { provide: ProfileService, useValue: profiles },
        { provide: ProfileContextService, useValue: context },
        { provide: ActivatedRoute, useValue: { paramMap: params } },
        { provide: Router, useValue: router },
        { provide: NotificationService, useValue: notifications },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ProfileWorkspaceComponent);
    fixture.detectChanges();
  });

  function openEditor(): void {
    fixture.componentInstance.startEditing();
    fixture.detectChanges();
  }

  function markDraft(): void {
    fixture.componentInstance.editForm.controls.firstName.setValue('Changed');
    fixture.componentInstance.editForm.markAsDirty();
    fixture.detectChanges();
  }

  function openEducationCreate(): void {
    fixture.componentInstance.startEducationCreate();
    fixture.detectChanges();
  }

  function fillEducationDraft(overrides: Partial<{ schoolName: string; degree: string; fieldOfStudy: string; startDate: string; endDate: string; status: 'ONGOING' | 'COMPLETED' }> = {}): void {
    fixture.componentInstance.educationForm.patchValue({
      schoolName: 'North University',
      degree: 'BSc Computer Science',
      fieldOfStudy: 'Computing',
      startDate: '2020-09-01',
      endDate: '',
      status: 'ONGOING',
      ...overrides,
    });
    fixture.componentInstance.educationForm.markAsDirty();
    fixture.detectChanges();
  }

  function openCertificateCreate(): void {
    fixture.componentInstance.startCertificateCreate();
    fixture.detectChanges();
  }

  function fillCertificateDraft(overrides: Partial<{ certificateName: string; issueDate: string }> = {}): void {
    fixture.componentInstance.certificateForm.patchValue({
      certificateName: 'AWS Developer',
      issueDate: '2025-04-01',
      ...overrides,
    });
    fixture.componentInstance.certificateForm.markAsDirty();
    fixture.detectChanges();
  }

  function openSkillCreate(): void {
    fixture.componentInstance.startSkillCreate();
    fixture.detectChanges();
  }

  function fillSkillDraft(overrides: Partial<{ skillId: number | string | null; experienceYears: number | null; lastUsed: string }> = {}): void {
    const skillId = overrides.skillId === undefined ? 2 : overrides.skillId;
    if (skillId === null) {
      fixture.componentInstance.clearSkillMasterInput();
    } else {
      const option = fixture.componentInstance.skillMasterOptions.find((item) => String(item.id) === String(skillId));
      if (option) fixture.componentInstance.selectSkillMasterOption(option);
    }
    fixture.componentInstance.skillForm.patchValue({
      experienceYears: 7.5,
      lastUsed: '2025-04-01',
      ...overrides,
    });
    fixture.componentInstance.skillForm.markAsDirty();
    fixture.detectChanges();
  }

  it('loads the Profile selected by the route parameter', () => {
    expect(context.loadSummaries).toHaveBeenCalled();
    expect(context.loadDetail).toHaveBeenCalledWith('1');
  });

  it('keeps route-driven switching delegated to the Profile context', () => {
    params.next(convertToParamMap({ profileId: '2' }));

    expect(context.loadDetail).toHaveBeenCalledWith('2');
    expect(context.beginSelection).not.toHaveBeenCalledWith(null);
  });

  it('renders About Me with Profile Name read-only and prefills six editable fields', () => {
    openEditor();

    expect(fixture.nativeElement.querySelector('.edit-about-button')).toBeNull();
    expect(fixture.nativeElement.querySelector('.readonly-value')?.textContent).toContain('Backend CV');
    expect(fixture.nativeElement.querySelectorAll('.about-editor input, .about-editor textarea').length).toBe(6);
    expect(fixture.componentInstance.editForm.getRawValue()).toEqual({ firstName: 'A', lastName: 'User', jobTitle: 'Engineer', yearsOfExperience: 5, personality: 'Methodical', technicalSummary: 'Angular and Java' });
  });

  it('does not update a pristine About Me edit', () => {
    openEditor();

    expect((fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBeTrue();
    fixture.componentInstance.submit();

    expect(profiles.update).not.toHaveBeenCalled();
  });

  it('does not update when an edited value is restored to its original value', () => {
    openEditor();
    fixture.componentInstance.editForm.controls.firstName.setValue('Changed');
    fixture.componentInstance.editForm.controls.firstName.setValue('A');
    fixture.componentInstance.editForm.markAsDirty();
    fixture.detectChanges();

    expect((fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBeTrue();
    fixture.componentInstance.submit();

    expect(profiles.update).not.toHaveBeenCalled();
  });

  it('does not update when a value differs only by surrounding whitespace', () => {
    openEditor();
    fixture.componentInstance.editForm.controls.firstName.setValue('  A  ');
    fixture.componentInstance.editForm.markAsDirty();
    fixture.detectChanges();

    expect((fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBeTrue();
    fixture.componentInstance.submit();

    expect(profiles.update).not.toHaveBeenCalled();
  });

  it('allows a capitalization change because comparison is case-sensitive', () => {
    profiles.update.and.returnValue(of(detail));
    context.detail.set({ ...detail, firstName: 'dat' });
    openEditor();
    fixture.componentInstance.editForm.controls.firstName.setValue('Dat');
    fixture.componentInstance.editForm.markAsDirty();
    fixture.detectChanges();

    expect((fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBeFalse();
    fixture.componentInstance.submit();

    expect(profiles.update).toHaveBeenCalled();
  });

  it('allows an actual change in the editable About Me values', () => {
    profiles.update.and.returnValue(of(detail));
    openEditor();
    fixture.componentInstance.editForm.setValue({
      firstName: 'Changed',
      lastName: 'Different',
      jobTitle: 'Different title',
      yearsOfExperience: 6,
      personality: 'Different personality',
      technicalSummary: 'Different summary',
    });
    fixture.componentInstance.editForm.markAsDirty();

    fixture.componentInstance.submit();

    expect(profiles.update).toHaveBeenCalled();
  });

  it('prevents a no-op PUT when submit is triggered programmatically on a dirty form', () => {
    openEditor();
    fixture.componentInstance.editForm.controls.firstName.setValue('Changed');
    fixture.componentInstance.editForm.controls.firstName.setValue('A');
    fixture.componentInstance.editForm.markAsDirty();

    fixture.componentInstance.submit();

    expect(profiles.update).not.toHaveBeenCalled();
  });

  it('keeps Job Title and Years of Experience in one context group', () => {
    const group = fixture.nativeElement.querySelector('.fact-group') as HTMLElement;

    expect(group?.textContent).toContain('Job Title');
    expect(group?.textContent).toContain('Years of Experience');
    expect(group?.querySelectorAll('.fact').length).toBe(2);
  });

  it('keeps the four required About Me fields required while optional fields may be empty', () => {
    openEditor();
    fixture.componentInstance.editForm.reset({ firstName: '', lastName: '', jobTitle: '', yearsOfExperience: null as unknown as number, personality: '', technicalSummary: '' });
    fixture.componentInstance.editForm.markAsDirty();

    fixture.componentInstance.submit();

    expect(profiles.update).not.toHaveBeenCalled();
    expect(fixture.componentInstance.editForm.controls.firstName.touched).toBeTrue();
    expect(fixture.componentInstance.editForm.controls.firstName.errors?.['required']).toBeTrue();
    expect(fixture.componentInstance.editForm.controls.lastName.errors?.['required']).toBeTrue();
    expect(fixture.componentInstance.editForm.controls.jobTitle.errors?.['required']).toBeTrue();
    expect(fixture.componentInstance.editForm.controls.yearsOfExperience.errors?.['required']).toBeTrue();
    expect(fixture.componentInstance.editForm.controls.personality.errors).toBeNull();
    expect(fixture.componentInstance.editForm.controls.technicalSummary.errors).toBeNull();
  });

  it('allows either or both optional fields to be cleared and saves trimmed values', () => {
    context.replaceDetail.and.callFake((next: ProfileDetail) => context.detail.set(next));
    const cases = [
      { personality: '', technicalSummary: '  TypeScript  ', savedPersonality: null, savedTechnicalSummary: 'TypeScript' },
      { personality: '  Methodical  ', technicalSummary: '', savedPersonality: 'Methodical', savedTechnicalSummary: null },
      { personality: '   ', technicalSummary: '\t', savedPersonality: null, savedTechnicalSummary: null },
    ];

    cases.forEach((testCase, index) => {
      profiles.update.and.returnValue(of({ ...detail, personality: testCase.savedPersonality, technicalSummary: testCase.savedTechnicalSummary }));
      openEditor();
      fixture.componentInstance.editForm.setValue({ firstName: 'A', lastName: 'User', jobTitle: 'Engineer', yearsOfExperience: 5, personality: testCase.personality, technicalSummary: testCase.technicalSummary });
      fixture.componentInstance.editForm.markAsDirty();

      fixture.componentInstance.submit();

      expect(profiles.update.calls.argsFor(index)).toEqual(['1', { profileName: 'Backend CV', firstName: 'A', lastName: 'User', jobTitle: 'Engineer', yearsOfExperience: 5, personality: testCase.personality.trim(), technicalSummary: testCase.technicalSummary.trim(), version: 3 }]);
    });
  });

  it('keeps optional values over 4000 characters invalid', () => {
    openEditor();
    fixture.componentInstance.editForm.controls.personality.setValue('x'.repeat(4001));
    fixture.componentInstance.editForm.controls.technicalSummary.setValue('x'.repeat(4001));

    fixture.componentInstance.submit();

    expect(profiles.update).not.toHaveBeenCalled();
    expect(fixture.componentInstance.editForm.controls.personality.errors?.['maxlength']).toBeTruthy();
    expect(fixture.componentInstance.editForm.controls.technicalSummary.errors?.['maxlength']).toBeTruthy();
  });

  it('renders missing optional values as not provided', () => {
    context.detail.set({ ...detail, personality: null, technicalSummary: null });
    fixture.detectChanges();

    const longCopy = fixture.nativeElement.querySelector('.long-copy')?.textContent;
    expect(longCopy).toContain('Personality / Characteristic DescriptionNot provided.');
    expect(longCopy).toContain('Technical SummaryNot provided.');
  });

  it('trims values and prevents duplicate submissions', () => {
    const pending = new Subject<ProfileDetail>();
    profiles.update.and.returnValue(pending);
    openEditor();
    fixture.componentInstance.editForm.setValue({ firstName: '  Ada ', lastName: ' Lovelace ', jobTitle: ' Engineer ', yearsOfExperience: 7, personality: ' Analytical ', technicalSummary: ' TypeScript ' });
    fixture.componentInstance.editForm.markAsDirty();

    fixture.componentInstance.submit();
    fixture.componentInstance.submit();

    expect(profiles.update).toHaveBeenCalledTimes(1);
    expect(profiles.update).toHaveBeenCalledWith('1', { profileName: 'Backend CV', firstName: 'Ada', lastName: 'Lovelace', jobTitle: 'Engineer', yearsOfExperience: 7, personality: 'Analytical', technicalSummary: 'TypeScript', version: 3 });
    pending.next(detail);
    pending.complete();
  });

  it('keeps the draft open after ordinary failures and maps backend field errors', () => {
    openEditor();
    markDraft();
    profiles.update.and.returnValue(throwError(() => new HttpErrorResponse({ status: 503, error: { message: 'Service unavailable' } })));

    fixture.componentInstance.submit();

    expect(fixture.componentInstance.isEditing).toBeTrue();
    expect(fixture.componentInstance.editForm.controls.firstName.value).toBe('Changed');
    expect(fixture.componentInstance.errorMessage).toBe('Service unavailable');

    profiles.update.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { errorCode: 'VALIDATION_ERROR', data: { errors: [{ field: 'jobTitle', message: 'Invalid title' }] } } })));
    fixture.componentInstance.submit();
    expect(fixture.componentInstance.editForm.controls.jobTitle.errors?.['backend']).toBe('Invalid title');
    expect(notifications.showSuccess).not.toHaveBeenCalled();
  });

  it('replaces current state and closes with preview-invalidated feedback after success', () => {
    const updated = { ...detail, firstName: 'Updated', version: 4, hasPreviewed: false, updatedAt: '2026-01-02' };
    context.replaceDetail.and.callFake((next: ProfileDetail) => context.detail.set(next));
    profiles.update.and.returnValue(of(updated));
    openEditor();
    markDraft();

    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(context.replaceDetail).toHaveBeenCalledWith(updated);
    expect(fixture.componentInstance.isEditing).toBeFalse();
    expect(fixture.componentInstance.saveMessage).toBe('About Me updated successfully.');
    expect(fixture.nativeElement.textContent).toContain('About Me updated successfully.');
    expect(notifications.showSuccess).toHaveBeenCalledWith('About Me updated successfully.');
  });

  it('ignores a stale About Me mutation without resetting a current Profile editor', () => {
    const pending = new Subject<ProfileDetail>();
    profiles.update.and.returnValue(pending);
    openEditor();
    markDraft();
    fixture.componentInstance.submit();

    context.selectedId.set('2');
    context.detail.set({ ...detail, id: 2, profileName: 'Frontend CV', firstName: 'Current' });
    params.next(convertToParamMap({ profileId: '2' }));
    openEditor();
    fixture.componentInstance.editForm.controls.firstName.setValue('Current draft');
    fixture.componentInstance.editForm.markAsDirty();

    pending.next({ ...detail, firstName: 'Stale response', version: 4 });
    pending.complete();

    expect(fixture.componentInstance.isEditing).toBeTrue();
    expect(fixture.componentInstance.editForm.controls.firstName.value).toBe('Current draft');
    expect(notifications.showSuccess).not.toHaveBeenCalled();
  });

  it('retains a conflict draft, blocks Save, and requires Reload Latest before editing again', () => {
    const reload = new Subject<ProfileDetail>();
    profiles.update.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'PROFILE_VERSION_CONFLICT', message: 'Profile changed elsewhere.' } })));
    context.reloadDetail.and.returnValue(reload);
    openEditor();
    markDraft();

    fixture.componentInstance.submit();

    expect(fixture.componentInstance.conflict).toBeTrue();
    expect(fixture.componentInstance.editForm.controls.firstName.value).toBe('Changed');
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBeTrue();

    fixture.componentInstance.reloadLatest();
    expect(fixture.componentInstance.reloadConfirmation).toBeTrue();
    fixture.componentInstance.keepEditing();
    expect(fixture.componentInstance.reloadConfirmation).toBeFalse();
    expect(fixture.componentInstance.conflict).toBeTrue();

    fixture.componentInstance.reloadLatest();
    fixture.componentInstance.confirmReloadLatest();
    expect(context.reloadDetail).toHaveBeenCalledWith('1');
    reload.next({ ...detail, firstName: 'Latest', version: 5 });
    reload.complete();

    expect(fixture.componentInstance.conflict).toBeFalse();
    expect(fixture.componentInstance.editForm.controls.firstName.value).toBe('Latest');
    expect(profiles.update).toHaveBeenCalledTimes(1);
  });

  it('confirms dirty Cancel instead of silently discarding the draft', () => {
    openEditor();
    markDraft();

    fixture.componentInstance.cancelEditing();
    expect(fixture.componentInstance.cancelConfirmation).toBeTrue();
    fixture.componentInstance.keepEditing();
    expect(fixture.componentInstance.isEditing).toBeTrue();
    fixture.componentInstance.cancelEditing();
    fixture.componentInstance.discardEditing();
    expect(fixture.componentInstance.isEditing).toBeFalse();
  });

  it('disables Delete Profile when it is the only active Profile', () => {
    const button = fixture.nativeElement.querySelector('.delete-profile-button') as HTMLButtonElement;

    expect(button.disabled).toBeTrue();
    context.summaries.set([summary, { ...summary, id: 2, profileName: 'Frontend CV' }]);
    fixture.detectChanges();

    expect(button.disabled).toBeFalse();
  });

  it('identifies the selected Profile in the destructive confirmation', () => {
    context.summaries.set([summary, { ...summary, id: 2, profileName: 'Frontend CV' }]);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.delete-profile-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#delete-profile-title')?.textContent).toContain('Delete Backend CV?');
    expect(fixture.nativeElement.querySelector('#delete-profile-copy')?.textContent).toContain('selected Profile only');
  });

  it('does not open Profile deletion behind a dirty About Me draft', () => {
    context.summaries.set([summary, { ...summary, id: 2, profileName: 'Frontend CV' }]);
    fixture.detectChanges();
    openEditor();
    markDraft();

    fixture.componentInstance.openDeleteConfirmation();
    fixture.detectChanges();

    expect(fixture.componentInstance.deleteConfirmation).toBeFalse();
    expect(fixture.componentInstance.isEditing).toBeTrue();
    expect(fixture.componentInstance.editForm.controls.firstName.value).toBe('Changed');
    expect(fixture.componentInstance.editForm.dirty).toBeTrue();
    expect(fixture.componentInstance.editSession.dirty()).toBeTrue();
  });

  it('waits for confirmation and backend success before refreshing or navigating', () => {
    const pendingDelete = new Subject<void>();
    const remaining = { ...summary, id: 2, profileName: 'Frontend CV' };
    profiles.delete.and.returnValue(pendingDelete);
    context.refreshSummariesAndSelectFirst.and.returnValue(of(remaining));
    context.summaries.set([summary, remaining]);
    fixture.detectChanges();

    expect(profiles.delete).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    fixture.componentInstance.openDeleteConfirmation();
    expect(profiles.delete).not.toHaveBeenCalled();

    fixture.componentInstance.confirmDelete();
    expect(profiles.delete).toHaveBeenCalledWith('1');
    expect(context.refreshSummariesAndSelectFirst).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();

    pendingDelete.next();
    pendingDelete.complete();

    expect(context.refreshSummariesAndSelectFirst).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/profiles', 2]);
  });

  it('ignores a stale Profile deletion response after switching to another Profile', () => {
    const pendingDelete = new Subject<void>();
    const other = { ...summary, id: 2, profileName: 'Frontend CV' };
    profiles.delete.and.returnValue(pendingDelete);
    context.summaries.set([summary, other]);
    fixture.detectChanges();
    fixture.componentInstance.openDeleteConfirmation();
    fixture.componentInstance.confirmDelete();

    context.selectedId.set('2');
    context.detail.set({ ...detail, id: 2, profileName: 'Frontend CV' });
    params.next(convertToParamMap({ profileId: '2' }));
    pendingDelete.next();

    expect(fixture.componentInstance.isDeleting).toBeFalse();
    expect(context.refreshSummariesAndSelectFirst).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('refreshes and navigates to the first remaining Profile after deletion', () => {
    const remaining = { ...summary, id: 2, profileName: 'Frontend CV' };
    profiles.delete.and.returnValue(of(undefined));
    context.refreshSummariesAndSelectFirst.and.callFake(() => {
      context.summaries.set([remaining]);
      context.selectedId.set('2');
      context.detail.set(null);
      return of(remaining);
    });
    context.summaries.set([summary, remaining]);
    fixture.detectChanges();

    fixture.componentInstance.openDeleteConfirmation();
    fixture.componentInstance.confirmDelete();

    expect(fixture.componentInstance.isEditing).toBeFalse();
    expect(fixture.componentInstance.editSession.dirty()).toBeFalse();
    expect(context.summaries()).toEqual([remaining]);
    expect(context.detail()).toBeNull();
    expect(context.selectedId()).toBe('2');
    expect(router.navigate).toHaveBeenCalledWith(['/profiles', 2]);
  });

  it('blocks Profile deletion while preserving the current About Me draft', () => {
    const remaining = { ...summary, id: 2, profileName: 'Frontend CV' };
    profiles.delete.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'PROFILE_LAST_ACTIVE_CANNOT_DELETE', message: 'At least one active Profile is required.' } })));
    context.summaries.set([summary, remaining]);
    fixture.detectChanges();
    openEditor();
    markDraft();
    fixture.componentInstance.openDeleteConfirmation();

    expect(fixture.componentInstance.deleteConfirmation).toBeFalse();
    expect(fixture.componentInstance.isEditing).toBeTrue();
    expect(fixture.componentInstance.editForm.controls.firstName.value).toBe('Changed');
    expect(fixture.componentInstance.editSession.dirty()).toBeTrue();
    expect(context.detail()).toEqual(detail);
    expect(fixture.componentInstance.deleteErrorMessage).toBe('');
    expect(profiles.delete).not.toHaveBeenCalled();
    expect(context.refreshSummariesAndSelectFirst).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('recovers an invalid Profile route to the first accessible Profile and clears stale detail', () => {
    const remaining = { ...summary, id: 2, profileName: 'Frontend CV' };
    const notFound = new HttpErrorResponse({ status: 404, error: { errorCode: 'PROFILE_NOT_FOUND', message: 'Profile not found.' } });
    context.isNotFound.and.returnValue(true);
    context.refreshSummariesAndSelectFirst.and.callFake(() => {
      context.beginSelection(null);
      context.detail.set(null);
      context.detailError.set(null);
      context.summaries.set([remaining]);
      context.selectedId.set('2');
      return of(remaining);
    });

    context.detailError.set(notFound);
    fixture.detectChanges();

    expect(context.refreshSummariesAndSelectFirst).toHaveBeenCalledTimes(1);
    expect(context.detail()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/profiles', 2]);
  });

  it('uses the same recovery for an inaccessible Profile response as for a missing Profile', () => {
    const remaining = { ...summary, id: 2, profileName: 'Frontend CV' };
    const responses = [
      new HttpErrorResponse({ status: 404, error: { errorCode: 'PROFILE_NOT_FOUND', message: 'Profile not found.' } }),
      new HttpErrorResponse({ status: 404, error: { errorCode: 'PROFILE_NOT_FOUND', message: 'Profile not available.' } }),
    ];
    context.isNotFound.and.callFake((error: unknown) => error instanceof HttpErrorResponse && error.error?.errorCode === 'PROFILE_NOT_FOUND');
    context.refreshSummariesAndSelectFirst.and.callFake(() => {
      context.beginSelection(null);
      context.detail.set(null);
      context.detailError.set(null);
      context.summaries.set([remaining]);
      context.selectedId.set('2');
      return of(remaining);
    });

    responses.forEach((response) => {
      context.detailError.set(response);
      fixture.detectChanges();
    });

    expect(context.refreshSummariesAndSelectFirst).toHaveBeenCalledTimes(2);
    expect(router.navigate).toHaveBeenCalledTimes(2);
    expect(router.navigate).toHaveBeenCalledWith(['/profiles', 2]);
  });

  it('does not repeat recovery when the same Profile route fails again', () => {
    const remaining = { ...summary, id: 2, profileName: 'Frontend CV' };
    context.isNotFound.and.returnValue(true);
    context.refreshSummariesAndSelectFirst.and.callFake(() => {
      context.detail.set(null);
      return of(remaining);
    });

    context.detailError.set(new HttpErrorResponse({ status: 404, error: { errorCode: 'PROFILE_NOT_FOUND' } }));
    fixture.detectChanges();
    context.detailError.set(new HttpErrorResponse({ status: 404, error: { errorCode: 'PROFILE_NOT_FOUND' } }));
    fixture.detectChanges();

    expect(context.refreshSummariesAndSelectFirst).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledTimes(1);
  });

  it('redirects to the Profile index when recovery finds no accessible Profiles', () => {
    const notFound = new HttpErrorResponse({ status: 404, error: { errorCode: 'PROFILE_NOT_FOUND', message: 'Profile not found.' } });
    context.isNotFound.and.returnValue(true);
    context.refreshSummariesAndSelectFirst.and.callFake(() => {
      context.beginSelection(null);
      context.detail.set(null);
      context.detailError.set(null);
      context.summaries.set([]);
      return of(null);
    });

    context.detailError.set(notFound);
    fixture.detectChanges();

    expect(context.refreshSummariesAndSelectFirst).toHaveBeenCalledTimes(1);
    expect(context.detail()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/profiles']);
  });

  it('recovers from PROFILE_NOT_FOUND by refreshing and navigating to a valid Profile', () => {
    const remaining = { ...summary, id: 2, profileName: 'Frontend CV' };
    const notFound = new HttpErrorResponse({ status: 404, error: { errorCode: 'PROFILE_NOT_FOUND', message: 'Profile not found.' } });
    profiles.delete.and.returnValue(throwError(() => notFound));
    context.isNotFound.and.returnValue(true);
    context.refreshSummariesAndSelectFirst.and.callFake(() => {
      context.summaries.set([remaining]);
      context.selectedId.set('2');
      context.detail.set(null);
      return of(remaining);
    });
    context.summaries.set([summary, remaining]);
    fixture.detectChanges();

    fixture.componentInstance.openDeleteConfirmation();
    fixture.componentInstance.confirmDelete();

    expect(context.refreshSummariesAndSelectFirst).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/profiles', 2]);
    expect(fixture.componentInstance.deleteConfirmation).toBeFalse();
    expect(fixture.componentInstance.editSession.dirty()).toBeFalse();
  });

  it('renders independent Education loading, empty, error, and populated states', () => {
    expect(fixture.nativeElement.querySelector('#workspace-section-education .empty-state')?.textContent).toContain('No Education records exist');

    const loading = new Subject<Education[]>();
    profiles.listEducations.and.returnValue(loading);
    params.next(convertToParamMap({ profileId: '2' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.section-state')?.textContent).toContain('Loading Education records');

    loading.next([education]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.record')?.textContent).toContain('BSc Computer Science');
    expect(fixture.nativeElement.querySelector('#workspace-section-education .empty-state')).toBeNull();

    const failed = new Subject<Education[]>();
    profiles.listEducations.and.returnValue(failed);
    params.next(convertToParamMap({ profileId: '3' }));
    failed.error(new Error('unavailable'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('could not load Education');
    expect(fixture.nativeElement.querySelector('#workspace-section-education .empty-state')).toBeNull();
  });

  it('retries Education loading at section level', () => {
    const failed = new Subject<Education[]>();
    const retried = new Subject<Education[]>();
    profiles.listEducations.and.returnValues(failed, retried);
    params.next(convertToParamMap({ profileId: '2' }));
    failed.error(new Error('unavailable'));
    fixture.detectChanges();

    fixture.componentInstance.retryEducations();
    expect(fixture.componentInstance.educationLoading).toBeTrue();
    retried.next([education]);
    fixture.detectChanges();

    expect(fixture.componentInstance.educations).toEqual([education]);
    expect(fixture.nativeElement.querySelector('.record')?.textContent).toContain('North University');
  });

  it('ignores stale Education list responses after Profile switching', () => {
    const first = new Subject<Education[]>();
    const second = new Subject<Education[]>();
    profiles.listEducations.calls.reset();
    profiles.listEducations.and.returnValues(first, second);

    params.next(convertToParamMap({ profileId: '2' }));
    params.next(convertToParamMap({ profileId: '3' }));
    first.next([education]);

    expect(fixture.componentInstance.educations).toEqual([]);
    second.next([{ ...education, id: 2, degree: 'MSc' }]);
    expect(fixture.componentInstance.educations).toEqual([{ ...education, id: 2, degree: 'MSc' }]);
  });

  it('renders Education editor fields and requires an end date for completed Education', () => {
    openEducationCreate();
    expect(fixture.nativeElement.querySelectorAll('.education-editor input, .education-editor select').length).toBe(6);

    fillEducationDraft({ status: 'COMPLETED', endDate: '' });
    fixture.componentInstance.submitEducation();

    expect(profiles.createEducation).not.toHaveBeenCalled();
    expect(fixture.componentInstance.educationForm.controls.endDate.errors?.['required']).toBeTrue();
    expect(fixture.componentInstance.educationForm.controls.endDate.touched).toBeTrue();
  });

  it('clears an Education End Date when switching to Ongoing and does not restore it for Completed', () => {
    openEducationCreate();
    fillEducationDraft({ status: 'COMPLETED', endDate: '2024-06-30' });

    fixture.componentInstance.educationForm.controls.status.setValue('ONGOING');
    expect(fixture.componentInstance.educationForm.controls.endDate.value).toBe('');
    expect(fixture.componentInstance.educationForm.controls.endDate.disabled).toBeTrue();

    fixture.componentInstance.educationForm.controls.status.setValue('COMPLETED');
    expect(fixture.componentInstance.educationForm.controls.endDate.value).toBe('');
    expect(fixture.componentInstance.educationForm.controls.endDate.enabled).toBeTrue();
    expect(fixture.componentInstance.educationForm.controls.endDate.errors?.['required']).toBeTrue();
  });

  it('submits an Ongoing Education with a null End Date after clearing the form value', () => {
    profiles.createEducation.and.returnValue(of({ education, profileVersion: 4 }));
    openEducationCreate();
    fillEducationDraft({ status: 'COMPLETED', endDate: '2024-06-30' });
    fixture.componentInstance.educationForm.controls.status.setValue('ONGOING');
    fixture.componentInstance.educationForm.markAsDirty();

    fixture.componentInstance.submitEducation();

    expect(fixture.componentInstance.educationForm.controls.endDate.value).toBe('');
    expect(profiles.createEducation).toHaveBeenCalledWith('1', jasmine.objectContaining({ status: 'ONGOING', endDate: null }));
  });

  it('rejects an Education date range where the start is after the end', () => {
    openEducationCreate();
    fillEducationDraft({ status: 'COMPLETED', endDate: '2019-06-30' });
    fixture.componentInstance.submitEducation();

    expect(profiles.createEducation).not.toHaveBeenCalled();
    expect(fixture.componentInstance.educationForm.errors?.['dateRange']).toBeTrue();
    expect(fixture.componentInstance.educationFieldError('endDate')).toContain('on or after');
  });

  it('creates Education with canonical returned data, the current Profile version, and preview invalidation', () => {
    const created: Education = { ...education, id: 7, endDate: null };
    profiles.createEducation.and.returnValue(of({ education: created, profileVersion: 4 }));
    openEducationCreate();
    fillEducationDraft({ schoolName: '  North University  ', degree: '  BSc Computer Science  ', fieldOfStudy: '  Computing  ', endDate: '2024-01-01' });

    fixture.componentInstance.submitEducation();

    expect(profiles.createEducation).toHaveBeenCalledWith('1', { schoolName: 'North University', degree: 'BSc Computer Science', fieldOfStudy: 'Computing', startDate: '2020-09-01', endDate: null, status: 'ONGOING', version: 3 });
    expect(context.applyMutationVersion).toHaveBeenCalledWith('1', 4);
    expect(fixture.componentInstance.educations).toEqual([created]);
    expect(fixture.componentInstance.previewInvalidated).toBeTrue();
    expect(fixture.componentInstance.educationMessage).toBe('Education added successfully.');
    expect(context.reloadDetail).not.toHaveBeenCalled();
    expect(fixture.componentInstance.educationEditorMode).toBeNull();
  });

  it('supports Education Save & add another with a clean reset and shared submit lock', () => {
    const created: Education = { ...education, id: 7, schoolName: 'First School' };
    const pending = new Subject<{ education: Education; profileVersion: number }>();
    profiles.createEducation.and.returnValue(pending);
    openEducationCreate();
    fillEducationDraft({ schoolName: 'First School', degree: 'First Degree', status: 'COMPLETED', endDate: '2024-06-30' });

    fixture.componentInstance.submitEducation('add-another');
    fixture.componentInstance.submitEducation();

    expect(profiles.createEducation).toHaveBeenCalledTimes(1);
    pending.next({ education: created, profileVersion: 4 });
    pending.complete();
    fixture.detectChanges();

    expect(fixture.componentInstance.educations).toEqual([created]);
    expect(fixture.componentInstance.educationEditorMode).toBe('create');
    expect(fixture.componentInstance.educationForm.getRawValue()).toEqual({ schoolName: '', degree: '', fieldOfStudy: '', startDate: '', endDate: '', status: 'ONGOING' });
    expect(fixture.componentInstance.educationForm.pristine).toBeTrue();
    expect(fixture.componentInstance.educationForm.untouched).toBeTrue();
    expect(fixture.componentInstance.educationForm.controls.endDate.disabled).toBeTrue();
    expect(fixture.componentInstance.editSession.dirty()).toBeFalse();
    expect(notifications.showSuccess).toHaveBeenCalledWith('Education added successfully.');
    expect(document.activeElement?.id).toBe('education-school-name');
  });

  it('marks the next Education draft dirty after a repeated-entry reset', () => {
    const created: Education = { ...education, id: 7 };
    profiles.createEducation.and.returnValue(of({ education: created, profileVersion: 4 }));
    openEducationCreate();
    fillEducationDraft();
    fixture.componentInstance.submitEducation('add-another');

    fixture.componentInstance.educationForm.controls.schoolName.setValue('Next School');
    fixture.componentInstance.educationForm.markAsDirty();
    fixture.detectChanges();

    expect(fixture.componentInstance.educationForm.dirty).toBeTrue();
    expect(fixture.componentInstance.editSession.dirty()).toBeTrue();
  });

  it('uses the returned Education Profile version for the next create', () => {
    const first: Education = { ...education, id: 7, schoolName: 'First School' };
    const second: Education = { ...education, id: 8, schoolName: 'Second School' };
    context.applyMutationVersion.and.callFake((_profileId: string, version: number) => {
      context.detail.set({ ...detail, version, hasPreviewed: false });
      return true;
    });
    profiles.createEducation.and.returnValues(
      of({ education: first, profileVersion: 4 }),
      of({ education: second, profileVersion: 5 }),
    );
    openEducationCreate();
    fillEducationDraft({ schoolName: 'First School' });
    fixture.componentInstance.submitEducation('add-another');
    fillEducationDraft({ schoolName: 'Second School' });
    fixture.componentInstance.submitEducation();

    expect(profiles.createEducation.calls.argsFor(0)[1]).toEqual(jasmine.objectContaining({ version: 3 }));
    expect(profiles.createEducation.calls.argsFor(1)[1]).toEqual(jasmine.objectContaining({ version: 4 }));
    expect(fixture.componentInstance.educations).toEqual([first, second]);
    expect(fixture.componentInstance.educationEditorMode).toBeNull();
  });

  it('updates Education with completed dates and applies the canonical returned row', () => {
    const updated: Education = { ...education, degree: 'MSc Computer Science', status: 'COMPLETED', endDate: '2024-06-30' };
    profiles.updateEducation.and.returnValue(of({ education: updated, profileVersion: 5 }));
    fixture.componentInstance.educations = [education];
    fixture.componentInstance.startEducationEdit(education);
    fillEducationDraft({ degree: 'MSc Computer Science', status: 'COMPLETED', endDate: '2024-06-30' });

    fixture.componentInstance.submitEducation();

    expect(profiles.updateEducation).toHaveBeenCalledWith('1', 1, { schoolName: 'North University', degree: 'MSc Computer Science', fieldOfStudy: 'Computing', startDate: '2020-09-01', endDate: '2024-06-30', status: 'COMPLETED', version: 3 });
    expect(fixture.componentInstance.educations).toEqual([updated]);
    expect(context.applyMutationVersion).toHaveBeenCalledWith('1', 5);
    expect(notifications.showSuccess).toHaveBeenCalledWith('Education updated successfully.');
  });

  it('preserves Education form values, dirty state, and rows after a failed mutation', () => {
    profiles.createEducation.and.returnValue(throwError(() => new HttpErrorResponse({ status: 503, error: { message: 'Service unavailable' } })));
    fixture.componentInstance.educations = [education];
    openEducationCreate();
    fillEducationDraft({ schoolName: 'Draft School' });

    fixture.componentInstance.submitEducation();

    expect(fixture.componentInstance.educationEditorMode).toBe('create');
    expect(fixture.componentInstance.educationForm.controls.schoolName.value).toBe('Draft School');
    expect(fixture.componentInstance.educationForm.dirty).toBeTrue();
    expect(fixture.componentInstance.educations).toEqual([education]);
    expect(fixture.componentInstance.educationErrorMessage).toBe('Service unavailable');
  });

  it('maps backend Education validation and preserves entered values', () => {
    profiles.createEducation.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { errorCode: 'VALIDATION_ERROR', data: { errors: [{ field: 'schoolName', message: 'School is invalid' }] } } })));
    openEducationCreate();
    fillEducationDraft({ schoolName: 'Entered School' });

    fixture.componentInstance.submitEducation();

    expect(fixture.componentInstance.educationForm.controls.schoolName.value).toBe('Entered School');
    expect(fixture.componentInstance.educationForm.controls.schoolName.errors?.['backend']).toBe('School is invalid');
    expect(fixture.componentInstance.educationEditorMode).toBe('create');
  });

  it('preserves an Education conflict draft and reloads Profile plus Education after confirmation', () => {
    const reload = new Subject<ProfileDetail>();
    const refreshedEducations = new Subject<Education[]>();
    profiles.createEducation.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'PROFILE_VERSION_CONFLICT', message: 'Profile changed elsewhere.' } })));
    context.reloadDetail.and.returnValue(reload);
    profiles.listEducations.and.returnValue(refreshedEducations);
    openEducationCreate();
    fillEducationDraft({ schoolName: 'Conflict Draft' });

    fixture.componentInstance.submitEducation();
    expect(fixture.componentInstance.educationConflict).toBeTrue();
    expect(fixture.componentInstance.educationForm.controls.schoolName.value).toBe('Conflict Draft');

    fixture.componentInstance.reloadLatest();
    expect(fixture.componentInstance.reloadConfirmation).toBeTrue();
    fixture.componentInstance.confirmReloadLatest();
    expect(context.reloadDetail).toHaveBeenCalledWith('1');
    expect(fixture.componentInstance.educationEditorMode).toBeNull();

    reload.next({ ...detail, version: 4 });
    refreshedEducations.next([education]);
    fixture.detectChanges();
    expect(fixture.componentInstance.educations).toEqual([education]);
    expect(fixture.componentInstance.educationMessage).toContain('Latest Profile and Education data loaded');
  });

  it('confirms Education deletion, protects against duplicate submission, and removes the canonical row', () => {
    const pending = new Subject<{ profileVersion: number }>();
    fixture.componentInstance.educations = [education];
    profiles.deleteEducation.and.returnValue(pending);
    fixture.detectChanges();

    const deleteButton = fixture.nativeElement.querySelector('.education-delete-button') as HTMLButtonElement;
    expect(deleteButton.getAttribute('aria-label')).toBe('Delete BSc Computer Science at North University');
    deleteButton.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.educationDeleteConfirmation).toBeTrue();

    fixture.componentInstance.confirmEducationDelete();
    fixture.componentInstance.confirmEducationDelete();
    expect(profiles.deleteEducation).toHaveBeenCalledTimes(1);
    expect(profiles.deleteEducation).toHaveBeenCalledWith('1', 1, 3);
    expect(fixture.componentInstance.educations).toEqual([education]);

    pending.next({ profileVersion: 4 });
    pending.complete();
    expect(fixture.componentInstance.educations).toEqual([]);
    expect(fixture.componentInstance.educationDeleteConfirmation).toBeFalse();
    expect(fixture.componentInstance.educationMessage).toContain('Education deleted');
    expect(context.reloadDetail).not.toHaveBeenCalled();
    expect(notifications.showSuccess).toHaveBeenCalledWith('Education deleted successfully.');
  });

  it('blocks cross-section mutations behind an active About Me draft and restores them after discard', () => {
    fixture.componentInstance.projects = [project];
    openEditor();
    markDraft();
    fixture.detectChanges();

    expect(fixture.componentInstance.workspaceMutationLocked()).toBeTrue();
    expect((fixture.nativeElement.querySelector('#workspace-section-projects .section-title button') as HTMLButtonElement).disabled).toBeTrue();
    expect((fixture.nativeElement.querySelector('.project-details-toggle + .btn') as HTMLButtonElement).disabled).toBeTrue();
    expect((fixture.nativeElement.querySelector('.project-delete-button') as HTMLButtonElement).disabled).toBeTrue();

    fixture.componentInstance.cancelEditing();
    fixture.componentInstance.discardEditing();
    fixture.detectChanges();

    expect(fixture.componentInstance.workspaceMutationLocked()).toBeFalse();
    expect((fixture.nativeElement.querySelector('#workspace-section-projects .section-title button') as HTMLButtonElement).disabled).toBeFalse();
  });

  it('prevents Project create, edit, and delete while an Education editor is active', () => {
    fixture.componentInstance.projects = [project];
    openEducationCreate();
    fixture.detectChanges();

    fixture.componentInstance.startProjectCreate();
    fixture.componentInstance.startProjectEdit(project);
    fixture.componentInstance.openProjectDeleteConfirmation(project);

    expect(router.navigate).not.toHaveBeenCalled();
    expect(fixture.componentInstance.projectDeleteConfirmation).toBeFalse();
    expect((fixture.nativeElement.querySelector('#workspace-section-projects .section-title button') as HTMLButtonElement).disabled).toBeTrue();
  });

  it('keeps one inline editor owner while allowing read-only Project expansion', () => {
    fixture.componentInstance.projects = [project];
    openEducationCreate();

    fixture.componentInstance.startLanguageCreate();
    fixture.componentInstance.startCertificateCreate();
    fixture.componentInstance.startSkillCreate();
    fixture.componentInstance.startEditing();
    fixture.componentInstance.toggleProjectDetails(project);
    fixture.detectChanges();

    expect(fixture.componentInstance.educationEditorMode).toBe('create');
    expect(fixture.componentInstance.languageEditorMode).toBeNull();
    expect(fixture.componentInstance.certificateEditorMode).toBeNull();
    expect(fixture.componentInstance.skillEditorMode).toBeNull();
    expect(fixture.componentInstance.isEditing).toBeFalse();
    expect(fixture.componentInstance.isProjectExpanded(project)).toBeTrue();
  });

  it('prevents collection mutations while a Language editor owns the Profile context', () => {
    fixture.componentInstance.projects = [project];
    fixture.componentInstance.startLanguageCreate();
    fixture.detectChanges();

    fixture.componentInstance.startCertificateCreate();
    fixture.componentInstance.startSkillEdit(skill);
    fixture.componentInstance.openProjectDeleteConfirmation(project);

    expect(fixture.componentInstance.languageEditorMode).toBe('create');
    expect(fixture.componentInstance.certificateEditorMode).toBeNull();
    expect(fixture.componentInstance.skillEditorMode).toBeNull();
    expect(fixture.componentInstance.projectDeleteConfirmation).toBeFalse();
    expect((fixture.nativeElement.querySelector('#workspace-section-education .section-title button') as HTMLButtonElement).disabled).toBeTrue();
  });

  it('does not bypass the dirty editor when entering the routed Project Editor', () => {
    openEditor();
    markDraft();

    fixture.componentInstance.startProjectCreate();

    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('retains an Education row and confirmation after delete failure', () => {
    profiles.deleteEducation.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'Delete rejected' } })));
    fixture.componentInstance.educations = [education];
    fixture.componentInstance.openEducationDeleteConfirmation(education);
    fixture.componentInstance.confirmEducationDelete();

    expect(fixture.componentInstance.educations).toEqual([education]);
    expect(fixture.componentInstance.educationDeleteConfirmation).toBeTrue();
    expect(fixture.componentInstance.educationDeleteErrorMessage).toBe('Delete rejected');
  });

  it('recovers an Education delete version conflict without blind retry or success feedback', () => {
    const reload = new Subject<ProfileDetail>();
    const refreshed = new Subject<Education[]>();
    profiles.deleteEducation.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'PROFILE_VERSION_CONFLICT' } })));
    context.reloadDetail.and.returnValue(reload);
    profiles.listEducations.and.returnValue(refreshed);
    fixture.componentInstance.educations = [education];
    fixture.componentInstance.openEducationDeleteConfirmation(education);
    fixture.componentInstance.confirmEducationDelete();

    expect(fixture.componentInstance.educations).toEqual([education]);
    expect(fixture.componentInstance.educationDeleteConfirmation).toBeTrue();
    expect(fixture.componentInstance.hasDeleteConflict('education')).toBeTrue();
    expect(notifications.showSuccess).not.toHaveBeenCalled();
    fixture.componentInstance.confirmEducationDelete();
    expect(profiles.deleteEducation).toHaveBeenCalledTimes(1);

    fixture.componentInstance.reloadLatest();
    reload.next({ ...detail, version: 4 });
    refreshed.next([education]);
    context.detail.set({ ...detail, version: 4 });

    expect(fixture.componentInstance.hasDeleteConflict('education')).toBeFalse();
    expect(fixture.componentInstance.educationDeleteConfirmation).toBeTrue();
    profiles.deleteEducation.and.returnValue(of({ profileVersion: 5 }));
    fixture.componentInstance.confirmEducationDelete();

    expect(profiles.deleteEducation).toHaveBeenCalledWith('1', 1, 4);
  });

  it('closes an Education delete conflict when reload shows the target is gone', () => {
    const reload = new Subject<ProfileDetail>();
    const refreshed = new Subject<Education[]>();
    profiles.deleteEducation.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'PROFILE_VERSION_CONFLICT' } })));
    context.reloadDetail.and.returnValue(reload);
    profiles.listEducations.and.returnValue(refreshed);
    fixture.componentInstance.educations = [education];
    fixture.componentInstance.openEducationDeleteConfirmation(education);
    fixture.componentInstance.confirmEducationDelete();
    fixture.componentInstance.reloadLatest();
    reload.next({ ...detail, version: 4 });
    refreshed.next([]);

    expect(fixture.componentInstance.educations).toEqual([]);
    expect(fixture.componentInstance.educationDeleteConfirmation).toBeFalse();
    expect(fixture.componentInstance.hasDeleteConflict('education')).toBeFalse();
    expect(profiles.deleteEducation).toHaveBeenCalledTimes(1);
    expect(notifications.showSuccess).not.toHaveBeenCalled();
  });

  it('keeps an Education delete conflict recoverable when latest reload fails', () => {
    profiles.deleteEducation.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'PROFILE_VERSION_CONFLICT' } })));
    context.reloadDetail.and.returnValue(throwError(() => new HttpErrorResponse({ status: 503, error: { message: 'Profile reload failed' } })));
    fixture.componentInstance.educations = [education];
    fixture.componentInstance.openEducationDeleteConfirmation(education);
    fixture.componentInstance.confirmEducationDelete();
    fixture.componentInstance.reloadLatest();

    expect(fixture.componentInstance.isReloading).toBeFalse();
    expect(fixture.componentInstance.hasDeleteConflict('education')).toBeTrue();
    expect(fixture.componentInstance.educations).toEqual([education]);
    expect(profiles.deleteEducation).toHaveBeenCalledTimes(1);
    expect(notifications.showSuccess).not.toHaveBeenCalled();
  });

  it('resets Education delete state on Profile switch and ignores the stale delete response', () => {
    const pending = new Subject<{ profileVersion: number }>();
    profiles.deleteEducation.and.returnValue(pending);
    fixture.componentInstance.educations = [education];
    fixture.componentInstance.openEducationDeleteConfirmation(education);
    fixture.componentInstance.confirmEducationDelete();

    context.selectedId.set('2');
    context.detail.set({ ...detail, id: 2, profileName: 'Frontend CV' });
    params.next(convertToParamMap({ profileId: '2' }));
    pending.next({ profileVersion: 4 });

    expect(fixture.componentInstance.educations).toEqual([]);
    expect(fixture.componentInstance.isEducationDeleting).toBeFalse();
    expect(fixture.componentInstance.educationDeleteConfirmation).toBeFalse();
    expect(notifications.showSuccess).not.toHaveBeenCalled();
    expect(context.applyMutationVersion).not.toHaveBeenCalledWith('1', 4);
  });

  it('does not let a stale Education conflict reload populate the next Profile', () => {
    const reload = new Subject<ProfileDetail>();
    const staleList = new Subject<Education[]>();
    const currentList = new Subject<Education[]>();
    profiles.deleteEducation.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'PROFILE_VERSION_CONFLICT' } })));
    context.reloadDetail.and.returnValue(reload);
    profiles.listEducations.and.returnValues(staleList, currentList);
    fixture.componentInstance.educations = [education];
    fixture.componentInstance.openEducationDeleteConfirmation(education);
    fixture.componentInstance.confirmEducationDelete();
    fixture.componentInstance.reloadLatest();
    reload.next({ ...detail, version: 4 });

    context.selectedId.set('2');
    context.detail.set({ ...detail, id: 2, profileName: 'Frontend CV' });
    params.next(convertToParamMap({ profileId: '2' }));
    staleList.next([education]);

    expect(fixture.componentInstance.educations).toEqual([]);
    expect(fixture.componentInstance.educationDeleteConfirmation).toBeFalse();
    expect(fixture.componentInstance.isReloading).toBeFalse();
  });

  it('renders independent Language loading, empty, error, and populated states', () => {
    expect(fixture.nativeElement.textContent).toContain('No Language records exist');

    const loading = new Subject<ProfileLanguage[]>();
    profiles.listProfileLanguages.and.returnValue(loading);
    params.next(convertToParamMap({ profileId: '2' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.section-state')?.textContent).toContain('Loading Language records');

    loading.next([language]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.record')?.textContent).toContain('English');
    expect(fixture.nativeElement.querySelector('.empty-state')?.textContent).not.toContain('No Language records');

    const failed = new Subject<ProfileLanguage[]>();
    profiles.listProfileLanguages.and.returnValue(failed);
    params.next(convertToParamMap({ profileId: '3' }));
    failed.error(new Error('unavailable'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('could not load Language');
  });

  it('retries Language loading at section level', () => {
    const failed = new Subject<ProfileLanguage[]>();
    const retried = new Subject<ProfileLanguage[]>();
    profiles.listProfileLanguages.and.returnValues(failed, retried);
    params.next(convertToParamMap({ profileId: '2' }));
    failed.error(new Error('unavailable'));
    fixture.detectChanges();

    fixture.componentInstance.retryLanguages();
    expect(fixture.componentInstance.languageLoading).toBeTrue();
    retried.next([language]);
    fixture.detectChanges();

    expect(fixture.componentInstance.languages).toEqual([language]);
    expect(fixture.nativeElement.querySelector('.record')?.textContent).toContain('English');
  });

  it('ignores stale Language list responses after Profile switching', () => {
    const first = new Subject<ProfileLanguage[]>();
    const second = new Subject<ProfileLanguage[]>();
    profiles.listProfileLanguages.calls.reset();
    profiles.listProfileLanguages.and.returnValues(first, second);

    params.next(convertToParamMap({ profileId: '2' }));
    params.next(convertToParamMap({ profileId: '3' }));
    first.next([language]);

    expect(fixture.componentInstance.languages).toEqual([]);
    second.next([{ ...language, profileLanguageId: 2, languageName: 'Japanese' }]);
    expect(fixture.componentInstance.languages).toEqual([{ ...language, profileLanguageId: 2, languageName: 'Japanese' }]);
  });

  it('starts Add Language with both selections empty and blocks save until both are selected', () => {
    fixture.componentInstance.startLanguageCreate();
    fixture.detectChanges();

    expect(fixture.componentInstance.languageForm.controls.languageId.value).toBeNull();
    expect(fixture.componentInstance.languageForm.controls.level.value).toBeNull();
    expect(fixture.nativeElement.querySelector('#profile-language-level')?.textContent).toContain('Select a proficiency');
    expect(fixture.componentInstance.languageLevels.map((level) => level.value)).toEqual(['BEGINNER', 'INTERMEDIATE', 'UPPER_INTERMEDIATE', 'ADVANCED', 'NATIVE']);
    expect(fixture.nativeElement.querySelectorAll('#profile-language-level option').length).toBe(6);
    fixture.componentInstance.submitLanguage();

    expect(profiles.createProfileLanguage).not.toHaveBeenCalled();
    expect(fixture.componentInstance.languageForm.controls.languageId.errors?.['required']).toBeTrue();
    expect(fixture.componentInstance.languageForm.controls.level.errors?.['required']).toBeTrue();
  });

  it('reopens Add Language with no selections after cancelling a draft', () => {
    fixture.componentInstance.startLanguageCreate();
    fixture.componentInstance.selectLanguageMasterOption(fixture.componentInstance.languageMasterOptions.find((option) => option.id === 3)!);
    fixture.componentInstance.languageForm.patchValue({ level: 'INTERMEDIATE' });
    fixture.componentInstance.languageForm.markAsDirty();
    fixture.componentInstance.cancelEditing();
    expect(fixture.componentInstance.cancelConfirmation).toBeTrue();
    fixture.componentInstance.discardEditing();

    fixture.componentInstance.startLanguageCreate();

    expect(fixture.componentInstance.languageForm.controls.languageId.value).toBeNull();
    expect(fixture.componentInstance.languageForm.controls.level.value).toBeNull();
  });

  it('keeps existing Language and Proficiency selected in edit mode', () => {
    fixture.componentInstance.startLanguageEdit(language);

    expect(fixture.componentInstance.languageForm.getRawValue()).toEqual({ languageId: 2, level: 'ADVANCED' });
  });

  it('searches Language Master from the same field and loads later pages inside the result popup', fakeAsync(() => {
    const firstSearchPage: LanguageMasterPage = { content: [{ id: 3, name: 'Japanese' }], page: 0, size: 10, totalElements: 2, totalPages: 2 };
    const secondPage: LanguageMasterPage = { content: [{ id: 8, name: 'Korean' }], page: 1, size: 1, totalElements: 2, totalPages: 2 };
    profiles.listLanguageMaster.and.returnValues(of(languageMasterPage), of(firstSearchPage), of(secondPage));
    fixture.componentInstance.startLanguageCreate();
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('#profile-language') as HTMLInputElement;
    input.value = '  kor ';
    input.dispatchEvent(new Event('input'));
    tick(300);
    fixture.detectChanges();

    expect(profiles.listLanguageMaster).toHaveBeenCalledWith(0, 10, 'kor');
    expect(fixture.componentInstance.languageMasterTotalPages).toBe(2);
    fixture.componentInstance.loadMoreLanguageMaster();
    expect(profiles.listLanguageMaster).toHaveBeenCalledWith(1, 10, 'kor');
    expect(fixture.componentInstance.languageMasterOptions).toEqual([...firstSearchPage.content, ...secondPage.content]);
  }));

  it('debounces Language Master typing and ignores a stale search response', fakeAsync(() => {
    const ja = new Subject<LanguageMasterPage>();
    const java = new Subject<LanguageMasterPage>();
    profiles.listLanguageMaster.and.returnValues(of(languageMasterPage), ja, java);
    fixture.componentInstance.startLanguageCreate();
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('#profile-language') as HTMLInputElement;

    input.value = 'ja';
    input.dispatchEvent(new Event('input'));
    tick(299);
    expect(profiles.listLanguageMaster).toHaveBeenCalledTimes(1);
    tick(1);
    expect(profiles.listLanguageMaster).toHaveBeenCalledWith(0, 10, 'ja');

    input.value = 'java';
    input.dispatchEvent(new Event('input'));
    tick(300);
    expect(profiles.listLanguageMaster).toHaveBeenCalledWith(0, 10, 'java');

    ja.next({ content: [{ id: 4, name: 'Jasmine' }], page: 0, size: 10, totalElements: 1, totalPages: 1 });
    expect(fixture.componentInstance.languageMasterOptions).toEqual([]);
    java.next({ content: [{ id: 5, name: 'JavaScript' }], page: 0, size: 10, totalElements: 1, totalPages: 1 });
    expect(fixture.componentInstance.languageMasterOptions).toEqual([{ id: 5, name: 'JavaScript' }]);
  }));

  it('reloads all Language options when the search is cleared', fakeAsync(() => {
    const filtered: LanguageMasterPage = { content: [{ id: 3, name: 'Japanese' }], page: 0, size: 10, totalElements: 1, totalPages: 1 };
    profiles.listLanguageMaster.and.returnValues(of(languageMasterPage), of(filtered), of(languageMasterPage));
    fixture.componentInstance.startLanguageCreate();
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('#profile-language') as HTMLInputElement;

    input.value = 'ja';
    input.dispatchEvent(new Event('input'));
    tick(300);
    expect(fixture.componentInstance.languageMasterOptions).toEqual(filtered.content);

    input.value = '';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(profiles.listLanguageMaster).toHaveBeenCalledWith(0, 10, '');
    expect(fixture.componentInstance.languageMasterOptions).toEqual(languageMasterPage.content);
    expect(fixture.componentInstance.languageMasterState).toBe('results');
    expect(fixture.nativeElement.querySelector('.master-combobox-popup')?.textContent).not.toContain('Type to search Language Master');
  }));

  it('selects Language from the combobox, rejects free text, and invalidates changes', fakeAsync(() => {
    fixture.componentInstance.startLanguageCreate();
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('#profile-language') as HTMLInputElement;
    input.value = 'Java';
    input.dispatchEvent(new Event('input'));
    tick(300);
    fixture.detectChanges();

    const option = fixture.nativeElement.querySelector('[data-master-id="2"]') as HTMLButtonElement;
    option.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.languageForm.controls.languageId.value).toBe(2);
    expect(input.value).toBe('English');

    input.value = 'English (typed)';
    input.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.languageForm.controls.languageId.value).toBeNull();

    fixture.componentInstance.languageForm.controls.level.setValue('ADVANCED');
    fixture.componentInstance.submitLanguage();
    expect(profiles.createProfileLanguage).not.toHaveBeenCalled();
    expect(fixture.componentInstance.languageForm.controls.languageId.errors?.['required']).toBeTrue();

    input.value = '';
    input.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.languageForm.controls.languageId.value).toBeNull();
    tick(300);
  }));

  it('clears a Language duplicate error when a different controlled Master value is selected', () => {
    fixture.componentInstance.startLanguageCreate();
    const languageId = fixture.componentInstance.languageForm.controls.languageId;
    languageId.setErrors({ duplicate: 'This Language is already assigned to this Profile.' });

    fixture.componentInstance.selectLanguageMasterOption({ id: 3, name: 'Japanese' });

    expect(languageId.value).toBe(3);
    expect(languageId.errors?.['duplicate']).toBeUndefined();
    expect(fixture.componentInstance.languageForm.controls.languageId.errors?.['required']).toBeUndefined();
  });

  it('represents Language loading, empty, and error states in the selector popup', fakeAsync(() => {
    const pending = new Subject<LanguageMasterPage>();
    profiles.listLanguageMaster.and.returnValues(of(languageMasterPage), pending);
    fixture.componentInstance.startLanguageCreate();
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('#profile-language') as HTMLInputElement;
    input.value = 'missing';
    input.dispatchEvent(new Event('input'));
    tick(300);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.master-combobox-popup')?.textContent).toContain('Searching');

    pending.next({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.master-combobox-popup')?.textContent).toContain('No Language Master matches');

    profiles.listLanguageMaster.and.returnValue(throwError(() => new Error('unavailable')));
    input.value = 'failed';
    input.dispatchEvent(new Event('input'));
    tick(300);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.master-combobox-popup')?.textContent).toContain('Unable to load Language Master');
    expect(fixture.nativeElement.querySelector('.master-combobox-popup .btn')?.textContent).toContain('Retry');
  }));

  it('supports keyboard Language option navigation and selection', fakeAsync(() => {
    profiles.listLanguageMaster.and.returnValues(of(languageMasterPage), of({ content: [{ id: 3, name: 'Japanese' }], page: 0, size: 10, totalElements: 1, totalPages: 1 }));
    fixture.componentInstance.startLanguageCreate();
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('#profile-language') as HTMLInputElement;
    input.value = 'ja';
    input.dispatchEvent(new Event('input'));
    tick(300);
    fixture.detectChanges();

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.languageForm.controls.languageId.value).toBe(3);
    expect(input.value).toBe('Japanese');
  }));

  it('does not apply a pending Language search after closing the editor or switching Profile', fakeAsync(() => {
    const pending = new Subject<LanguageMasterPage>();
    profiles.listLanguageMaster.and.returnValues(of(languageMasterPage), pending);
    fixture.componentInstance.startLanguageCreate();
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('#profile-language') as HTMLInputElement;
    input.value = 'java';
    input.dispatchEvent(new Event('input'));
    tick(300);
    fixture.componentInstance.discardEditing();
    pending.next({ content: [{ id: 9, name: 'Stale' }], page: 0, size: 10, totalElements: 1, totalPages: 1 });
    expect(fixture.componentInstance.languageEditorMode).toBeNull();
    expect(fixture.componentInstance.languageMasterOptions).toEqual([]);

    const pendingSkill = new Subject<SkillMasterPage>();
    profiles.listSkillMaster.and.returnValues(of(skillMasterPage), pendingSkill);
    openSkillCreate();
    const skillInput = fixture.nativeElement.querySelector('#profile-skill') as HTMLInputElement;
    skillInput.value = 'java';
    skillInput.dispatchEvent(new Event('input'));
    tick(300);
    params.next(convertToParamMap({ profileId: '2' }));
    pendingSkill.next({ content: [{ id: 9, name: 'Stale Skill', categoryId: null, categoryCode: null, categoryName: null }], page: 0, size: 10, totalElements: 1, totalPages: 1 });

    expect(fixture.componentInstance.skillEditorMode).toBeNull();
    expect(fixture.componentInstance.skillMasterOptions).toEqual([]);
    expect(fixture.componentInstance.languageForm.controls.languageId.value).toBeNull();
    expect(fixture.componentInstance.skillForm.controls.skillId.value).toBeNull();
  }));

  it('preserves the selected edit Language when it is outside the displayed Master page', () => {
    profiles.listLanguageMaster.and.returnValue(of({ content: [{ id: 3, name: 'Japanese' }], page: 0, size: 10, totalElements: 1, totalPages: 1 }));
    fixture.componentInstance.languages = [language];
    fixture.componentInstance.startLanguageEdit(language);
    fixture.detectChanges();
    fixture.detectChanges();

    expect(fixture.componentInstance.languageOptions()).toContain(jasmine.objectContaining({ id: 2, name: 'English' }));
    expect((fixture.nativeElement.querySelector('#profile-language') as HTMLInputElement).value).toBe('English');
  });

  it('keeps the current edit Language immediately usable before a Master response arrives', () => {
    const pending = new Subject<LanguageMasterPage>();
    profiles.listLanguageMaster.and.returnValue(pending);
    fixture.componentInstance.languages = [language];
    fixture.componentInstance.startLanguageEdit(language);
    fixture.detectChanges();

    expect((fixture.nativeElement.querySelector('#profile-language') as HTMLInputElement).value).toBe('English');
    expect(fixture.componentInstance.languageForm.controls.languageId.value).toBe(2);
  });

  it('renders an already assigned Language as disabled instead of allowing a duplicate selection', () => {
    fixture.componentInstance.languages = [language];
    fixture.componentInstance.startLanguageCreate();
    fixture.componentInstance.languageMasterFocused();
    fixture.detectChanges();

    const duplicate = fixture.nativeElement.querySelector('[data-master-id="2"]') as HTMLButtonElement;
    expect(duplicate.disabled).toBeTrue();
    duplicate.click();
    expect(fixture.componentInstance.languageForm.controls.languageId.value).toBeNull();
  });

  it('maps backend duplicate errors to Language and keeps the editor draft retryable', () => {
    profiles.createProfileLanguage.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'PROFILE_LANGUAGE_ALREADY_EXISTS', message: 'Language already exists.' } })));
    fixture.componentInstance.startLanguageCreate();
    fixture.componentInstance.selectLanguageMasterOption(fixture.componentInstance.languageMasterOptions.find((option) => option.id === 3)!);
    fixture.componentInstance.languageForm.controls.level.setValue('INTERMEDIATE');
    fixture.componentInstance.submitLanguage();

    expect(fixture.componentInstance.languageEditorMode).toBe('create');
    expect(fixture.componentInstance.languageForm.controls.languageId.value).toBe(3);
    expect(fixture.componentInstance.languageForm.controls.languageId.errors?.['backend']).toBe('Language already exists.');
  });

  it('creates canonical Language data, applies the Profile version, invalidates Preview, and orders rows', () => {
    const created: ProfileLanguage = { profileLanguageId: 7, languageId: 3, languageName: 'Japanese', level: 'NATIVE' };
    profiles.createProfileLanguage.and.returnValue(of({ profileLanguage: created, profileVersion: 4 }));
    fixture.componentInstance.languages = [{ ...language, profileLanguageId: 4, languageName: 'english', level: 'ADVANCED' }];
    fixture.componentInstance.startLanguageCreate();
    fixture.componentInstance.selectLanguageMasterOption(fixture.componentInstance.languageMasterOptions.find((option) => option.id === 3)!);
    fixture.componentInstance.languageForm.controls.level.setValue('NATIVE');
    fixture.componentInstance.languageForm.markAsDirty();
    fixture.componentInstance.submitLanguage();

    expect(profiles.createProfileLanguage).toHaveBeenCalledWith('1', { languageId: 3, level: 'NATIVE', version: 3 });
    expect(context.applyMutationVersion).toHaveBeenCalledWith('1', 4);
    expect(fixture.componentInstance.languages).toEqual([created, { ...language, profileLanguageId: 4, languageName: 'english', level: 'ADVANCED' }]);
    expect(fixture.componentInstance.previewInvalidated).toBeTrue();
    expect(fixture.componentInstance.languageEditorMode).toBeNull();
  });

  it('supports Language Save & add another by clearing the controlled selection and proficiency', fakeAsync(() => {
    const created: ProfileLanguage = { profileLanguageId: 7, languageId: 3, languageName: 'Japanese', level: 'NATIVE' };
    profiles.createProfileLanguage.and.returnValue(of({ profileLanguage: created, profileVersion: 4 }));
    fixture.componentInstance.startLanguageCreate();
    fixture.detectChanges();
    fixture.componentInstance.selectLanguageMasterOption(fixture.componentInstance.languageMasterOptions.find((option) => option.id === 3)!);
    fixture.componentInstance.languageForm.controls.level.setValue('NATIVE');
    fixture.componentInstance.languageForm.markAsDirty();
    const languageInput = fixture.nativeElement.querySelector('#profile-language') as HTMLInputElement;
    const focus = spyOn(languageInput, 'focus').and.callThrough();

    fixture.componentInstance.submitLanguage('add-another');

    expect(fixture.componentInstance.languages).toContain(created);
    expect(fixture.componentInstance.languageEditorMode).toBe('create');
    expect(fixture.componentInstance.languageForm.getRawValue()).toEqual({ languageId: null, level: null });
    expect(fixture.componentInstance.languageInputValue).toBe('');
    expect(fixture.componentInstance.selectedLanguageMasterOption).toBeNull();
    expect(fixture.componentInstance.languageMasterState).toBe('results');
    expect(fixture.componentInstance.languageMasterOptions).toEqual(languageMasterPage.content);
    expect(fixture.componentInstance.languageForm.pristine).toBeTrue();
    expect(fixture.componentInstance.editSession.dirty()).toBeFalse();
    expect(fixture.componentInstance.languageMasterOptionDisabled({ id: 3, name: 'Japanese' })).toBeTrue();
    expect(notifications.showSuccess).toHaveBeenCalledWith('Language added successfully.');
    fixture.detectChanges();
    tick();
    expect(focus).toHaveBeenCalled();
  }));

  it('uses the returned Language Profile version for the next create', () => {
    const first: ProfileLanguage = { profileLanguageId: 7, languageId: 3, languageName: 'Japanese', level: 'NATIVE' };
    const second: ProfileLanguage = { profileLanguageId: 8, languageId: 4, languageName: 'French', level: 'ADVANCED' };
    context.applyMutationVersion.and.callFake((_profileId: string, version: number) => {
      context.detail.set({ ...detail, version, hasPreviewed: false });
      return true;
    });
    profiles.createProfileLanguage.and.returnValues(
      of({ profileLanguage: first, profileVersion: 4 }),
      of({ profileLanguage: second, profileVersion: 5 }),
    );
    fixture.componentInstance.startLanguageCreate();
    fixture.componentInstance.selectLanguageMasterOption(fixture.componentInstance.languageMasterOptions.find((option) => option.id === 3)!);
    fixture.componentInstance.languageForm.controls.level.setValue('NATIVE');
    fixture.componentInstance.submitLanguage('add-another');
    fixture.componentInstance.selectLanguageMasterOption({ id: 4, name: 'French' });
    fixture.componentInstance.languageForm.controls.level.setValue('ADVANCED');
    fixture.componentInstance.submitLanguage();

    expect(profiles.createProfileLanguage.calls.argsFor(0)[1]).toEqual(jasmine.objectContaining({ version: 3 }));
    expect(profiles.createProfileLanguage.calls.argsFor(1)[1]).toEqual(jasmine.objectContaining({ version: 4 }));
    expect(fixture.componentInstance.languageEditorMode).toBeNull();
  });

  it('updates canonical Language data and re-sorts after a proficiency change', () => {
    const updated: ProfileLanguage = { ...language, languageName: 'English', level: 'NATIVE' };
    profiles.updateProfileLanguage.and.returnValue(of({ profileLanguage: updated, profileVersion: 5 }));
    fixture.componentInstance.languages = [language, { profileLanguageId: 2, languageId: 3, languageName: 'Japanese', level: 'BEGINNER' }];
    fixture.componentInstance.startLanguageEdit(language);
    fixture.componentInstance.languageForm.controls.level.setValue('NATIVE');
    fixture.componentInstance.languageForm.markAsDirty();
    fixture.componentInstance.submitLanguage();

    expect(profiles.updateProfileLanguage).toHaveBeenCalledWith('1', 1, { languageId: 2, level: 'NATIVE', version: 3 });
    expect(fixture.componentInstance.languages).toEqual([updated, { profileLanguageId: 2, languageId: 3, languageName: 'Japanese', level: 'BEGINNER' }]);
    expect(notifications.showSuccess).toHaveBeenCalledWith('Language updated successfully.');
  });

  it('preserves a failed Language mutation draft and allows retry', () => {
    profiles.createProfileLanguage.and.returnValue(throwError(() => new HttpErrorResponse({ status: 503, error: { message: 'Service unavailable' } })));
    fixture.componentInstance.startLanguageCreate();
    fixture.componentInstance.selectLanguageMasterOption(fixture.componentInstance.languageMasterOptions.find((option) => option.id === 3)!);
    fixture.componentInstance.languageForm.controls.level.setValue('INTERMEDIATE');
    fixture.componentInstance.submitLanguage();

    expect(fixture.componentInstance.languageEditorMode).toBe('create');
    expect(fixture.componentInstance.languageForm.controls.languageId.value).toBe(3);
    expect(fixture.componentInstance.languageForm.dirty).toBeTrue();
    expect(fixture.componentInstance.languageErrorMessage).toBe('Service unavailable');

    profiles.createProfileLanguage.and.returnValue(of({ profileLanguage: { profileLanguageId: 9, languageId: 3, languageName: 'Japanese', level: 'INTERMEDIATE' }, profileVersion: 4 }));
    fixture.componentInstance.submitLanguage();
    expect(fixture.componentInstance.languageEditorMode).toBeNull();
  });

  it('ignores a stale Language mutation after Profile switching', () => {
    const pending = new Subject<{ profileLanguage: ProfileLanguage; profileVersion: number }>();
    profiles.createProfileLanguage.and.returnValue(pending);
    fixture.componentInstance.startLanguageCreate();
    fixture.componentInstance.selectLanguageMasterOption(fixture.componentInstance.languageMasterOptions.find((option) => option.id === 3)!);
    fixture.componentInstance.languageForm.controls.level.setValue('INTERMEDIATE');
    fixture.componentInstance.submitLanguage();
    context.selectedId.set('2');
    context.detail.set({ ...detail, id: 2 });
    params.next(convertToParamMap({ profileId: '2' }));
    pending.next({ profileLanguage: { profileLanguageId: 9, languageId: 3, languageName: 'Japanese', level: 'INTERMEDIATE' }, profileVersion: 4 });

    expect(fixture.componentInstance.languages).toEqual([]);
    expect(context.applyMutationVersion).not.toHaveBeenCalledWith('1', 4);
  });

  it('confirms Language deletion, protects duplicate submission, and removes the row', () => {
    const pending = new Subject<{ profileVersion: number }>();
    fixture.componentInstance.languages = [language];
    profiles.deleteProfileLanguage.and.returnValue(pending);
    fixture.detectChanges();
    fixture.componentInstance.openLanguageDeleteConfirmation(language);
    fixture.componentInstance.confirmLanguageDelete();
    fixture.componentInstance.confirmLanguageDelete();

    expect(profiles.deleteProfileLanguage).toHaveBeenCalledTimes(1);
    expect(profiles.deleteProfileLanguage).toHaveBeenCalledWith('1', 1, 3);
    pending.next({ profileVersion: 4 });
    pending.complete();

    expect(fixture.componentInstance.languages).toEqual([]);
    expect(fixture.componentInstance.languageDeleteConfirmation).toBeFalse();
    expect(fixture.componentInstance.languageMessage).toContain('Language deleted');
    expect(notifications.showSuccess).toHaveBeenCalledWith('Language deleted successfully.');
  });

  it('retains the Language row and confirmation after delete failure', () => {
    profiles.deleteProfileLanguage.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'Delete rejected' } })));
    fixture.componentInstance.languages = [language];
    fixture.componentInstance.openLanguageDeleteConfirmation(language);
    fixture.componentInstance.confirmLanguageDelete();

    expect(fixture.componentInstance.languages).toEqual([language]);
    expect(fixture.componentInstance.languageDeleteConfirmation).toBeTrue();
    expect(fixture.componentInstance.languageDeleteErrorMessage).toBe('Delete rejected');
  });

  it('blocks a stale Language delete until the latest Profile and Language list are loaded', () => {
    const reload = new Subject<ProfileDetail>();
    const refreshed = new Subject<ProfileLanguage[]>();
    profiles.deleteProfileLanguage.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'PROFILE_VERSION_CONFLICT' } })));
    context.reloadDetail.and.returnValue(reload);
    profiles.listProfileLanguages.and.returnValue(refreshed);
    fixture.componentInstance.languages = [language];
    fixture.componentInstance.openLanguageDeleteConfirmation(language);
    fixture.componentInstance.confirmLanguageDelete();

    expect(fixture.componentInstance.hasDeleteConflict('language')).toBeTrue();
    expect(fixture.componentInstance.languages).toEqual([language]);
    fixture.componentInstance.confirmLanguageDelete();
    expect(profiles.deleteProfileLanguage).toHaveBeenCalledTimes(1);

    fixture.componentInstance.reloadLatest();
    reload.next({ ...detail, version: 4 });
    refreshed.next([language]);
    context.detail.set({ ...detail, version: 4 });

    expect(fixture.componentInstance.hasDeleteConflict('language')).toBeFalse();
    expect(fixture.componentInstance.languageDeleteConfirmation).toBeTrue();
    profiles.deleteProfileLanguage.and.returnValue(of({ profileVersion: 5 }));
    fixture.componentInstance.confirmLanguageDelete();
    expect(profiles.deleteProfileLanguage).toHaveBeenCalledWith('1', 1, 4);
  });

  it('renders independent Certificate loading, empty, error, and populated states', () => {
    expect(fixture.nativeElement.querySelector('#workspace-section-certificates .empty-state')?.textContent).toContain('No Certificates exist');

    const loading = new Subject<Certificate[]>();
    profiles.listCertificates.and.returnValue(loading);
    params.next(convertToParamMap({ profileId: '2' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#workspace-section-certificates .section-state')?.textContent).toContain('Loading Certificate records');

    loading.next([certificate]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#workspace-section-certificates .record')?.textContent).toContain('AWS Developer');
    expect(fixture.nativeElement.querySelector('#workspace-section-certificates .empty-state')).toBeNull();

    const failed = new Subject<Certificate[]>();
    profiles.listCertificates.and.returnValue(failed);
    params.next(convertToParamMap({ profileId: '3' }));
    failed.error(new Error('unavailable'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#workspace-section-certificates [role="alert"]')?.textContent).toContain('could not load Certificate');
  });

  it('retries Certificate loading at section level', () => {
    const failed = new Subject<Certificate[]>();
    const retried = new Subject<Certificate[]>();
    profiles.listCertificates.and.returnValues(failed, retried);
    params.next(convertToParamMap({ profileId: '2' }));
    failed.error(new Error('unavailable'));
    fixture.detectChanges();

    fixture.componentInstance.retryCertificates();
    expect(fixture.componentInstance.certificateLoading).toBeTrue();
    retried.next([certificate]);
    fixture.detectChanges();

    expect(fixture.componentInstance.certificates).toEqual([certificate]);
    expect(fixture.nativeElement.querySelector('#workspace-section-certificates .record')?.textContent).toContain('AWS Developer');
  });

  it('ignores stale Certificate list responses after Profile switching', () => {
    const first = new Subject<Certificate[]>();
    const second = new Subject<Certificate[]>();
    profiles.listCertificates.calls.reset();
    profiles.listCertificates.and.returnValues(first, second);

    params.next(convertToParamMap({ profileId: '2' }));
    params.next(convertToParamMap({ profileId: '3' }));
    first.next([certificate]);

    expect(fixture.componentInstance.certificates).toEqual([]);
    second.next([{ ...certificate, id: 2, certificateName: 'Google Cloud' }]);
    expect(fixture.componentInstance.certificates).toEqual([{ ...certificate, id: 2, certificateName: 'Google Cloud' }]);
  });

  it('renders the required Certificate fields and prevents future Issue Dates', () => {
    openCertificateCreate();
    expect(fixture.nativeElement.querySelectorAll('.certificate-editor input').length).toBe(2);

    fillCertificateDraft({ issueDate: '2999-01-01' });
    fixture.componentInstance.submitCertificate();

    expect(profiles.createCertificate).not.toHaveBeenCalled();
    expect(fixture.componentInstance.certificateForm.controls.issueDate.errors?.['futureDate']).toBeTrue();
    expect(fixture.componentInstance.certificateForm.controls.issueDate.touched).toBeTrue();
  });

  it('creates canonical Certificate data, applies the Profile version, invalidates Preview, and orders rows', () => {
    const created: Certificate = { id: 7, certificateName: 'AWS Developer', issueDate: '2026-02-01' };
    profiles.createCertificate.and.returnValue(of({ certificate: created, profileVersion: 4 }));
    fixture.componentInstance.certificates = [{ ...certificate, id: 4, issueDate: '2025-01-01' }];
    openCertificateCreate();
    fillCertificateDraft({ certificateName: '  AWS Developer  ', issueDate: '2026-02-01' });

    fixture.componentInstance.submitCertificate();

    expect(profiles.createCertificate).toHaveBeenCalledWith('1', { certificateName: 'AWS Developer', issueDate: '2026-02-01', version: 3 });
    expect(context.applyMutationVersion).toHaveBeenCalledWith('1', 4);
    expect(fixture.componentInstance.certificates).toEqual([created, { ...certificate, id: 4, issueDate: '2025-01-01' }]);
    expect(fixture.componentInstance.previewInvalidated).toBeTrue();
    expect(fixture.componentInstance.certificateMessage).toBe('Certificate added successfully.');
    expect(fixture.componentInstance.certificateEditorMode).toBeNull();
  });

  it('supports repeated Certificate entry while preserving canonical ordering and a pristine reset', () => {
    const first: Certificate = { id: 7, certificateName: 'Newer', issueDate: '2026-02-01' };
    const second: Certificate = { id: 8, certificateName: 'Older', issueDate: '2025-01-01' };
    profiles.createCertificate.and.returnValues(
      of({ certificate: first, profileVersion: 4 }),
      of({ certificate: second, profileVersion: 5 }),
    );
    fixture.componentInstance.certificates = [{ ...certificate, id: 4, issueDate: '2024-01-01' }];
    openCertificateCreate();
    fillCertificateDraft({ certificateName: 'Newer', issueDate: '2026-02-01' });
    fixture.componentInstance.submitCertificate('add-another');

    expect(fixture.componentInstance.certificateEditorMode).toBe('create');
    expect(fixture.componentInstance.certificateForm.getRawValue()).toEqual({ certificateName: '', issueDate: '' });
    expect(fixture.componentInstance.certificateForm.pristine).toBeTrue();
    expect(fixture.componentInstance.editSession.dirty()).toBeFalse();
    expect(document.activeElement?.id).toBe('certificate-name');

    fillCertificateDraft({ certificateName: 'Older', issueDate: '2025-01-01' });
    fixture.componentInstance.submitCertificate();

    expect(fixture.componentInstance.certificates).toEqual([first, second, { ...certificate, id: 4, issueDate: '2024-01-01' }]);
    expect(fixture.componentInstance.certificateEditorMode).toBeNull();
    expect(notifications.showSuccess).toHaveBeenCalledWith('Certificate added successfully.');
  });

  it('updates and re-sorts a Certificate after a date change', () => {
    const updated: Certificate = { ...certificate, issueDate: '2026-03-01' };
    profiles.updateCertificate.and.returnValue(of({ certificate: updated, profileVersion: 5 }));
    fixture.componentInstance.certificates = [certificate, { id: 2, certificateName: 'Google Cloud', issueDate: '2026-01-01' }];
    fixture.componentInstance.startCertificateEdit(certificate);
    fillCertificateDraft({ issueDate: '2026-03-01' });

    fixture.componentInstance.submitCertificate();

    expect(profiles.updateCertificate).toHaveBeenCalledWith('1', 1, { certificateName: 'AWS Developer', issueDate: '2026-03-01', version: 3 });
    expect(fixture.componentInstance.certificates).toEqual([updated, { id: 2, certificateName: 'Google Cloud', issueDate: '2026-01-01' }]);
    expect(context.applyMutationVersion).toHaveBeenCalledWith('1', 5);
    expect(notifications.showSuccess).toHaveBeenCalledWith('Certificate updated successfully.');
  });

  it('rejects only an exact Name and Issue Date duplicate and allows the same Name on another date', () => {
    fixture.componentInstance.certificates = [certificate];
    openCertificateCreate();
    fillCertificateDraft({ certificateName: 'AWS Developer', issueDate: '2025-04-01' });
    fixture.componentInstance.submitCertificate();

    expect(profiles.createCertificate).not.toHaveBeenCalled();
    expect(fixture.componentInstance.certificateForm.controls.certificateName.errors?.['duplicate']).toContain('already exists');

    profiles.createCertificate.and.returnValue(of({ certificate: { ...certificate, id: 2, issueDate: '2024-04-01' }, profileVersion: 4 }));
    fixture.componentInstance.certificateForm.controls.issueDate.setValue('2024-04-01');
    fixture.componentInstance.certificateForm.markAsDirty();
    fixture.componentInstance.submitCertificate();

    expect(profiles.createCertificate).toHaveBeenCalledWith('1', { certificateName: 'AWS Developer', issueDate: '2024-04-01', version: 3 });
  });

  it('preserves a failed Certificate mutation draft and allows retry', () => {
    profiles.createCertificate.and.returnValue(throwError(() => new HttpErrorResponse({ status: 503, error: { message: 'Service unavailable' } })));
    openCertificateCreate();
    fillCertificateDraft({ certificateName: 'Draft Certificate' });

    fixture.componentInstance.submitCertificate();

    expect(fixture.componentInstance.certificateEditorMode).toBe('create');
    expect(fixture.componentInstance.certificateForm.controls.certificateName.value).toBe('Draft Certificate');
    expect(fixture.componentInstance.certificateForm.dirty).toBeTrue();
    expect(fixture.componentInstance.certificateErrorMessage).toBe('Service unavailable');

    profiles.createCertificate.and.returnValue(of({ certificate: { id: 8, certificateName: 'Draft Certificate', issueDate: '2025-04-01' }, profileVersion: 4 }));
    fixture.componentInstance.submitCertificate();
    expect(fixture.componentInstance.certificateEditorMode).toBeNull();
  });

  it('maps Certificate duplicate, future-date, and validation errors while keeping the editor retryable', () => {
    profiles.createCertificate.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'CERTIFICATE_ALREADY_EXISTS', message: 'Certificate already exists.' } })));
    openCertificateCreate();
    fillCertificateDraft({ certificateName: 'Entered Certificate' });
    fixture.componentInstance.submitCertificate();

    expect(fixture.componentInstance.certificateForm.controls.certificateName.errors?.['backend']).toBe('Certificate already exists.');
    expect(fixture.componentInstance.certificateEditorMode).toBe('create');

    profiles.createCertificate.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { errorCode: 'CERTIFICATE_ISSUE_DATE_IN_FUTURE', message: 'Date is in the future.' } })));
    fixture.componentInstance.submitCertificate();
    expect(fixture.componentInstance.certificateForm.controls.issueDate.errors?.['backend']).toBe('Date is in the future.');

    profiles.createCertificate.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { errorCode: 'VALIDATION_ERROR', data: { errors: [{ field: 'certificateName', message: 'Name is invalid' }] } } })));
    fixture.componentInstance.submitCertificate();
    expect(fixture.componentInstance.certificateForm.controls.certificateName.errors?.['backend']).toBe('Name is invalid');
  });

  it('preserves a Certificate conflict draft and reloads Profile plus Certificates', () => {
    const reload = new Subject<ProfileDetail>();
    const refreshedCertificates = new Subject<Certificate[]>();
    profiles.createCertificate.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'PROFILE_VERSION_CONFLICT', message: 'Profile changed elsewhere.' } })));
    context.reloadDetail.and.returnValue(reload);
    profiles.listCertificates.and.returnValue(refreshedCertificates);
    openCertificateCreate();
    fillCertificateDraft({ certificateName: 'Conflict Draft' });

    fixture.componentInstance.submitCertificate();
    expect(fixture.componentInstance.certificateConflict).toBeTrue();
    expect(fixture.componentInstance.certificateForm.controls.certificateName.value).toBe('Conflict Draft');

    fixture.componentInstance.reloadLatest();
    expect(fixture.componentInstance.reloadConfirmation).toBeTrue();
    fixture.componentInstance.confirmReloadLatest();
    expect(context.reloadDetail).toHaveBeenCalledWith('1');
    expect(fixture.componentInstance.certificateEditorMode).toBeNull();

    reload.next({ ...detail, version: 4 });
    refreshedCertificates.next([certificate]);
    fixture.detectChanges();
    expect(fixture.componentInstance.certificates).toEqual([certificate]);
    expect(fixture.componentInstance.certificateMessage).toContain('Latest Profile and Certificate data loaded');
  });

  it('confirms Certificate deletion, protects duplicate submission, and removes the row', () => {
    const pending = new Subject<{ profileVersion: number }>();
    fixture.componentInstance.certificates = [certificate];
    profiles.deleteCertificate.and.returnValue(pending);
    fixture.detectChanges();
    const deleteButton = fixture.nativeElement.querySelector('.certificate-delete-button') as HTMLButtonElement;
    expect(deleteButton.getAttribute('aria-label')).toBe('Delete AWS Developer (2025-04-01)');
    deleteButton.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.certificateDeleteConfirmation).toBeTrue();

    fixture.componentInstance.confirmCertificateDelete();
    fixture.componentInstance.confirmCertificateDelete();
    expect(profiles.deleteCertificate).toHaveBeenCalledTimes(1);
    expect(profiles.deleteCertificate).toHaveBeenCalledWith('1', 1, 3);
    expect(fixture.componentInstance.certificates).toEqual([certificate]);

    pending.next({ profileVersion: 4 });
    pending.complete();
    expect(fixture.componentInstance.certificates).toEqual([]);
    expect(fixture.componentInstance.certificateDeleteConfirmation).toBeFalse();
    expect(fixture.componentInstance.certificateMessage).toContain('Certificate deleted');
    expect(context.reloadDetail).not.toHaveBeenCalled();
    expect(notifications.showSuccess).toHaveBeenCalledWith('Certificate deleted successfully.');
  });

  it('retains a Certificate row and confirmation after delete failure', () => {
    profiles.deleteCertificate.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'Delete rejected' } })));
    fixture.componentInstance.certificates = [certificate];
    fixture.componentInstance.openCertificateDeleteConfirmation(certificate);
    fixture.componentInstance.confirmCertificateDelete();

    expect(fixture.componentInstance.certificates).toEqual([certificate]);
    expect(fixture.componentInstance.certificateDeleteConfirmation).toBeTrue();
    expect(fixture.componentInstance.certificateDeleteErrorMessage).toBe('Delete rejected');
  });

  it('requires explicit Certificate delete confirmation again after a version-conflict reload', () => {
    const reload = new Subject<ProfileDetail>();
    const refreshed = new Subject<Certificate[]>();
    profiles.deleteCertificate.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'PROFILE_VERSION_CONFLICT' } })));
    context.reloadDetail.and.returnValue(reload);
    profiles.listCertificates.and.returnValue(refreshed);
    fixture.componentInstance.certificates = [certificate];
    fixture.componentInstance.openCertificateDeleteConfirmation(certificate);
    fixture.componentInstance.confirmCertificateDelete();

    expect(fixture.componentInstance.hasDeleteConflict('certificate')).toBeTrue();
    expect(fixture.componentInstance.certificates).toEqual([certificate]);
    fixture.componentInstance.confirmCertificateDelete();
    expect(profiles.deleteCertificate).toHaveBeenCalledTimes(1);

    fixture.componentInstance.reloadLatest();
    reload.next({ ...detail, version: 4 });
    refreshed.next([certificate]);
    context.detail.set({ ...detail, version: 4 });

    expect(fixture.componentInstance.hasDeleteConflict('certificate')).toBeFalse();
    expect(fixture.componentInstance.certificateDeleteConfirmation).toBeTrue();
  });

  it('ignores a stale Certificate mutation after Profile switching', () => {
    const pending = new Subject<{ certificate: Certificate; profileVersion: number }>();
    profiles.createCertificate.and.returnValue(pending);
    openCertificateCreate();
    fillCertificateDraft({ certificateName: 'Pending Certificate' });
    fixture.componentInstance.submitCertificate();
    context.selectedId.set('2');
    context.detail.set({ ...detail, id: 2 });
    params.next(convertToParamMap({ profileId: '2' }));
    pending.next({ certificate: { id: 9, certificateName: 'Pending Certificate', issueDate: '2025-04-01' }, profileVersion: 4 });

    expect(fixture.componentInstance.certificates).toEqual([]);
    expect(context.applyMutationVersion).not.toHaveBeenCalledWith('1', 4);
  });

  it('renders independent Skill loading, error, retry, empty, and populated states', () => {
    expect(fixture.nativeElement.querySelector('#workspace-section-skills .empty-state')?.textContent).toContain('No Skills exist');

    const loading = new Subject<ProfileSkill[]>();
    profiles.listProfileSkills.and.returnValue(loading);
    params.next(convertToParamMap({ profileId: '2' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#workspace-section-skills .section-state')?.textContent).toContain('Loading Skill records');

    loading.next([skill]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#workspace-section-skills .skills-table')?.textContent).toContain('Java');

    const failed = new Subject<ProfileSkill[]>();
    profiles.listProfileSkills.and.returnValue(failed);
    params.next(convertToParamMap({ profileId: '3' }));
    failed.error(new Error('unavailable'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#workspace-section-skills [role="alert"]')?.textContent).toContain('could not load Skill');
  });

  it('retries Skill loading at section level', () => {
    const failed = new Subject<ProfileSkill[]>();
    const retried = new Subject<ProfileSkill[]>();
    profiles.listProfileSkills.and.returnValues(failed, retried);
    params.next(convertToParamMap({ profileId: '2' }));
    failed.error(new Error('unavailable'));
    fixture.detectChanges();

    fixture.componentInstance.retrySkills();
    expect(fixture.componentInstance.skillLoading).toBeTrue();
    retried.next([skill]);
    fixture.detectChanges();

    expect(fixture.componentInstance.skills).toEqual([skill]);
    expect(fixture.nativeElement.querySelector('#workspace-section-skills .skills-table')?.textContent).toContain('Java');
  });

  it('ignores stale Skill list responses after Profile switching', () => {
    const first = new Subject<ProfileSkill[]>();
    const second = new Subject<ProfileSkill[]>();
    profiles.listProfileSkills.calls.reset();
    profiles.listProfileSkills.and.returnValues(first, second);

    params.next(convertToParamMap({ profileId: '2' }));
    params.next(convertToParamMap({ profileId: '3' }));
    first.next([skill]);

    expect(fixture.componentInstance.skills).toEqual([]);
    second.next([{ ...skill, profileSkillId: 2, skillName: 'TypeScript' }]);
    expect(fixture.componentInstance.skills).toEqual([{ ...skill, profileSkillId: 2, skillName: 'TypeScript' }]);
  });

  it('searches Skill Master from the same field and exposes later pages with load more', fakeAsync(() => {
    const firstSearchPage: SkillMasterPage = { content: [{ id: 3, name: 'TypeScript', categoryId: 2, categoryCode: 'FRONTEND', categoryName: 'Frontend' }], page: 0, size: 10, totalElements: 11, totalPages: 2 };
    const secondPage: SkillMasterPage = { content: [{ id: 8, name: 'Kotlin', categoryId: 1, categoryCode: 'BACKEND', categoryName: 'Backend' }], page: 1, size: 10, totalElements: 11, totalPages: 2 };
    profiles.listSkillMaster.and.returnValues(of(skillMasterPage), of(firstSearchPage), of(secondPage));
    openSkillCreate();
    const input = fixture.nativeElement.querySelector('#profile-skill') as HTMLInputElement;
    input.value = '  kot ';
    input.dispatchEvent(new Event('input'));
    tick(300);
    fixture.detectChanges();

    expect(profiles.listSkillMaster).toHaveBeenCalledWith(0, 10, 'kot');
    expect(fixture.componentInstance.skillMasterTotalPages).toBe(2);
    fixture.componentInstance.loadMoreSkillMaster();
    expect(profiles.listSkillMaster).toHaveBeenCalledWith(1, 10, 'kot');
    expect(fixture.componentInstance.skillMasterOptions).toEqual([...firstSearchPage.content, ...secondPage.content]);
  }));

  it('debounces Skill Master typing and ignores a stale search response', fakeAsync(() => {
    const java = new Subject<SkillMasterPage>();
    const jav = new Subject<SkillMasterPage>();
    profiles.listSkillMaster.and.returnValues(of(skillMasterPage), java, jav);
    openSkillCreate();
    const input = fixture.nativeElement.querySelector('#profile-skill') as HTMLInputElement;

    input.value = 'jav';
    input.dispatchEvent(new Event('input'));
    tick(300);
    input.value = 'java';
    input.dispatchEvent(new Event('input'));
    tick(300);

    java.next({ content: [{ id: 4, name: 'JavaFX', categoryId: null, categoryCode: 'UI', categoryName: null }], page: 0, size: 10, totalElements: 1, totalPages: 1 });
    expect(fixture.componentInstance.skillMasterOptions).toEqual([]);
    jav.next({ content: [{ id: 5, name: 'JavaScript', categoryId: 2, categoryCode: 'FRONTEND', categoryName: 'Frontend' }], page: 0, size: 10, totalElements: 1, totalPages: 1 });
    expect(fixture.componentInstance.skillMasterOptions).toEqual([{ id: 5, name: 'JavaScript', categoryId: 2, categoryCode: 'FRONTEND', categoryName: 'Frontend' }]);
  }));

  it('reloads all Skill options when the search is cleared', fakeAsync(() => {
    const filtered: SkillMasterPage = { content: [{ id: 3, name: 'TypeScript', categoryId: 2, categoryCode: 'FRONTEND', categoryName: 'Frontend' }], page: 0, size: 10, totalElements: 1, totalPages: 1 };
    profiles.listSkillMaster.and.returnValues(of(skillMasterPage), of(filtered), of(skillMasterPage));
    openSkillCreate();
    const input = fixture.nativeElement.querySelector('#profile-skill') as HTMLInputElement;

    input.value = 'type';
    input.dispatchEvent(new Event('input'));
    tick(300);
    expect(fixture.componentInstance.skillMasterOptions).toEqual(filtered.content);

    input.value = '';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(profiles.listSkillMaster).toHaveBeenCalledWith(0, 10, '');
    expect(fixture.componentInstance.skillMasterOptions).toEqual(skillMasterPage.content);
    expect(fixture.componentInstance.skillMasterState).toBe('results');
    expect(fixture.nativeElement.querySelector('.master-combobox-popup')?.textContent).not.toContain('Type to search Skill Master');
  }));

  it('selects Skill from the combobox, derives Category context, and clears it with the Skill', fakeAsync(() => {
    openSkillCreate();
    const input = fixture.nativeElement.querySelector('#profile-skill') as HTMLInputElement;
    input.value = 'type';
    input.dispatchEvent(new Event('input'));
    tick(300);
    fixture.detectChanges();

    const option = fixture.nativeElement.querySelector('[data-master-id="3"]') as HTMLButtonElement;
    expect(option.textContent).toContain('Frontend');
    option.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.skillForm.controls.skillId.value).toBe(3);
    expect(fixture.componentInstance.selectedSkillCategory()).toBe('Frontend');
    expect(fixture.nativeElement.querySelector('#profile-skill-category')?.textContent).toContain('Frontend');

    input.value = 'typed only';
    input.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.skillForm.controls.skillId.value).toBeNull();
    expect(fixture.componentInstance.selectedSkillCategory()).toBe('—');

    fixture.componentInstance.skillForm.patchValue({ experienceYears: 2, lastUsed: '' });
    fixture.componentInstance.submitSkill();
    expect(profiles.createProfileSkill).not.toHaveBeenCalled();
    expect(fixture.componentInstance.skillForm.controls.skillId.errors?.['required']).toBeTrue();
    tick(300);
  }));

  it('represents Skill loading, empty, and retryable error states in the selector popup', fakeAsync(() => {
    const pending = new Subject<SkillMasterPage>();
    profiles.listSkillMaster.and.returnValues(of(skillMasterPage), pending);
    openSkillCreate();
    const input = fixture.nativeElement.querySelector('#profile-skill') as HTMLInputElement;
    input.value = 'missing';
    input.dispatchEvent(new Event('input'));
    tick(300);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.master-combobox-popup')?.textContent).toContain('Searching');

    pending.next({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.master-combobox-popup')?.textContent).toContain('No Skill Master matches');

    profiles.listSkillMaster.and.returnValue(throwError(() => new Error('unavailable')));
    input.value = 'failed';
    input.dispatchEvent(new Event('input'));
    tick(300);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.master-combobox-popup')?.textContent).toContain('Unable to load Skill Master');
    expect(fixture.nativeElement.querySelector('.master-combobox-popup .btn')?.textContent).toContain('Retry');
  }));

  it('preserves the selected edit Skill and derives Category when the Master option is outside the displayed page', () => {
    profiles.listSkillMaster.and.returnValue(of({ content: [{ id: 3, name: 'TypeScript', categoryId: 2, categoryCode: 'FRONTEND', categoryName: 'Frontend' }], page: 0, size: 10, totalElements: 1, totalPages: 1 }));
    fixture.componentInstance.skills = [skill];
    fixture.componentInstance.startSkillEdit(skill);
    fixture.detectChanges();

    expect(fixture.componentInstance.skillOptions()).toContain(jasmine.objectContaining({ id: 2, name: 'Java' }));
    expect((fixture.nativeElement.querySelector('#profile-skill') as HTMLInputElement).value).toBe('Java');
    expect(fixture.nativeElement.querySelector('#profile-skill-category')?.textContent).toContain('Backend');
    expect(fixture.nativeElement.querySelector('#profile-skill-category select, #profile-skill-category input')).toBeNull();
  });

  it('accepts decimal Experience Years, rejects negative and missing values, and keeps Last Used optional', () => {
    openSkillCreate();
    fillSkillDraft({ experienceYears: 7.5, lastUsed: '' });
    expect(fixture.componentInstance.skillForm.controls.experienceYears.valid).toBeTrue();
    expect(fixture.componentInstance.skillForm.controls.lastUsed.valid).toBeTrue();

    fixture.componentInstance.skillForm.controls.experienceYears.setValue(-1);
    fixture.componentInstance.submitSkill();
    expect(profiles.createProfileSkill).not.toHaveBeenCalled();
    expect(fixture.componentInstance.skillForm.controls.experienceYears.errors?.['min']).toBeTruthy();

    fixture.componentInstance.skillForm.controls.experienceYears.setValue(null);
    fixture.componentInstance.submitSkill();
    expect(fixture.componentInstance.skillForm.controls.experienceYears.errors?.['required']).toBeTrue();
  });

  it('rejects a future Last Used date and formats returned and absent dates', () => {
    openSkillCreate();
    fillSkillDraft({ lastUsed: '2999-01-01' });
    fixture.componentInstance.submitSkill();

    expect(profiles.createProfileSkill).not.toHaveBeenCalled();
    expect(fixture.componentInstance.skillForm.controls.lastUsed.errors?.['futureDate']).toBeTrue();
    expect(fixture.componentInstance.skillLastUsedLabel(skill)).toBe('Apr 2025');
    expect(fixture.componentInstance.skillLastUsedLabel({ ...skill, lastUsed: null })).toBe('—');
  });

  it('renders an already assigned Skill as disabled while keeping the current edit Skill usable', () => {
    fixture.componentInstance.skills = [skill];
    openSkillCreate();
    fillSkillDraft({ skillId: 2 });
    fixture.componentInstance.skillMasterFocused();
    fixture.detectChanges();

    const duplicate = fixture.nativeElement.querySelector('[data-master-id="2"]') as HTMLButtonElement;
    expect(duplicate.disabled).toBeTrue();

    fixture.componentInstance.discardEditing();
    fixture.componentInstance.startSkillEdit(skill);
    fixture.detectChanges();
    expect(fixture.componentInstance.skillForm.controls.skillId.value).toBe(2);
    expect(fixture.componentInstance.selectedSkillCategory()).toBe('Backend');
  });

  it('maps backend Skill duplicate and Master errors while preserving the retryable draft', () => {
    profiles.createProfileSkill.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'PROFILE_SKILL_ALREADY_EXISTS', message: 'Skill already exists.' } })));
    openSkillCreate();
    fillSkillDraft({ skillId: 3, experienceYears: 2 });
    fixture.componentInstance.submitSkill();

    expect(fixture.componentInstance.skillForm.controls.skillId.errors?.['backend']).toBe('Skill already exists.');
    expect(fixture.componentInstance.skillEditorMode).toBe('create');
    expect(fixture.componentInstance.skillForm.controls.experienceYears.value).toBe(2);

    profiles.createProfileSkill.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404, error: { errorCode: 'SKILL_NOT_FOUND', message: 'Skill is unavailable.' } })));
    fixture.componentInstance.submitSkill();
    expect(fixture.componentInstance.skillForm.controls.skillId.errors?.['backend']).toBe('Skill is unavailable.');
  });

  it('creates and updates canonical Skill data, applies the Profile version, invalidates Preview, and sorts rows', () => {
    const created: ProfileSkill = { ...skill, profileSkillId: 7, skillId: 3, skillName: 'TypeScript', categoryId: 2, categoryCode: 'FRONTEND', categoryName: 'Frontend', experienceYears: 8, lastUsed: null };
    profiles.createProfileSkill.and.returnValue(of({ profileSkill: created, profileVersion: 4 }));
    fixture.componentInstance.skills = [{ ...skill, experienceYears: 5 }];
    openSkillCreate();
    fillSkillDraft({ skillId: 3, experienceYears: 8, lastUsed: '' });
    fixture.componentInstance.submitSkill();

    expect(profiles.createProfileSkill).toHaveBeenCalledWith('1', { skillId: 3, experienceYears: 8, lastUsed: null, version: 3 });
    expect(context.applyMutationVersion).toHaveBeenCalledWith('1', 4);
    expect(fixture.componentInstance.skills).toEqual([created, { ...skill, experienceYears: 5 }]);
    expect(fixture.componentInstance.previewInvalidated).toBeTrue();
    expect(fixture.componentInstance.skillEditorMode).toBeNull();

    const updated: ProfileSkill = { ...created, skillName: 'TypeScript', experienceYears: 3 };
    profiles.updateProfileSkill.and.returnValue(of({ profileSkill: updated, profileVersion: 5 }));
    fixture.componentInstance.startSkillEdit(created);
    fillSkillDraft({ skillId: 3, experienceYears: 3, lastUsed: '' });
    fixture.componentInstance.submitSkill();

    expect(profiles.updateProfileSkill).toHaveBeenCalledWith('1', 7, { skillId: 3, experienceYears: 3, lastUsed: null, version: 3 });
    expect(fixture.componentInstance.skills).toEqual([{ ...skill, experienceYears: 5 }, updated]);
    expect(notifications.showSuccess).toHaveBeenCalledWith('Skill updated successfully.');
  });

  it('supports repeated Skill entry by clearing selection and derived Category while keeping decimal values valid', () => {
    const created: ProfileSkill = { ...skill, profileSkillId: 7, skillId: 3, skillName: 'TypeScript', categoryId: 2, categoryCode: 'FRONTEND', categoryName: 'Frontend', experienceYears: 7.5, lastUsed: null };
    profiles.createProfileSkill.and.returnValue(of({ profileSkill: created, profileVersion: 4 }));
    fixture.componentInstance.skills = [skill];
    openSkillCreate();
    fillSkillDraft({ skillId: 3, experienceYears: 7.5, lastUsed: '' });
    fixture.componentInstance.submitSkill('add-another');

    expect(fixture.componentInstance.skills).toContain(created);
    expect(fixture.componentInstance.skillEditorMode).toBe('create');
    expect(fixture.componentInstance.skillForm.getRawValue()).toEqual({ skillId: null, experienceYears: null, lastUsed: '' });
    expect(fixture.componentInstance.selectedSkillCategory()).toBe('—');
    expect(fixture.componentInstance.skillInputValue).toBe('');
    expect(fixture.componentInstance.skillMasterState).toBe('results');
    expect(fixture.componentInstance.skillMasterOptions).toEqual(skillMasterPage.content);
    expect(fixture.componentInstance.skillForm.pristine).toBeTrue();
    expect(fixture.componentInstance.editSession.dirty()).toBeFalse();
    expect(fixture.componentInstance.skillMasterOptionDisabled({ id: 3, name: 'TypeScript', categoryId: 2, categoryCode: 'FRONTEND', categoryName: 'Frontend' })).toBeTrue();
    expect(notifications.showSuccess).toHaveBeenCalledWith('Skill added successfully.');
    expect(document.activeElement?.id).toBe('profile-skill');
  });

  it('uses the returned Skill Profile version for the next create', () => {
    const first: ProfileSkill = { ...skill, profileSkillId: 7, skillId: 3, skillName: 'TypeScript', experienceYears: 7.5 };
    const second: ProfileSkill = { ...skill, profileSkillId: 8, skillId: 4, skillName: 'Kotlin', experienceYears: 2.5 };
    context.applyMutationVersion.and.callFake((_profileId: string, version: number) => {
      context.detail.set({ ...detail, version, hasPreviewed: false });
      return true;
    });
    profiles.createProfileSkill.and.returnValues(
      of({ profileSkill: first, profileVersion: 4 }),
      of({ profileSkill: second, profileVersion: 5 }),
    );
    openSkillCreate();
    fillSkillDraft({ skillId: 3, experienceYears: 7.5, lastUsed: '' });
    fixture.componentInstance.submitSkill('add-another');
    fixture.componentInstance.selectSkillMasterOption({ id: 4, name: 'Kotlin', categoryId: 1, categoryCode: 'BACKEND', categoryName: 'Backend' });
    fixture.componentInstance.skillForm.patchValue({ experienceYears: 2.5, lastUsed: '' });
    fixture.componentInstance.submitSkill();

    expect(profiles.createProfileSkill.calls.argsFor(0)[1]).toEqual(jasmine.objectContaining({ version: 3, experienceYears: 7.5 }));
    expect(profiles.createProfileSkill.calls.argsFor(1)[1]).toEqual(jasmine.objectContaining({ version: 4, experienceYears: 2.5 }));
    expect(fixture.componentInstance.skillEditorMode).toBeNull();
  });

  it('preserves a failed Skill mutation draft and allows retry', () => {
    profiles.createProfileSkill.and.returnValue(throwError(() => new HttpErrorResponse({ status: 503, error: { message: 'Service unavailable' } })));
    openSkillCreate();
    fillSkillDraft({ skillId: 3, experienceYears: 2 });
    fixture.componentInstance.submitSkill();

    expect(fixture.componentInstance.skillEditorMode).toBe('create');
    expect(fixture.componentInstance.skillForm.controls.skillId.value).toBe(3);
    expect(fixture.componentInstance.skillForm.dirty).toBeTrue();
    expect(fixture.componentInstance.skillErrorMessage).toBe('Service unavailable');

    profiles.createProfileSkill.and.returnValue(of({ profileSkill: { ...skill, profileSkillId: 9, skillId: 3, skillName: 'TypeScript', experienceYears: 2 }, profileVersion: 4 }));
    fixture.componentInstance.submitSkill();
    expect(fixture.componentInstance.skillEditorMode).toBeNull();
  });

  it('preserves a Skill conflict draft and reloads Profile plus Skills', () => {
    const reload = new Subject<ProfileDetail>();
    const refreshedSkills = new Subject<ProfileSkill[]>();
    profiles.createProfileSkill.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'PROFILE_VERSION_CONFLICT', message: 'Profile changed elsewhere.' } })));
    context.reloadDetail.and.returnValue(reload);
    profiles.listProfileSkills.and.returnValue(refreshedSkills);
    openSkillCreate();
    fillSkillDraft({ skillId: 3, experienceYears: 2 });

    fixture.componentInstance.submitSkill();
    expect(fixture.componentInstance.skillConflict).toBeTrue();
    expect(fixture.componentInstance.skillForm.controls.skillId.value).toBe(3);

    fixture.componentInstance.reloadLatest();
    expect(fixture.componentInstance.reloadConfirmation).toBeTrue();
    fixture.componentInstance.confirmReloadLatest();
    expect(context.reloadDetail).toHaveBeenCalledWith('1');
    expect(fixture.componentInstance.skillEditorMode).toBeNull();

    reload.next({ ...detail, version: 4 });
    refreshedSkills.next([skill]);
    fixture.detectChanges();
    expect(fixture.componentInstance.skills).toEqual([skill]);
    expect(fixture.componentInstance.skillMessage).toContain('Latest Profile and Skill data loaded');
  });

  it('confirms Skill deletion, protects duplicate submission, applies version, and removes the sorted row', () => {
    const pending = new Subject<{ profileVersion: number }>();
    fixture.componentInstance.skills = [skill];
    profiles.deleteProfileSkill.and.returnValue(pending);
    fixture.detectChanges();
    const deleteButton = fixture.nativeElement.querySelector('.skill-delete-button') as HTMLButtonElement;
    expect(deleteButton.getAttribute('aria-label')).toBe('Delete Java (7.5 years)');
    deleteButton.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.skillDeleteConfirmation).toBeTrue();

    fixture.componentInstance.confirmSkillDelete();
    fixture.componentInstance.confirmSkillDelete();
    expect(profiles.deleteProfileSkill).toHaveBeenCalledTimes(1);
    expect(profiles.deleteProfileSkill).toHaveBeenCalledWith('1', 1, 3);

    pending.next({ profileVersion: 4 });
    pending.complete();
    expect(fixture.componentInstance.skills).toEqual([]);
    expect(fixture.componentInstance.skillDeleteConfirmation).toBeFalse();
    expect(fixture.componentInstance.skillMessage).toContain('Skill deleted');
    expect(context.applyMutationVersion).toHaveBeenCalledWith('1', 4);
    expect(fixture.componentInstance.previewInvalidated).toBeTrue();
    expect(notifications.showSuccess).toHaveBeenCalledWith('Skill deleted successfully.');
  });

  it('retains a Skill row and confirmation after delete failure', () => {
    profiles.deleteProfileSkill.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'Delete rejected' } })));
    fixture.componentInstance.skills = [skill];
    fixture.componentInstance.openSkillDeleteConfirmation(skill);
    fixture.componentInstance.confirmSkillDelete();

    expect(fixture.componentInstance.skills).toEqual([skill]);
    expect(fixture.componentInstance.skillDeleteConfirmation).toBeTrue();
    expect(fixture.componentInstance.skillDeleteErrorMessage).toBe('Delete rejected');
  });

  it('recovers a stale Skill delete with refreshed ordering and no successful-delete feedback', () => {
    const reload = new Subject<ProfileDetail>();
    const refreshed = new Subject<ProfileSkill[]>();
    profiles.deleteProfileSkill.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'PROFILE_VERSION_CONFLICT' } })));
    context.reloadDetail.and.returnValue(reload);
    profiles.listProfileSkills.and.returnValue(refreshed);
    fixture.componentInstance.skills = [skill];
    fixture.componentInstance.openSkillDeleteConfirmation(skill);
    fixture.componentInstance.confirmSkillDelete();

    expect(fixture.componentInstance.hasDeleteConflict('skill')).toBeTrue();
    expect(fixture.componentInstance.skills).toEqual([skill]);
    expect(notifications.showSuccess).not.toHaveBeenCalled();
    fixture.componentInstance.confirmSkillDelete();
    expect(profiles.deleteProfileSkill).toHaveBeenCalledTimes(1);

    fixture.componentInstance.reloadLatest();
    reload.next({ ...detail, version: 4 });
    refreshed.next([skill]);
    context.detail.set({ ...detail, version: 4 });

    expect(fixture.componentInstance.hasDeleteConflict('skill')).toBeFalse();
    expect(fixture.componentInstance.skillDeleteConfirmation).toBeTrue();
  });

  it('ignores a stale Skill mutation after Profile switching', () => {
    const pending = new Subject<{ profileSkill: ProfileSkill; profileVersion: number }>();
    profiles.createProfileSkill.and.returnValue(pending);
    openSkillCreate();
    fillSkillDraft({ skillId: 3, experienceYears: 2 });
    fixture.componentInstance.submitSkill();
    context.selectedId.set('2');
    context.detail.set({ ...detail, id: 2 });
    params.next(convertToParamMap({ profileId: '2' }));
    pending.next({ profileSkill: { ...skill, profileSkillId: 9, skillId: 3, skillName: 'TypeScript', experienceYears: 2 }, profileVersion: 4 });

    expect(fixture.componentInstance.skills).toEqual([]);
    expect(context.applyMutationVersion).not.toHaveBeenCalledWith('1', 4);
  });

  it('renders independent Project loading, error, retry, empty, and populated states', () => {
    expect(fixture.nativeElement.querySelector('#workspace-section-projects .empty-state')?.textContent).toContain('No Project records exist');

    const loading = new Subject<Project[]>();
    profiles.listProjects.and.returnValue(loading);
    params.next(convertToParamMap({ profileId: '2' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#workspace-section-projects .section-state')?.textContent).toContain('Loading Project records');

    loading.next([project]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#workspace-section-projects .project-record')?.textContent).toContain('Order Platform');

    const failed = new Subject<Project[]>();
    profiles.listProjects.and.returnValue(failed);
    params.next(convertToParamMap({ profileId: '3' }));
    failed.error(new Error('unavailable'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#workspace-section-projects [role="alert"]')?.textContent).toContain('could not load Project');
  });

  it('retries Project loading at section level', () => {
    const failed = new Subject<Project[]>();
    const retried = new Subject<Project[]>();
    profiles.listProjects.and.returnValues(failed, retried);
    params.next(convertToParamMap({ profileId: '2' }));
    failed.error(new Error('unavailable'));
    fixture.detectChanges();

    fixture.componentInstance.retryProjects();
    expect(fixture.componentInstance.projectLoading).toBeTrue();
    retried.next([project]);
    fixture.detectChanges();

    expect(fixture.componentInstance.projects).toEqual([project]);
    expect(fixture.nativeElement.querySelector('#workspace-section-projects .project-record')?.textContent).toContain('Backend Lead');
  });

  it('preserves backend Project order and renders readable card details', () => {
    const completed: Project = { ...project, id: 2, name: 'Completed Platform', status: 'COMPLETED', startDate: '2024-02-01', endDate: '2025-03-15', teamSize: null, programmingLanguages: 'Java\nSQL', tools: 'PostgreSQL' };
    fixture.componentInstance.projects = [completed, project];
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.project-record');
    expect(cards.length).toBe(2);
    expect(cards[0].textContent).toContain('Feb 2024 – Mar 2025');
    expect(cards[0].textContent).not.toContain('Feb 1, 2024');
    expect(cards[0].textContent).not.toContain('Java\nSQL');
    expect(cards[0].textContent).not.toContain('people');
    expect(cards[1].textContent).toContain('Jan 2025 – Present');
    expect(cards[1].textContent).toContain('5 people');
    expect(cards[0].textContent).toContain('Show details');
    expect(cards[1].textContent).toContain('Show details');
  });

  it('expands Project details independently and preserves multiline content', () => {
    const completed: Project = { ...project, id: 2, name: 'Completed Platform', status: 'COMPLETED', startDate: '2024-02-01', endDate: '2025-03-15', teamSize: null, programmingLanguages: 'Java\nSQL', tools: 'PostgreSQL' };
    fixture.componentInstance.projects = [completed, project];
    fixture.detectChanges();

    const showButtons = fixture.nativeElement.querySelectorAll('.project-details-toggle') as NodeListOf<HTMLButtonElement>;
    showButtons[0].click();
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.project-record');
    expect(cards[0].querySelector('.project-details')?.textContent).toContain('Java\nSQL');
    expect(cards[0].querySelector('.project-details')?.textContent).toContain('Design services\nReview incidents');
    expect(cards[1].querySelector('.project-details')).toBeNull();
    expect((cards[0].querySelector('.project-details-toggle') as HTMLButtonElement).textContent).toContain('Hide details');
    expect((cards[1].querySelector('.project-details-toggle') as HTMLButtonElement).textContent).toContain('Show details');
  });

  it('clears Project expansion state on Profile switching and removes it after deletion', () => {
    const otherProject = { ...project, id: 2, name: 'Other Profile Project' };
    fixture.componentInstance.projects = [project];
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.project-details-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.project-details')).toBeTruthy();

    profiles.listProjects.and.returnValue(of([otherProject]));
    context.selectedId.set('2');
    context.detail.set({ ...detail, id: 2 });
    params.next(convertToParamMap({ profileId: '2' }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.project-details')).toBeNull();
    expect(fixture.nativeElement.querySelector('.project-record')?.textContent).toContain('Other Profile Project');

    context.selectedId.set('1');
    context.detail.set(detail);
    profiles.listProjects.and.returnValue(of([project]));
    params.next(convertToParamMap({ profileId: '1' }));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.project-details-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
    profiles.deleteProject.and.returnValue(of({ profileVersion: 4 }));
    profiles.listProjects.and.returnValue(of([]));
    fixture.componentInstance.openProjectDeleteConfirmation(project);
    fixture.componentInstance.confirmProjectDelete();
    fixture.detectChanges();

    expect(fixture.componentInstance.projects).toEqual([]);
    expect(fixture.nativeElement.querySelector('.project-details')).toBeNull();
  });

  it('navigates to the shared Project Editor routes for create and edit', () => {
    fixture.componentInstance.startProjectCreate();
    expect(router.navigate).toHaveBeenCalledWith(['/profiles', '1', 'projects', 'new']);

    fixture.componentInstance.projects = [project];
    fixture.componentInstance.startProjectEdit(project);
    expect(router.navigate).toHaveBeenCalledWith(['/profiles', '1', 'projects', 1]);
  });

  it('confirms Project deletion, protects duplicate submission, applies version, and reloads backend order', () => {
    const pending = new Subject<{ profileVersion: number }>();
    profiles.deleteProject.and.returnValue(pending);
    profiles.listProjects.and.returnValue(of([]));
    fixture.componentInstance.projects = [project];
    fixture.detectChanges();

    const deleteButton = fixture.nativeElement.querySelector('.project-delete-button') as HTMLButtonElement;
    expect(deleteButton.getAttribute('aria-label')).toBe('Delete Order Platform (Backend Lead)');
    deleteButton.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.projectDeleteConfirmation).toBeTrue();

    fixture.componentInstance.confirmProjectDelete();
    fixture.componentInstance.confirmProjectDelete();
    expect(profiles.deleteProject).toHaveBeenCalledTimes(1);
    expect(profiles.deleteProject).toHaveBeenCalledWith('1', 1, 3);

    pending.next({ profileVersion: 4 });
    pending.complete();

    expect(context.applyMutationVersion).toHaveBeenCalledWith('1', 4);
    expect(fixture.componentInstance.projects).toEqual([]);
    expect(fixture.componentInstance.projectDeleteConfirmation).toBeFalse();
    expect(fixture.componentInstance.projectMessage).toContain('Project deleted');
    expect(notifications.showSuccess).toHaveBeenCalledWith('Project deleted successfully.');
  });

  it('retains a Project row and confirmation after delete failure', () => {
    profiles.deleteProject.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'Delete rejected' } })));
    fixture.componentInstance.projects = [project];
    fixture.componentInstance.openProjectDeleteConfirmation(project);
    fixture.componentInstance.confirmProjectDelete();

    expect(fixture.componentInstance.projects).toEqual([project]);
    expect(fixture.componentInstance.projectDeleteConfirmation).toBeTrue();
    expect(fixture.componentInstance.projectDeleteErrorMessage).toBe('Delete rejected');
  });

  it('recovers a stale Project delete from the backend-ordered list before allowing a fresh retry', () => {
    const reload = new Subject<ProfileDetail>();
    const refreshed = new Subject<Project[]>();
    profiles.deleteProject.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'PROFILE_VERSION_CONFLICT' } })));
    context.reloadDetail.and.returnValue(reload);
    profiles.listProjects.and.returnValue(refreshed);
    fixture.componentInstance.projects = [project];
    fixture.componentInstance.openProjectDeleteConfirmation(project);
    fixture.componentInstance.confirmProjectDelete();

    expect(fixture.componentInstance.hasDeleteConflict('project')).toBeTrue();
    expect(fixture.componentInstance.projects).toEqual([project]);
    fixture.componentInstance.confirmProjectDelete();
    expect(profiles.deleteProject).toHaveBeenCalledTimes(1);

    fixture.componentInstance.reloadLatest();
    reload.next({ ...detail, version: 4 });
    refreshed.next([project]);
    context.detail.set({ ...detail, version: 4 });

    expect(fixture.componentInstance.hasDeleteConflict('project')).toBeFalse();
    expect(fixture.componentInstance.projectDeleteConfirmation).toBeTrue();
    profiles.deleteProject.and.returnValue(of({ profileVersion: 5 }));
    fixture.componentInstance.confirmProjectDelete();
    expect(profiles.deleteProject).toHaveBeenCalledWith('1', 1, 4);
  });

  it('ignores stale Project list and delete responses after Profile switching', () => {
    const first = new Subject<Project[]>();
    const second = new Subject<Project[]>();
    profiles.listProjects.calls.reset();
    profiles.listProjects.and.returnValues(first, second);
    params.next(convertToParamMap({ profileId: '2' }));
    params.next(convertToParamMap({ profileId: '3' }));
    first.next([project]);

    expect(fixture.componentInstance.projects).toEqual([]);
    second.next([{ ...project, id: 2, name: 'Other Profile Project' }]);
    expect(fixture.componentInstance.projects).toEqual([{ ...project, id: 2, name: 'Other Profile Project' }]);

    const pending = new Subject<{ profileVersion: number }>();
    profiles.deleteProject.and.returnValue(pending);
    profiles.listProjects.and.returnValue(of([]));
    context.selectedId.set('1');
    context.detail.set(detail);
    params.next(convertToParamMap({ profileId: '1' }));
    fixture.componentInstance.projects = [project];
    fixture.componentInstance.openProjectDeleteConfirmation(project);
    fixture.componentInstance.confirmProjectDelete();
    params.next(convertToParamMap({ profileId: '2' }));
    pending.next({ profileVersion: 4 });

    expect(context.applyMutationVersion).not.toHaveBeenCalledWith('1', 4);
  });

  it('includes Skill editor dirtiness in unsaved navigation confirmation', () => {
    openSkillCreate();
    fillSkillDraft({ skillId: 3, experienceYears: 2 });

    const navigation = fixture.componentInstance.editSession.requestNavigation('/profiles/2');
    fixture.detectChanges();

    expect(fixture.componentInstance.editSession.dirty()).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Your unsaved editor changes will be discarded');
    fixture.componentInstance.discardPendingNavigation();
    expect(fixture.componentInstance.editSession.dirty()).toBeFalse();
    expect(fixture.componentInstance.skillEditorMode).toBeNull();
    void navigation;
  });

  it('includes Certificate editor dirtiness in unsaved navigation confirmation', () => {
    openCertificateCreate();
    fillCertificateDraft({ certificateName: 'Unsaved Certificate' });

    const navigation = fixture.componentInstance.editSession.requestNavigation('/profiles/2');
    fixture.detectChanges();

    expect(fixture.componentInstance.editSession.dirty()).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Your unsaved editor changes will be discarded');
    fixture.componentInstance.discardPendingNavigation();
    expect(fixture.componentInstance.editSession.dirty()).toBeFalse();
    expect(fixture.componentInstance.certificateEditorMode).toBeNull();
    void navigation;
  });

  it('includes Language editor dirtiness in unsaved navigation confirmation', () => {
    fixture.componentInstance.startLanguageCreate();
    fixture.componentInstance.selectLanguageMasterOption(fixture.componentInstance.languageMasterOptions.find((option) => option.id === 3)!);
    fixture.componentInstance.languageForm.controls.level.setValue('INTERMEDIATE');

    const navigation = fixture.componentInstance.editSession.requestNavigation('/profiles/2');
    fixture.detectChanges();

    expect(fixture.componentInstance.editSession.dirty()).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Your unsaved editor changes will be discarded');
    fixture.componentInstance.discardPendingNavigation();
    expect(fixture.componentInstance.editSession.dirty()).toBeFalse();
    expect(fixture.componentInstance.languageEditorMode).toBeNull();
    void navigation;
  });

  it('includes Education editor dirtiness in unsaved navigation confirmation', () => {
    openEducationCreate();
    fillEducationDraft({ schoolName: 'Unsaved School' });

    const navigation = fixture.componentInstance.editSession.requestNavigation('/profiles/2');
    fixture.detectChanges();

    expect(fixture.componentInstance.editSession.dirty()).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Your unsaved editor changes will be discarded');
    fixture.componentInstance.discardPendingNavigation();
    expect(fixture.componentInstance.editSession.dirty()).toBeFalse();
    expect(fixture.componentInstance.educationEditorMode).toBeNull();
    void navigation;
  });

  it('directs empty workspace users to the Profile menu in the shared shell', () => {
    params.next(convertToParamMap({}));
    context.summaries.set([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.create-profile')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Use the Profile menu above to create one.');
  });
});
