import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { ProfileContextService } from '../../services/profile-context.service';
import { ProfileService } from '../../services/profile.service';
import { ProfileCreateComponent } from './profile-create.component';

describe('ProfileCreateComponent', () => {
  let fixture: ComponentFixture<ProfileCreateComponent>;
  let profiles: { create: jasmine.Spy };
  let context: { summaries: ReturnType<typeof signal>; summariesLoading: ReturnType<typeof signal>; selectedId: ReturnType<typeof signal>; loadSummaries: jasmine.Spy; refreshSummariesAndSelect: jasmine.Spy };

  beforeEach(async () => {
    profiles = { create: jasmine.createSpy('create') };
    context = { summaries: signal([]), summariesLoading: signal(false), selectedId: signal('1'), loadSummaries: jasmine.createSpy('loadSummaries'), refreshSummariesAndSelect: jasmine.createSpy('refreshSummariesAndSelect').and.returnValue(of(undefined)) };
    await TestBed.configureTestingModule({ imports: [ProfileCreateComponent], providers: [provideRouter([]), { provide: ProfileService, useValue: profiles }, { provide: ProfileContextService, useValue: context }] }).compileComponents();
    fixture = TestBed.createComponent(ProfileCreateComponent);
    fixture.detectChanges();
  });

  function fillValidForm(): void {
    fixture.componentInstance.createForm.setValue({ profileName: 'New CV', firstName: 'A', lastName: 'User', jobTitle: 'Engineer', yearsOfExperience: 4, personality: 'Methodical', technicalSummary: 'Angular' });
  }

  it('renders all seven backend-backed fields and validates them before submission', () => {
    expect(fixture.nativeElement.querySelectorAll('input, textarea').length).toBe(7);
    fixture.componentInstance.submit();
    expect(profiles.create).not.toHaveBeenCalled();
    expect(fixture.componentInstance.createForm.controls.yearsOfExperience.touched).toBeTrue();
  });

  it('creates a Profile with both optional fields empty', () => {
    profiles.create.and.returnValue(of({ id: 2 }));
    fixture.componentInstance.createForm.setValue({ profileName: 'New CV', firstName: 'A', lastName: 'User', jobTitle: 'Engineer', yearsOfExperience: 4, personality: '', technicalSummary: '' });

    fixture.componentInstance.submit();

    expect(profiles.create).toHaveBeenCalledWith({ profileName: 'New CV', firstName: 'A', lastName: 'User', jobTitle: 'Engineer', yearsOfExperience: 4, personality: '', technicalSummary: '' });
  });

  it('creates a Profile with only one optional field populated after trimming', () => {
    profiles.create.and.returnValue(of({ id: 2 }));
    fixture.componentInstance.createForm.setValue({ profileName: '  New CV  ', firstName: ' A ', lastName: ' User ', jobTitle: ' Engineer ', yearsOfExperience: 4, personality: '  Methodical  ', technicalSummary: '   ' });

    fixture.componentInstance.submit();

    expect(profiles.create).toHaveBeenCalledWith({ profileName: 'New CV', firstName: 'A', lastName: 'User', jobTitle: 'Engineer', yearsOfExperience: 4, personality: 'Methodical', technicalSummary: '' });
  });

  it('rejects whitespace-only required text fields before submission', () => {
    fixture.componentInstance.createForm.setValue({ profileName: '   ', firstName: '\t', lastName: ' \n ', jobTitle: '  ', yearsOfExperience: 4, personality: '', technicalSummary: '' });

    fixture.componentInstance.submit();

    expect(profiles.create).not.toHaveBeenCalled();
    expect(fixture.componentInstance.createForm.controls.profileName.errors?.['required']).toBeTrue();
    expect(fixture.componentInstance.createForm.controls.firstName.errors?.['required']).toBeTrue();
    expect(fixture.componentInstance.createForm.controls.lastName.errors?.['required']).toBeTrue();
    expect(fixture.componentInstance.createForm.controls.jobTitle.errors?.['required']).toBeTrue();
    expect(fixture.componentInstance.createForm.controls.profileName.touched).toBeTrue();
  });

  it('keeps optional values over 4000 characters invalid', () => {
    fillValidForm();
    fixture.componentInstance.createForm.controls.personality.setValue('x'.repeat(4001));
    fixture.componentInstance.createForm.controls.technicalSummary.setValue('x'.repeat(4001));

    fixture.componentInstance.submit();

    expect(profiles.create).not.toHaveBeenCalled();
    expect(fixture.componentInstance.createForm.controls.personality.errors?.['maxlength']).toBeTruthy();
    expect(fixture.componentInstance.createForm.controls.technicalSummary.errors?.['maxlength']).toBeTruthy();
  });

  it('keeps the four required About Me fields required', () => {
    fixture.componentInstance.createForm.setValue({ profileName: 'New CV', firstName: '', lastName: '', jobTitle: '', yearsOfExperience: null, personality: '', technicalSummary: '' });

    fixture.componentInstance.submit();

    expect(profiles.create).not.toHaveBeenCalled();
    expect(fixture.componentInstance.createForm.controls.firstName.errors?.['required']).toBeTrue();
    expect(fixture.componentInstance.createForm.controls.lastName.errors?.['required']).toBeTrue();
    expect(fixture.componentInstance.createForm.controls.jobTitle.errors?.['required']).toBeTrue();
    expect(fixture.componentInstance.createForm.controls.yearsOfExperience.errors?.['required']).toBeTrue();
    expect(fixture.componentInstance.createForm.controls.personality.errors).toBeNull();
    expect(fixture.componentInstance.createForm.controls.technicalSummary.errors).toBeNull();
  });

  it('prevents duplicate submissions and navigates after context synchronization', () => {
    const pending = new Subject<any>();
    profiles.create.and.returnValue(pending);
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    fillValidForm();
    fixture.componentInstance.submit();
    fixture.componentInstance.submit();
    expect(profiles.create).toHaveBeenCalledTimes(1);
    pending.next({ id: 2 });
    expect(context.refreshSummariesAndSelect).toHaveBeenCalledWith(2);
    expect(router.navigate).toHaveBeenCalledWith(['/profiles', 2]);
  });

  it('requires confirmation for direct navigation with five active Profiles and does not create when cancelled', () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    context.summaries.set(Array.from({ length: 5 }, (_, id) => ({ id, profileName: `CV ${id}` })));
    fixture.detectChanges();
    expect(fixture.componentInstance.warningRequired).toBeTrue();
    fixture.componentInstance.cancel();
    expect(profiles.create).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/profiles', '1']);
  });

  it('maps duplicate-name and validation errors while preserving entered values for retry', () => {
    fillValidForm();
    profiles.create.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'PROFILE_NAME_ALREADY_EXISTS', message: 'Already exists' } })));
    fixture.componentInstance.submit();
    expect(fixture.componentInstance.createForm.controls.profileName.errors?.['backend']).toBe('Already exists');
    expect(fixture.componentInstance.createForm.controls.technicalSummary.value).toBe('Angular');

    profiles.create.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { errorCode: 'VALIDATION_ERROR', data: { errors: [{ field: 'jobTitle', message: 'Invalid title' }] } } })));
    fixture.componentInstance.submit();
    expect(fixture.componentInstance.createForm.controls.jobTitle.errors?.['backend']).toBe('Invalid title');
  });
});
