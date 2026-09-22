import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';

import { ProfileSummary } from '../../models/profile.models';
import { ProfileContextService } from '../../services/profile-context.service';
import { ProfileEditSessionService } from '../../services/profile-edit-session.service';
import { ProfileService } from '../../services/profile.service';
import { ProfileCopyComponent } from './profile-copy.component';

describe('ProfileCopyComponent', () => {
  let fixture: ComponentFixture<ProfileCopyComponent>;
  let profiles: { copy: jasmine.Spy; list: jasmine.Spy };
  let context: { summaries: ReturnType<typeof signal>; selectedId: ReturnType<typeof signal>; detail: ReturnType<typeof signal> };
  let editSession: ProfileEditSessionService;

  const summary = { id: 1, profileName: 'Backend CV', firstName: 'A', lastName: 'User', jobTitle: 'Engineer', updatedAt: '2026-01-01' };
  const frontendSummary = { id: 2, profileName: 'Frontend CV', firstName: 'A', lastName: 'User', jobTitle: 'Engineer', updatedAt: '2026-01-02' };
  const managerSummary = { id: 3, profileName: 'A very long Profile name that should remain readable in the modal', firstName: 'A', lastName: 'User', jobTitle: 'Engineer', updatedAt: '2026-01-03' };

  beforeEach(async () => {
    profiles = { copy: jasmine.createSpy('copy'), list: jasmine.createSpy('list') };
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

  function continueToName(): void {
    fixture.componentInstance.continueToName();
    fixture.detectChanges();
  }

  it('starts with the Workspace Profile selected, keeps source selection local, and submits only the chosen source and trimmed new name', async () => {
    const copied = { id: 2, profileName: 'Copied CV' };
    profiles.copy.and.returnValue(of(copied));
    const copiedEvent = jasmine.createSpy('copied');
    fixture.componentInstance.copied.subscribe(copiedEvent);
    context.summaries.set([summary, frontendSummary]);
    fixture.detectChanges();

    (fixture.nativeElement.querySelectorAll('.source-option')[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(context.selectedId()).toBe('1');
    continueToName();
    enterName('  Copied CV  ');

    fixture.componentInstance.submit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(profiles.copy).toHaveBeenCalledWith(2, { profileName: 'Copied CV' });
    expect(copiedEvent).toHaveBeenCalledWith(copied);
    expect(fixture.nativeElement.textContent).toContain('Copied CV');
    expect(fixture.nativeElement.querySelector('.copy-success')).toBeTruthy();
  });

  it('pins the current Workspace Profile first and filters source rows without changing Workspace context', () => {
    context.summaries.set([summary, frontendSummary, managerSummary]);
    context.selectedId.set('2');
    fixture = TestBed.createComponent(ProfileCopyComponent);
    fixture.componentInstance.sourceProfileId = '2';
    fixture.componentInstance.sourceProfileName = 'Frontend CV';
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('.source-option') as NodeListOf<HTMLButtonElement>;
    expect(rows[0].textContent).toContain('Frontend CV');
    expect(rows[0].getAttribute('aria-checked')).toBe('true');
    expect(rows[0].textContent).toContain('Current Profile');
    expect((fixture.nativeElement.querySelector('.source-continue') as HTMLButtonElement).disabled).toBeFalse();

    const search = fixture.nativeElement.querySelector('#copy-profile-search') as HTMLInputElement;
    search.value = 'long Profile';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.source-option').length).toBe(1);
    expect(fixture.nativeElement.querySelector('.source-option')?.textContent).toContain('long Profile');
    expect(context.selectedId()).toBe('2');
  });

  it('requires an explicit source after Copy another Profile refreshes the active list', () => {
    context.summaries.set([summary, frontendSummary]);
    profiles.list.and.returnValue(of([managerSummary, frontendSummary] as ProfileSummary[]));
    fixture.detectChanges();

    fixture.componentInstance.copyAnother();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.source-option')?.textContent).toContain('A very long Profile');
    expect(fixture.nativeElement.querySelectorAll('.source-option[aria-checked="true"]').length).toBe(0);
    expect((fixture.nativeElement.querySelector('.source-continue') as HTMLButtonElement).disabled).toBeTrue();
    expect(context.selectedId()).toBe('1');
  });

  it('returns to source selection with the selected source and entered name preserved', () => {
    context.summaries.set([summary, frontendSummary]);
    fixture.detectChanges();
    (fixture.nativeElement.querySelectorAll('.source-option')[1] as HTMLButtonElement).click();
    continueToName();
    enterName('Copied CV');

    (fixture.nativeElement.querySelector('.copy-back') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.source-option[aria-checked="true"]')?.textContent).toContain('Frontend CV');
    fixture.componentInstance.continueToName();
    fixture.detectChanges();
    expect(fixture.componentInstance.copyForm.controls.profileName.value).toBe('Copied CV');
  });

  it('emits the copied Profile for the primary Open action and resets for Copy another', async () => {
    const copied = { id: 4, profileName: 'Copied CV' };
    const opened = jasmine.createSpy('opened');
    profiles.copy.and.returnValue(of(copied));
    profiles.list.and.returnValue(of([summary, frontendSummary, { ...copied, firstName: 'A', lastName: 'User', jobTitle: 'Engineer', updatedAt: '2026-01-04' }]));
    fixture.componentInstance.openCopied.subscribe(opened);
    continueToName();
    enterName('Copied CV');

    fixture.componentInstance.submit();
    await fixture.whenStable();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.open-copied') as HTMLButtonElement).click();

    expect(opened).toHaveBeenCalledWith(copied);
    fixture.componentInstance.copyAnother();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.source-selection')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('.source-option[aria-checked="true"]').length).toBe(0);
  });

  it('blocks a copy when the Workspace Profile is no longer selected', async () => {
    profiles.copy.and.returnValue(of({ id: 2, profileName: 'Copied CV' }));
    context.selectedId.set('2');
    continueToName();
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

    expect(fixture.componentInstance.warningRequired).toBeFalse();
    continueToName();
    expect(fixture.componentInstance.warningRequired).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('five or more active Profiles');
    fixture.componentInstance.confirmWarning();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#copy-profile-name')).toBeTruthy();
  });

  it('prevents duplicate submissions while Copy is pending', async () => {
    const pending = new Subject<unknown>();
    profiles.copy.and.returnValue(pending);
    continueToName();
    enterName('Copied CV');

    fixture.componentInstance.submit();
    fixture.componentInstance.submit();
    await fixture.whenStable();

    expect(profiles.copy).toHaveBeenCalledTimes(1);
    pending.next({ id: 2, profileName: 'Copied CV' });
    pending.complete();
  });

  it('ignores a successful Copy response after the Workspace Profile changes', async () => {
    const pending = new Subject<unknown>();
    const copiedEvent = jasmine.createSpy('copied');
    profiles.copy.and.returnValue(pending);
    fixture.componentInstance.copied.subscribe(copiedEvent);
    context.summaries.set([summary, { ...summary, id: 2, profileName: 'Frontend CV' }]);
    continueToName();
    enterName('Copied CV');

    fixture.componentInstance.submit();
    await fixture.whenStable();
    context.selectedId.set('2');

    pending.next({ id: 3, profileName: 'Copied CV' });
    pending.complete();

    expect(profiles.copy).toHaveBeenCalledTimes(1);
    expect(copiedEvent).not.toHaveBeenCalled();
    expect(fixture.componentInstance.message).toContain('selected Profile changed');
  });

  it('preserves the entered name and exposes backend name errors for retry', async () => {
    profiles.copy.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'PROFILE_NAME_ALREADY_EXISTS', message: 'That name is already used.' } })));
    continueToName();
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
    continueToName();
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
