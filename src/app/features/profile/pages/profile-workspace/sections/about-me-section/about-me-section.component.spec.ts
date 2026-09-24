import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Subject, of, throwError } from 'rxjs';

import { NotificationService } from '../../../../../../core/notifications/notification.service';
import { ProfileDetail } from '../../../../models/profile.models';
import { ProfileContextService } from '../../../../services/profile-context.service';
import { ProfileService } from '../../../../services/profile.service';
import { AboutMeSectionComponent } from './about-me-section.component';

describe('AboutMeSectionComponent', () => {
  let fixture: ComponentFixture<AboutMeSectionComponent>;
  let context: {
    selectedId: ReturnType<typeof signal>;
    detail: ReturnType<typeof signal>;
    managedMember: ReturnType<typeof signal>;
    managedSelectedId: ReturnType<typeof signal>;
    managedDetail: ReturnType<typeof signal>;
    replaceDetail: jasmine.Spy;
    reloadDetail: jasmine.Spy;
    refreshManagedProfile: jasmine.Spy;
  };
  let profiles: { update: jasmine.Spy };
  let notifications: { showSuccess: jasmine.Spy };
  const profile: ProfileDetail = {
    id: 1,
    profileName: 'Backend CV',
    firstName: 'A',
    lastName: 'User',
    jobTitle: 'Engineer',
    yearsOfExperience: 5,
    personality: 'Methodical',
    technicalSummary: 'Angular and Java',
    hasPreviewed: true,
    version: 3,
    updatedAt: '2026-01-01',
    createdAt: '2026-01-01',
    lastExportedAt: null,
    preferredFileNameFormatId: null,
  };

  beforeEach(async () => {
    context = {
      selectedId: signal('1'),
      detail: signal<ProfileDetail | null>(profile),
      managedMember: signal(null),
      managedSelectedId: signal(null),
      managedDetail: signal<ProfileDetail | null>(null),
      replaceDetail: jasmine.createSpy('replaceDetail'),
      reloadDetail: jasmine.createSpy('reloadDetail'),
      refreshManagedProfile: jasmine.createSpy('refreshManagedProfile').and.returnValue(of(profile)),
    };
    profiles = { update: jasmine.createSpy('update') };
    notifications = { showSuccess: jasmine.createSpy('showSuccess') };
    await TestBed.configureTestingModule({
      imports: [AboutMeSectionComponent],
      providers: [
        { provide: ProfileContextService, useValue: context },
        { provide: ProfileService, useValue: profiles },
        { provide: NotificationService, useValue: notifications },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AboutMeSectionComponent);
    fixture.componentInstance.profile = profile;
    fixture.detectChanges();
    fixture.componentInstance.resetForProfile();
  });

  function openEditor(): void {
    fixture.componentInstance.startEditing();
    fixture.detectChanges();
  }

  it('initializes the editor from the current Profile and preserves optional-field policy', () => {
    openEditor();

    expect(fixture.componentInstance.editForm.getRawValue()).toEqual({
      firstName: 'A', lastName: 'User', jobTitle: 'Engineer', yearsOfExperience: 5, personality: 'Methodical', technicalSummary: 'Angular and Java',
    });
    fixture.componentInstance.editForm.reset({ firstName: '', lastName: '', jobTitle: '', yearsOfExperience: null as unknown as number, personality: '', technicalSummary: '' });
    fixture.componentInstance.submit();

    expect(profiles.update).not.toHaveBeenCalled();
    expect(fixture.componentInstance.editForm.controls.firstName.errors?.['required']).toBeTrue();
    expect(fixture.componentInstance.editForm.controls.yearsOfExperience.errors?.['required']).toBeTrue();
    expect(fixture.componentInstance.editForm.controls.personality.errors).toBeNull();
    expect(fixture.componentInstance.editForm.controls.technicalSummary.errors).toBeNull();
  });

  it('tracks a normalized dirty draft and avoids a whitespace-only mutation', () => {
    openEditor();
    fixture.componentInstance.editForm.controls.firstName.setValue('  A  ');
    fixture.componentInstance.editForm.markAsDirty();

    expect(fixture.componentInstance.hasChanges()).toBeFalse();
    expect(fixture.componentInstance.editSession.dirty()).toBeFalse();
    fixture.componentInstance.submit();
    expect(profiles.update).not.toHaveBeenCalled();
  });

  it('updates the canonical Profile and clears the dirty editor after saving', () => {
    const updated = { ...profile, firstName: 'Updated', version: 4, hasPreviewed: false };
    context.replaceDetail.and.callFake((next: ProfileDetail) => context.detail.set(next));
    profiles.update.and.returnValue(of(updated));
    openEditor();
    fixture.componentInstance.editForm.controls.firstName.setValue('Updated');
    fixture.componentInstance.editForm.markAsDirty();
    fixture.componentInstance.submit();

    expect(profiles.update).toHaveBeenCalledWith('1', jasmine.objectContaining({ firstName: 'Updated', version: 3 }));
    expect(context.replaceDetail).toHaveBeenCalledWith(updated);
    expect(fixture.componentInstance.isEditing).toBeFalse();
    expect(fixture.componentInstance.editSession.dirty()).toBeFalse();
    expect(notifications.showSuccess).toHaveBeenCalledWith('About Me updated successfully.');
  });

  it('keeps the draft after ordinary and validation failures', () => {
    openEditor();
    fixture.componentInstance.editForm.controls.firstName.setValue('Draft');
    fixture.componentInstance.editForm.markAsDirty();
    profiles.update.and.returnValue(throwError(() => new HttpErrorResponse({ status: 503, error: { message: 'Service unavailable' } })));
    fixture.componentInstance.submit();

    expect(fixture.componentInstance.isEditing).toBeTrue();
    expect(fixture.componentInstance.editForm.controls.firstName.value).toBe('Draft');
    expect(fixture.componentInstance.errorMessage).toBe('Service unavailable');

    profiles.update.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { errorCode: 'VALIDATION_ERROR', data: { errors: [{ field: 'jobTitle', message: 'Invalid title' }] } } })));
    fixture.componentInstance.submit();
    expect(fixture.componentInstance.editForm.controls.jobTitle.errors?.['backend']).toBe('Invalid title');
  });

  it('requires an explicit reload after a Profile version conflict', () => {
    const latest = new Subject<ProfileDetail>();
    context.reloadDetail.and.returnValue(latest);
    profiles.update.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'PROFILE_VERSION_CONFLICT' } })));
    openEditor();
    fixture.componentInstance.editForm.controls.firstName.setValue('Draft');
    fixture.componentInstance.editForm.markAsDirty();
    fixture.componentInstance.submit();

    expect(fixture.componentInstance.conflict).toBeTrue();
    fixture.componentInstance.reloadLatest();
    expect(fixture.componentInstance.reloadConfirmation).toBeTrue();
    fixture.componentInstance.confirmReloadLatest();
    latest.next({ ...profile, firstName: 'Latest', version: 4 });

    expect(fixture.componentInstance.conflict).toBeFalse();
    expect(fixture.componentInstance.editForm.controls.firstName.value).toBe('Latest');
    expect(fixture.componentInstance.isEditing).toBeFalse();
  });

  it('ignores a stale mutation response after the selected Profile changes', () => {
    const pending = new Subject<ProfileDetail>();
    profiles.update.and.returnValue(pending);
    openEditor();
    fixture.componentInstance.editForm.controls.firstName.setValue('Old response');
    fixture.componentInstance.editForm.markAsDirty();
    fixture.componentInstance.submit();

    context.selectedId.set('2');
    context.detail.set({ ...profile, id: 2, profileName: 'Frontend CV' });
    pending.next({ ...profile, firstName: 'Stale response', version: 4 });

    expect(notifications.showSuccess).not.toHaveBeenCalled();
    expect(context.replaceDetail).not.toHaveBeenCalled();
  });

  it('requires confirmation before discarding a dirty draft', () => {
    openEditor();
    fixture.componentInstance.editForm.controls.firstName.setValue('Draft');
    fixture.componentInstance.editForm.markAsDirty();

    fixture.componentInstance.cancelEditing();
    expect(fixture.componentInstance.cancelConfirmation).toBeTrue();
    fixture.componentInstance.keepEditing();
    expect(fixture.componentInstance.isEditing).toBeTrue();
    fixture.componentInstance.cancelEditing();
    fixture.componentInstance.discardEditing();
    expect(fixture.componentInstance.isEditing).toBeFalse();
  });

  it('discards its draft when the application navigation decision allows leaving', async () => {
    openEditor();
    fixture.componentInstance.editForm.controls.firstName.setValue('Draft');
    fixture.componentInstance.editForm.markAsDirty();
    const decision = fixture.componentInstance.editSession.requestNavigation('/dashboard');

    fixture.componentInstance.editSession.resolveNavigation(true);

    await expectAsync(decision).toBeResolvedTo(true);
    expect(fixture.componentInstance.isEditing).toBeFalse();
    expect(fixture.componentInstance.editSession.dirty()).toBeFalse();
  });

  it('targets the selected managed Profile for About Me updates and refreshes managed authority', () => {
    const managedProfile = { ...profile, id: 2, profileName: 'Managed CV' };
    const updated = { ...managedProfile, firstName: 'Managed Updated', version: 4, hasPreviewed: false };
    context.managedMember.set({ id: 'member-1' });
    context.managedSelectedId.set('2');
    context.managedDetail.set(managedProfile);
    profiles.update.and.returnValue(of(updated));
    context.refreshManagedProfile.and.returnValue(of(updated));
    fixture.componentInstance.profile = managedProfile;
    fixture.detectChanges();
    fixture.componentInstance.resetForProfile();
    fixture.componentInstance.startEditing();
    fixture.componentInstance.editForm.controls.firstName.setValue('Managed Updated');
    fixture.componentInstance.submit();

    expect(profiles.update).toHaveBeenCalledWith('2', jasmine.objectContaining({ firstName: 'Managed Updated', version: 3 }));
    expect(context.refreshManagedProfile).toHaveBeenCalledWith('2');
  });
});
