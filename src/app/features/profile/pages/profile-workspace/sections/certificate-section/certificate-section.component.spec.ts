import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Subject, of, throwError } from 'rxjs';

import { NotificationService } from '../../../../../../core/notifications/notification.service';
import { Certificate, ProfileDetail } from '../../../../models/profile.models';
import { ProfileContextService } from '../../../../services/profile-context.service';
import { ProfileEditSessionService } from '../../../../services/profile-edit-session.service';
import { ProfileService } from '../../../../services/profile.service';
import { CertificateSectionComponent } from './certificate-section.component';

describe('CertificateSectionComponent', () => {
  let fixture: ComponentFixture<CertificateSectionComponent>;
  let context: {
    selectedId: ReturnType<typeof signal>;
    detail: ReturnType<typeof signal>;
    managedMember: ReturnType<typeof signal>;
    managedSelectedId: ReturnType<typeof signal>;
    managedDetail: ReturnType<typeof signal>;
    reloadDetail: jasmine.Spy;
    applyMutationVersion: jasmine.Spy;
    refreshManagedProfile: jasmine.Spy;
  };
  let profiles: { listCertificates: jasmine.Spy; createCertificate: jasmine.Spy; updateCertificate: jasmine.Spy; deleteCertificate: jasmine.Spy };
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
    lastExportedAt: null,
    preferredFileNameFormatId: null,
  };
  const certificate: Certificate = { id: 1, certificateName: 'AWS Developer', issueDate: '2024-04-01' };

  beforeEach(async () => {
    context = {
      selectedId: signal('1'),
      detail: signal<ProfileDetail | null>(profile),
      managedMember: signal(null),
      managedSelectedId: signal(null),
      managedDetail: signal<ProfileDetail | null>(null),
      reloadDetail: jasmine.createSpy('reloadDetail').and.returnValue(of(profile)),
      applyMutationVersion: jasmine.createSpy('applyMutationVersion').and.callFake((_id: string, version: number) => {
        context.detail.set({ ...profile, version, hasPreviewed: false });
        return true;
      }),
      refreshManagedProfile: jasmine.createSpy('refreshManagedProfile').and.returnValue(of(profile)),
    };
    profiles = {
      listCertificates: jasmine.createSpy('listCertificates').and.returnValue(of([certificate])),
      createCertificate: jasmine.createSpy('createCertificate'),
      updateCertificate: jasmine.createSpy('updateCertificate'),
      deleteCertificate: jasmine.createSpy('deleteCertificate'),
    };
    notifications = { showSuccess: jasmine.createSpy('showSuccess') };
    await TestBed.configureTestingModule({
      imports: [CertificateSectionComponent],
      providers: [
        { provide: ProfileContextService, useValue: context },
        { provide: ProfileService, useValue: profiles },
        { provide: NotificationService, useValue: notifications },
        ProfileEditSessionService,
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CertificateSectionComponent);
    fixture.componentInstance.profile = profile;
    fixture.detectChanges();
    fixture.componentInstance.resetForProfile();
    fixture.detectChanges();
  });

  function openCreate(): void {
    fixture.componentInstance.startCertificateCreate();
    fixture.detectChanges();
  }

  function fillDraft(name = 'AWS Developer', issueDate = '2024-04-01'): void {
    fixture.componentInstance.certificateForm.patchValue({ certificateName: name, issueDate });
    fixture.componentInstance.certificateForm.markAsDirty();
    fixture.detectChanges();
  }

  it('loads certificates in current issue-date order', () => {
    const older = { ...certificate, id: 2, issueDate: '2023-01-01' };
    profiles.listCertificates.and.returnValue(of([older, certificate]));
    fixture.componentInstance.resetForProfile();

    expect(fixture.componentInstance.certificates.map((item) => item.id)).toEqual([1, 2]);
    expect(profiles.listCertificates).toHaveBeenCalledWith('1');
  });

  it('keeps Certificate required and future-date validation at the child boundary', () => {
    openCreate();
    fixture.componentInstance.submitCertificate();
    expect(profiles.createCertificate).not.toHaveBeenCalled();
    expect(fixture.componentInstance.certificateForm.controls.certificateName.errors?.['required']).toBeTrue();
    expect(fixture.componentInstance.certificateForm.controls.issueDate.errors?.['required']).toBeTrue();

    fillDraft('Future', '2999-01-01');
    fixture.componentInstance.submitCertificate();
    expect(profiles.createCertificate).not.toHaveBeenCalled();
    expect(fixture.componentInstance.certificateForm.controls.issueDate.errors?.['futureDate']).toBeTrue();
  });

  it('creates and updates Certificates with the canonical Profile version', () => {
    const created = { ...certificate, id: 2, certificateName: 'Azure Fundamentals' };
    profiles.createCertificate.and.returnValue(of({ certificate: created, profileVersion: 4 }));
    openCreate();
    fillDraft(created.certificateName);
    fixture.componentInstance.submitCertificate();

    expect(profiles.createCertificate).toHaveBeenCalledWith('1', { certificateName: created.certificateName, issueDate: created.issueDate, version: 3 });
    expect(context.applyMutationVersion).toHaveBeenCalledWith('1', 4);
    expect(notifications.showSuccess).toHaveBeenCalledWith('Certificate added successfully.');
    expect(fixture.componentInstance.certificateEditorMode).toBeNull();
    expect(fixture.componentInstance.editSession.dirty()).toBeFalse();

    const updated = { ...created, certificateName: 'Azure Administrator' };
    profiles.updateCertificate.and.returnValue(of({ certificate: updated, profileVersion: 5 }));
    fixture.componentInstance.startCertificateEdit(created);
    fillDraft(updated.certificateName);
    fixture.componentInstance.submitCertificate();

    expect(profiles.updateCertificate).toHaveBeenCalledWith('1', 2, jasmine.objectContaining({ certificateName: updated.certificateName, version: 4 }));
    expect(context.applyMutationVersion).toHaveBeenCalledWith('1', 5);
  });

  it('keeps backend duplicate and validation errors actionable without losing the draft', () => {
    openCreate();
    fillDraft('New Certificate');
    profiles.createCertificate.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'CERTIFICATE_ALREADY_EXISTS', message: 'Duplicate certificate.' } })));
    fixture.componentInstance.submitCertificate();

    expect(fixture.componentInstance.certificateForm.controls.certificateName.errors?.['backend']).toBe('Duplicate certificate.');
    expect(fixture.componentInstance.certificateEditorMode).toBe('create');
    expect(fixture.componentInstance.editSession.dirty()).toBeTrue();

    profiles.createCertificate.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { errorCode: 'VALIDATION_ERROR', data: { errors: [{ field: 'certificate.issueDate', message: 'Invalid issue date' }] } } })));
    fixture.componentInstance.submitCertificate();
    expect(fixture.componentInstance.certificateForm.controls.issueDate.errors?.['backend']).toBe('Invalid issue date');
  });

  it('supports Save & add another with a clean reset and chained Profile versions', () => {
    const first = { ...certificate, id: 2, certificateName: 'First Certificate' };
    const second = { ...certificate, id: 3, certificateName: 'Second Certificate' };
    profiles.createCertificate.and.returnValues(
      of({ certificate: first, profileVersion: 4 }),
      of({ certificate: second, profileVersion: 5 }),
    );
    openCreate();
    fillDraft(first.certificateName);
    fixture.componentInstance.submitCertificate('add-another');

    expect(fixture.componentInstance.certificateEditorMode).toBe('create');
    expect(fixture.componentInstance.certificateForm.pristine).toBeTrue();
    expect(fixture.componentInstance.editSession.dirty()).toBeFalse();

    fillDraft(second.certificateName);
    fixture.componentInstance.submitCertificate();
    expect(profiles.createCertificate.calls.argsFor(0)[1].version).toBe(3);
    expect(profiles.createCertificate.calls.argsFor(1)[1].version).toBe(4);
  });

  it('deletes a Certificate with the canonical version', () => {
    profiles.deleteCertificate.and.returnValue(of({ profileVersion: 4 }));
    fixture.componentInstance.openCertificateDeleteConfirmation(certificate);
    fixture.componentInstance.confirmCertificateDelete();

    expect(profiles.deleteCertificate).toHaveBeenCalledWith('1', 1, 3);
    expect(fixture.componentInstance.certificates).toEqual([]);
    expect(notifications.showSuccess).toHaveBeenCalledWith('Certificate deleted successfully.');
  });

  it('requires reload and an explicit retry after a delete version conflict', () => {
    const latest = new Subject<ProfileDetail>();
    const refreshed = new Subject<Certificate[]>();
    context.reloadDetail.and.returnValue(latest);
    profiles.listCertificates.and.returnValue(refreshed);
    profiles.deleteCertificate.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'PROFILE_VERSION_CONFLICT' } })));
    fixture.componentInstance.openCertificateDeleteConfirmation(certificate);
    fixture.componentInstance.confirmCertificateDelete();

    expect(fixture.componentInstance.hasDeleteConflict()).toBeTrue();
    fixture.componentInstance.confirmCertificateDelete();
    expect(profiles.deleteCertificate).toHaveBeenCalledTimes(1);
    fixture.componentInstance.reloadLatest();
    context.detail.set({ ...profile, version: 4 });
    latest.next({ ...profile, version: 4 });
    refreshed.next([certificate]);

    expect(fixture.componentInstance.hasDeleteConflict()).toBeFalse();
    expect(fixture.componentInstance.certificateDeleteConfirmation).toBeTrue();
    profiles.deleteCertificate.and.returnValue(of({ profileVersion: 5 }));
    fixture.componentInstance.confirmCertificateDelete();
    expect(profiles.deleteCertificate).toHaveBeenCalledWith('1', 1, 4);
  });

  it('closes obsolete delete state when the target disappeared during conflict recovery', () => {
    const latest = new Subject<ProfileDetail>();
    const refreshed = new Subject<Certificate[]>();
    context.reloadDetail.and.returnValue(latest);
    profiles.listCertificates.and.returnValue(refreshed);
    profiles.deleteCertificate.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'PROFILE_VERSION_CONFLICT' } })));
    fixture.componentInstance.openCertificateDeleteConfirmation(certificate);
    fixture.componentInstance.confirmCertificateDelete();
    fixture.componentInstance.reloadLatest();
    latest.next({ ...profile, version: 4 });
    refreshed.next([]);

    expect(fixture.componentInstance.certificateDeleteConfirmation).toBeFalse();
    expect(fixture.componentInstance.certificateDeleteTarget).toBeNull();
    expect(profiles.deleteCertificate).toHaveBeenCalledTimes(1);
  });

  it('ignores stale list, mutation, and reload responses after switching Profile', () => {
    const first = new Subject<Certificate[]>();
    const second = new Subject<Certificate[]>();
    profiles.listCertificates.and.returnValues(first, second);
    fixture.componentInstance.resetForProfile();
    context.selectedId.set('2');
    context.detail.set({ ...profile, id: 2 });
    fixture.componentInstance.profile = { ...profile, id: 2 };
    fixture.componentInstance.resetForProfile();
    fixture.detectChanges();
    first.next([certificate]);
    second.next([{ ...certificate, id: 2, certificateName: 'Other Profile Certificate' }]);
    expect(fixture.componentInstance.certificates[0].certificateName).toBe('Other Profile Certificate');

    context.selectedId.set('1');
    context.detail.set(profile);
    fixture.componentInstance.profile = profile;
    profiles.listCertificates.and.returnValue(of([certificate]));
    fixture.componentInstance.resetForProfile();
    fixture.detectChanges();
    profiles.createCertificate.and.returnValue(new Subject());
    fixture.componentInstance.startCertificateCreate();
    fillDraft('Pending');
    fixture.componentInstance.submitCertificate();
    context.selectedId.set('2');
    context.detail.set({ ...profile, id: 2 });
    (profiles.createCertificate.calls.mostRecent().returnValue as Subject<unknown>).next({ certificate, profileVersion: 9 });
    expect(context.applyMutationVersion).not.toHaveBeenCalledWith('1', 9);
  });

  it('uses the selected managed Profile for Certificate list and mutation requests', () => {
    const managedProfile = { ...profile, id: 2, profileName: 'Managed CV' };
    const created = { ...certificate, id: 2, certificateName: 'Managed Certificate' };
    context.managedMember.set({ id: 'member-1' });
    context.managedSelectedId.set('2');
    context.managedDetail.set(managedProfile);
    profiles.listCertificates.and.returnValue(of([certificate]));
    profiles.createCertificate.and.returnValue(of({ certificate: created, profileVersion: 4 }));
    context.refreshManagedProfile.and.returnValue(of({ ...managedProfile, version: 4, hasPreviewed: false }));
    fixture.componentInstance.profile = managedProfile;
    fixture.detectChanges();
    fixture.componentInstance.resetForProfile();
    openCreate();
    fillDraft(created.certificateName);
    fixture.componentInstance.submitCertificate();

    expect(profiles.listCertificates).toHaveBeenCalledWith('2');
    expect(profiles.createCertificate).toHaveBeenCalledWith('2', jasmine.objectContaining({ version: 3 }));
    expect(context.refreshManagedProfile).toHaveBeenCalledWith('2');
  });
});
