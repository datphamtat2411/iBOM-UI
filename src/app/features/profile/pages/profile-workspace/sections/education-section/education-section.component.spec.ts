import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Subject, of, throwError } from 'rxjs';

import { NotificationService } from '../../../../../../core/notifications/notification.service';
import { Education, ProfileDetail } from '../../../../models/profile.models';
import { ProfileContextService } from '../../../../services/profile-context.service';
import { ProfileService } from '../../../../services/profile.service';
import { EducationSectionComponent } from './education-section.component';

describe('EducationSectionComponent', () => {
  let fixture: ComponentFixture<EducationSectionComponent>;
  let context: {
    selectedId: ReturnType<typeof signal>;
    detail: ReturnType<typeof signal>;
    reloadDetail: jasmine.Spy;
    applyMutationVersion: jasmine.Spy;
  };
  let profiles: { listEducations: jasmine.Spy; createEducation: jasmine.Spy; updateEducation: jasmine.Spy; deleteEducation: jasmine.Spy };
  let notifications: { showSuccess: jasmine.Spy };
  const profile: ProfileDetail = {
    id: 1,
    profileName: 'Backend CV',
    firstName: 'A',
    lastName: 'User',
    jobTitle: 'Engineer',
    yearsOfExperience: 5,
    personality: null,
    technicalSummary: null,
    hasPreviewed: true,
    version: 3,
    updatedAt: '2026-01-01',
    createdAt: '2026-01-01',
  };
  const education: Education = { id: 1, schoolName: 'North University', degree: 'BSc Computer Science', fieldOfStudy: 'Computing', startDate: '2020-09-01', endDate: null, status: 'ONGOING' };

  beforeEach(async () => {
    context = {
      selectedId: signal('1'),
      detail: signal<ProfileDetail | null>(profile),
      reloadDetail: jasmine.createSpy('reloadDetail'),
      applyMutationVersion: jasmine.createSpy('applyMutationVersion').and.returnValue(true),
    };
    profiles = {
      listEducations: jasmine.createSpy('listEducations').and.returnValue(of([education])),
      createEducation: jasmine.createSpy('createEducation'),
      updateEducation: jasmine.createSpy('updateEducation'),
      deleteEducation: jasmine.createSpy('deleteEducation'),
    };
    notifications = { showSuccess: jasmine.createSpy('showSuccess') };
    await TestBed.configureTestingModule({
      imports: [EducationSectionComponent],
      providers: [
        { provide: ProfileContextService, useValue: context },
        { provide: ProfileService, useValue: profiles },
        { provide: NotificationService, useValue: notifications },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(EducationSectionComponent);
    fixture.componentInstance.profile = profile;
    fixture.detectChanges();
    fixture.componentInstance.resetForProfile();
  });

  function openCreate(): void {
    fixture.componentInstance.startEducationCreate();
    fixture.detectChanges();
  }

  function fillDraft(overrides: Partial<{ schoolName: string; degree: string; fieldOfStudy: string; startDate: string; endDate: string; status: 'ONGOING' | 'COMPLETED' }> = {}): void {
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

  it('loads and orders Education records at the child boundary', () => {
    const later = { ...education, id: 2, degree: 'MSc' };
    profiles.listEducations.and.returnValue(of([later, education]));
    fixture.componentInstance.resetForProfile();

    expect(fixture.componentInstance.educations.map((item) => item.id)).toEqual([1, 2]);
    expect(profiles.listEducations).toHaveBeenCalledWith('1');
  });

  it('keeps list responses from an old Profile out of the current child state', () => {
    const first = new Subject<Education[]>();
    const second = new Subject<Education[]>();
    profiles.listEducations.and.returnValues(first, second);
    fixture.componentInstance.resetForProfile();
    context.selectedId.set('2');
    context.detail.set({ ...profile, id: 2, profileName: 'Frontend CV' });
    fixture.componentInstance.profile = { ...profile, id: 2, profileName: 'Frontend CV' };
    fixture.detectChanges();
    fixture.componentInstance.resetForProfile();
    first.next([education]);
    second.next([{ ...education, id: 2, degree: 'MSc' }]);

    expect(fixture.componentInstance.educations).toEqual([{ ...education, id: 2, degree: 'MSc' }]);
  });

  it('validates required fields, completed End Date, and date range', () => {
    openCreate();
    fixture.componentInstance.submitEducation();
    expect(profiles.createEducation).not.toHaveBeenCalled();
    expect(fixture.componentInstance.educationForm.controls.schoolName.errors?.['required']).toBeTrue();

    fillDraft({ status: 'COMPLETED', endDate: '' });
    fixture.componentInstance.submitEducation();
    expect(fixture.componentInstance.educationForm.controls.endDate.errors?.['required']).toBeTrue();

    fillDraft({ status: 'COMPLETED', endDate: '2019-06-30' });
    fixture.componentInstance.submitEducation();
    expect(fixture.componentInstance.educationForm.errors?.['dateRange']).toBeTrue();
    expect(fixture.componentInstance.educationFieldError('endDate')).toContain('on or after');
  });

  it('clears and disables End Date for Ongoing without restoring it for Completed', () => {
    openCreate();
    fillDraft({ status: 'COMPLETED', endDate: '2024-06-30' });
    fixture.componentInstance.educationForm.controls.status.setValue('ONGOING');
    expect(fixture.componentInstance.educationForm.controls.endDate.value).toBe('');
    expect(fixture.componentInstance.educationForm.controls.endDate.disabled).toBeTrue();
    fixture.componentInstance.educationForm.controls.status.setValue('COMPLETED');
    expect(fixture.componentInstance.educationForm.controls.endDate.value).toBe('');
    expect(fixture.componentInstance.educationForm.controls.endDate.errors?.['required']).toBeTrue();
  });

  it('creates Education with the canonical version and supports Save & add another', () => {
    const first = { ...education, id: 7, schoolName: 'First School' };
    const second = { ...education, id: 8, schoolName: 'Second School' };
    context.applyMutationVersion.and.callFake((_profileId: string, version: number) => {
      context.detail.set({ ...profile, version, hasPreviewed: false });
      return true;
    });
    profiles.createEducation.and.returnValues(
      of({ education: first, profileVersion: 4 }),
      of({ education: second, profileVersion: 5 }),
    );
    openCreate();
    fillDraft({ schoolName: 'First School' });
    fixture.componentInstance.submitEducation('add-another');
    expect(fixture.componentInstance.educationEditorMode).toBe('create');
    expect(fixture.componentInstance.educationForm.pristine).toBeTrue();

    fillDraft({ schoolName: 'Second School' });
    fixture.componentInstance.submitEducation();

    expect(profiles.createEducation.calls.argsFor(0)[1]).toEqual(jasmine.objectContaining({ version: 3 }));
    expect(profiles.createEducation.calls.argsFor(1)[1]).toEqual(jasmine.objectContaining({ version: 4 }));
    expect(fixture.componentInstance.educations).toContain(first);
    expect(fixture.componentInstance.educations).toContain(second);
    expect(fixture.componentInstance.editSession.dirty()).toBeFalse();
  });

  it('preserves an edit draft after failed validation and ordinary mutation responses', () => {
    openCreate();
    fillDraft({ schoolName: 'Draft School' });
    profiles.createEducation.and.returnValue(throwError(() => new HttpErrorResponse({ status: 503, error: { message: 'Service unavailable' } })));
    fixture.componentInstance.submitEducation();

    expect(fixture.componentInstance.educationEditorMode).toBe('create');
    expect(fixture.componentInstance.educationForm.controls.schoolName.value).toBe('Draft School');
    expect(fixture.componentInstance.educationForm.dirty).toBeTrue();
    expect(fixture.componentInstance.educationErrorMessage).toBe('Service unavailable');

    profiles.createEducation.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { errorCode: 'VALIDATION_ERROR', data: { errors: [{ field: 'schoolName', message: 'School is invalid' }] } } })));
    fixture.componentInstance.submitEducation();
    expect(fixture.componentInstance.educationForm.controls.schoolName.errors?.['backend']).toBe('School is invalid');
  });

  it('chains stale-save conflict reloads and keeps the draft until explicit discard', () => {
    const latest = new Subject<ProfileDetail>();
    const refreshed = new Subject<Education[]>();
    context.reloadDetail.and.returnValue(latest);
    profiles.createEducation.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'PROFILE_VERSION_CONFLICT' } })));
    profiles.listEducations.and.returnValue(refreshed);
    openCreate();
    fillDraft({ schoolName: 'Conflict Draft' });
    fixture.componentInstance.submitEducation();

    expect(fixture.componentInstance.educationConflict).toBeTrue();
    expect(fixture.componentInstance.educationForm.controls.schoolName.value).toBe('Conflict Draft');
    fixture.componentInstance.reloadLatest();
    expect(fixture.componentInstance.reloadConfirmation).toBeTrue();
    fixture.componentInstance.confirmReloadLatest();
    latest.next({ ...profile, version: 4 });
    refreshed.next([education]);

    expect(fixture.componentInstance.educationConflict).toBeFalse();
    expect(fixture.componentInstance.educationEditorMode).toBeNull();
    expect(fixture.componentInstance.educations).toEqual([education]);
  });

  it('deletes Education with the canonical version and emits mutation success', () => {
    const success = jasmine.createSpy('success');
    fixture.componentInstance.mutationSucceeded.subscribe(success);
    profiles.deleteEducation.and.returnValue(of({ profileVersion: 4 }));
    fixture.componentInstance.openEducationDeleteConfirmation(education);
    fixture.componentInstance.confirmEducationDelete();

    expect(profiles.deleteEducation).toHaveBeenCalledWith('1', 1, 3);
    expect(context.applyMutationVersion).toHaveBeenCalledWith('1', 4);
    expect(fixture.componentInstance.educations).toEqual([]);
    expect(success).toHaveBeenCalledWith({ profileId: '1', previewInvalidated: true });
    expect(notifications.showSuccess).toHaveBeenCalledWith('Education deleted successfully.');
  });

  it('requires latest data before retrying a delete version conflict', () => {
    const latest = new Subject<ProfileDetail>();
    const refreshed = new Subject<Education[]>();
    context.reloadDetail.and.returnValue(latest);
    profiles.listEducations.and.returnValue(refreshed);
    profiles.deleteEducation.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'PROFILE_VERSION_CONFLICT' } })));
    fixture.componentInstance.openEducationDeleteConfirmation(education);
    fixture.componentInstance.confirmEducationDelete();

    expect(fixture.componentInstance.hasDeleteConflict()).toBeTrue();
    fixture.componentInstance.confirmEducationDelete();
    expect(profiles.deleteEducation).toHaveBeenCalledTimes(1);
    fixture.componentInstance.reloadLatest();
    context.detail.set({ ...profile, version: 4 });
    latest.next({ ...profile, version: 4 });
    refreshed.next([education]);

    expect(fixture.componentInstance.hasDeleteConflict()).toBeFalse();
    expect(fixture.componentInstance.educationDeleteConfirmation).toBeTrue();
    profiles.deleteEducation.and.returnValue(of({ profileVersion: 5 }));
    fixture.componentInstance.confirmEducationDelete();
    expect(profiles.deleteEducation).toHaveBeenCalledWith('1', 1, 4);
  });

  it('ignores a stale Education mutation after switching Profile', () => {
    const pending = new Subject<{ education: Education; profileVersion: number }>();
    profiles.createEducation.and.returnValue(pending);
    openCreate();
    fillDraft({ schoolName: 'Old Profile' });
    fixture.componentInstance.submitEducation();
    context.selectedId.set('2');
    context.detail.set({ ...profile, id: 2 });
    pending.next({ education: { ...education, id: 9 }, profileVersion: 4 });

    expect(fixture.componentInstance.educations).toEqual([education]);
    expect(context.applyMutationVersion).not.toHaveBeenCalledWith('1', 4);
    expect(notifications.showSuccess).not.toHaveBeenCalled();
  });

  it('keeps Education drafts in the application edit session and clears them on discard', () => {
    openCreate();
    fillDraft({ schoolName: 'Unsaved School' });
    expect(fixture.componentInstance.editSession.dirty()).toBeTrue();
    fixture.componentInstance.cancelEditing();
    expect(fixture.componentInstance.cancelConfirmation).toBeTrue();
    fixture.componentInstance.discardEditing();
    expect(fixture.componentInstance.editSession.dirty()).toBeFalse();
    expect(fixture.componentInstance.educationEditorMode).toBeNull();
  });
});
