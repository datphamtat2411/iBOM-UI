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
    isNotFound: jasmine.Spy;
  };
  let profiles: { update: jasmine.Spy };

  const summary: ProfileSummary = { id: 1, profileName: 'Backend CV', firstName: 'A', lastName: 'User', jobTitle: 'Engineer', updatedAt: '2026-01-01' };
  const detail: ProfileDetail = { ...summary, yearsOfExperience: 5, personality: 'Methodical', technicalSummary: 'Angular and Java', hasPreviewed: true, version: 3, createdAt: '2026-01-01' };

  beforeEach(async () => {
    params = new BehaviorSubject(convertToParamMap({ profileId: '1' }));
    profiles = { update: jasmine.createSpy('update') };
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
      isNotFound: jasmine.createSpy('isNotFound').and.returnValue(false),
    };
    await TestBed.configureTestingModule({
      imports: [ProfileWorkspaceComponent],
      providers: [
        { provide: ProfileService, useValue: profiles },
        { provide: ProfileContextService, useValue: context },
        { provide: ActivatedRoute, useValue: { paramMap: params } },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
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

    expect(fixture.nativeElement.querySelector('.edit-about-button')?.textContent.trim()).toBe('Edit');
    expect(fixture.nativeElement.querySelector('.readonly-value')?.textContent).toContain('Backend CV');
    expect(fixture.nativeElement.querySelectorAll('.about-editor input, .about-editor textarea').length).toBe(6);
    expect(fixture.componentInstance.editForm.getRawValue()).toEqual({ firstName: 'A', lastName: 'User', jobTitle: 'Engineer', yearsOfExperience: 5, personality: 'Methodical', technicalSummary: 'Angular and Java' });
  });

  it('keeps Job Title and Years of Experience in one context group', () => {
    const group = fixture.nativeElement.querySelector('.fact-group') as HTMLElement;

    expect(group?.textContent).toContain('Job Title');
    expect(group?.textContent).toContain('Years of Experience');
    expect(group?.querySelectorAll('.fact').length).toBe(2);
  });

  it('validates all editable fields before submitting', () => {
    openEditor();
    fixture.componentInstance.editForm.reset({ firstName: '', lastName: '', jobTitle: '', yearsOfExperience: -1, personality: '', technicalSummary: '' });

    fixture.componentInstance.submit();

    expect(profiles.update).not.toHaveBeenCalled();
    expect(fixture.componentInstance.editForm.controls.firstName.touched).toBeTrue();
    expect(fixture.componentInstance.editForm.controls.yearsOfExperience.errors?.['min']).toBeTruthy();
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

  it('directs empty workspace users to the Profile menu in the shared shell', () => {
    params.next(convertToParamMap({}));
    context.summaries.set([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.create-profile')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Use the Profile menu above to create one.');
  });
});
