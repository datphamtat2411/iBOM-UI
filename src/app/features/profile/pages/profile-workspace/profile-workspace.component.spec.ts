import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';

import { ProfileDetail, ProfileSummary } from '../../models/profile.models';
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
    isNotFound: jasmine.Spy;
  };
  let profiles: { update: jasmine.Spy; delete: jasmine.Spy };

  const summary: ProfileSummary = { id: 1, profileName: 'Backend CV', firstName: 'A', lastName: 'User', jobTitle: 'Engineer', updatedAt: '2026-01-01' };
  const detail: ProfileDetail = { ...summary, yearsOfExperience: 5, personality: 'Methodical', technicalSummary: 'Angular and Java', hasPreviewed: true, version: 3, createdAt: '2026-01-01' };

  beforeEach(async () => {
    params = new BehaviorSubject(convertToParamMap({ profileId: '1' }));
    profiles = { update: jasmine.createSpy('update'), delete: jasmine.createSpy('delete') };
    router = { navigate: jasmine.createSpy('navigate') };
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
      isNotFound: jasmine.createSpy('isNotFound').and.returnValue(false),
    };
    await TestBed.configureTestingModule({
      imports: [ProfileWorkspaceComponent],
      providers: [
        { provide: ProfileService, useValue: profiles },
        { provide: ProfileContextService, useValue: context },
        { provide: ActivatedRoute, useValue: { paramMap: params } },
        { provide: Router, useValue: router },
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
    expect(fixture.componentInstance.saveMessage).toContain('Preview is no longer current');
    expect(fixture.nativeElement.textContent).toContain('Preview is no longer current');
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

  it('cancels deletion without discarding a dirty About Me draft', () => {
    context.summaries.set([summary, { ...summary, id: 2, profileName: 'Frontend CV' }]);
    fixture.detectChanges();
    openEditor();
    markDraft();

    fixture.componentInstance.openDeleteConfirmation();
    fixture.detectChanges();
    fixture.componentInstance.cancelDelete();

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

  it('preserves the current Profile and draft after an ordinary delete failure and allows retry', () => {
    const remaining = { ...summary, id: 2, profileName: 'Frontend CV' };
    profiles.delete.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'PROFILE_LAST_ACTIVE_CANNOT_DELETE', message: 'At least one active Profile is required.' } })));
    context.summaries.set([summary, remaining]);
    fixture.detectChanges();
    openEditor();
    markDraft();
    fixture.componentInstance.openDeleteConfirmation();
    fixture.componentInstance.confirmDelete();

    expect(fixture.componentInstance.deleteConfirmation).toBeTrue();
    expect(fixture.componentInstance.isEditing).toBeTrue();
    expect(fixture.componentInstance.editForm.controls.firstName.value).toBe('Changed');
    expect(fixture.componentInstance.editSession.dirty()).toBeTrue();
    expect(context.detail()).toEqual(detail);
    expect(fixture.componentInstance.deleteErrorMessage).toBe('At least one active Profile is required.');
    expect(context.refreshSummariesAndSelectFirst).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();

    profiles.delete.and.returnValue(of(undefined));
    context.refreshSummariesAndSelectFirst.and.returnValue(of(remaining));
    fixture.componentInstance.confirmDelete();
    expect(profiles.delete).toHaveBeenCalledTimes(2);
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

  it('directs empty workspace users to the Profile menu in the shared shell', () => {
    params.next(convertToParamMap({}));
    context.summaries.set([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.create-profile')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Use the Profile menu above to create one.');
  });
});
