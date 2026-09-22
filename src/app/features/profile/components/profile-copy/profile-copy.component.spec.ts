import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';

import { ProfileContextService } from '../../services/profile-context.service';
import { ProfileEditSessionService } from '../../services/profile-edit-session.service';
import { ProfileService } from '../../services/profile.service';
import { ProfileCopyComponent } from './profile-copy.component';

describe('ProfileCopyComponent', () => {
  let fixture: ComponentFixture<ProfileCopyComponent>;
  let profiles: { copy: jasmine.Spy };
  let context: { summaries: ReturnType<typeof signal>; selectedId: ReturnType<typeof signal>; detail: ReturnType<typeof signal> };
  let editSession: ProfileEditSessionService;

  const summary = { id: 1, profileName: 'Backend CV', firstName: 'A', lastName: 'User', jobTitle: 'Engineer', updatedAt: '2026-01-01' };

  beforeEach(async () => {
    profiles = { copy: jasmine.createSpy('copy') };
    context = { summaries: signal([summary]), selectedId: signal('1'), detail: signal(null) };
    await TestBed.configureTestingModule({
      imports: [ProfileCopyComponent],
      providers: [
        { provide: ProfileService, useValue: profiles },
        { provide: ProfileContextService, useValue: context },
        ProfileEditSessionService,
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ProfileCopyComponent);
    fixture.componentInstance.sourceProfileId = '1';
    fixture.componentInstance.sourceProfileName = 'Backend CV';
    editSession = TestBed.inject(ProfileEditSessionService);
    fixture.detectChanges();
  });

  function enterName(name: string): void {
    fixture.componentInstance.copyForm.controls.profileName.setValue(name);
    fixture.detectChanges();
  }

  it('identifies the selected source and submits only the trimmed new name', async () => {
    const copied = { id: 2, profileName: 'Copied CV' };
    profiles.copy.and.returnValue(of(copied));
    const copiedEvent = jasmine.createSpy('copied');
    fixture.componentInstance.copied.subscribe(copiedEvent);
    enterName('  Copied CV  ');

    fixture.componentInstance.submit();
    await fixture.whenStable();

    expect(profiles.copy).toHaveBeenCalledWith('1', { profileName: 'Copied CV' });
    expect(copiedEvent).toHaveBeenCalledWith(copied);
  });

  it('blocks a copy when the source is no longer the selected Profile', async () => {
    profiles.copy.and.returnValue(of({ id: 2, profileName: 'Copied CV' }));
    context.selectedId.set('2');
    enterName('Copied CV');

    fixture.componentInstance.submit();
    await fixture.whenStable();

    expect(profiles.copy).not.toHaveBeenCalled();
    expect(fixture.componentInstance.message).toContain('selected Profile changed');
  });

  it('requires acknowledgement before copying when five or more Profiles exist', () => {
    context.summaries.set(Array.from({ length: 5 }, (_, index) => ({ ...summary, id: index + 1 })));
    fixture = TestBed.createComponent(ProfileCopyComponent);
    fixture.componentInstance.sourceProfileId = '1';
    fixture.componentInstance.sourceProfileName = 'Backend CV';
    fixture.detectChanges();

    expect(fixture.componentInstance.warningRequired).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('five or more active Profiles');
    fixture.componentInstance.confirmWarning();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#copy-profile-name')).toBeTruthy();
  });

  it('prevents duplicate submissions while Copy is pending', async () => {
    const pending = new Subject<unknown>();
    profiles.copy.and.returnValue(pending);
    enterName('Copied CV');

    fixture.componentInstance.submit();
    fixture.componentInstance.submit();
    await fixture.whenStable();

    expect(profiles.copy).toHaveBeenCalledTimes(1);
    pending.next({ id: 2, profileName: 'Copied CV' });
    pending.complete();
  });

  it('preserves the entered name and exposes backend name errors for retry', async () => {
    profiles.copy.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'PROFILE_NAME_ALREADY_EXISTS', message: 'That name is already used.' } })));
    enterName('Copied CV');

    fixture.componentInstance.submit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.copyForm.controls.profileName.value).toBe('Copied CV');
    expect(fixture.componentInstance.fieldError()).toBe('That name is already used.');
    expect(fixture.componentInstance.isSubmitting).toBeFalse();

    profiles.copy.and.returnValue(of({ id: 2, profileName: 'Retry CV' }));
    enterName('Retry CV');
    fixture.componentInstance.submit();
    await fixture.whenStable();
    expect(profiles.copy).toHaveBeenCalledTimes(2);
  });

  it('uses validation error codes and keeps the form retryable', async () => {
    profiles.copy.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { errorCode: 'VALIDATION_ERROR', data: { errors: [{ field: 'profileName', message: 'Name is invalid.' }] } } })));
    enterName('Copied CV');

    fixture.componentInstance.submit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.message).toContain('highlighted field');
    expect(fixture.componentInstance.fieldError()).toBe('Name is invalid.');
    expect(fixture.componentInstance.isSubmitting).toBeFalse();
    expect(editSession.dirty()).toBeFalse();
  });
});
