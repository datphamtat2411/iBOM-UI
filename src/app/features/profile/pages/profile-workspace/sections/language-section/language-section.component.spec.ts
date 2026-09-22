import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Subject, of, throwError } from 'rxjs';

import { NotificationService } from '../../../../../../core/notifications/notification.service';
import { LanguageMasterOption, ProfileDetail, ProfileLanguage } from '../../../../models/profile.models';
import { ProfileContextService } from '../../../../services/profile-context.service';
import { ProfileService } from '../../../../services/profile.service';
import { LanguageSectionComponent } from './language-section.component';

describe('LanguageSectionComponent', () => {
  let fixture: ComponentFixture<LanguageSectionComponent>;
  let context: {
    selectedId: ReturnType<typeof signal>;
    detail: ReturnType<typeof signal>;
    applyMutationVersion: jasmine.Spy;
    reloadDetail: jasmine.Spy;
  };
  let profiles: {
    listProfileLanguages: jasmine.Spy;
    createProfileLanguage: jasmine.Spy;
    updateProfileLanguage: jasmine.Spy;
    deleteProfileLanguage: jasmine.Spy;
    listLanguageMaster: jasmine.Spy;
  };
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
  const english: ProfileLanguage = { profileLanguageId: 1, languageId: 10, languageName: 'English', level: 'ADVANCED' };
  const vietnamese: ProfileLanguage = { profileLanguageId: 2, languageId: 11, languageName: 'Vietnamese', level: 'NATIVE' };
  const java: LanguageMasterOption = { id: 10, name: 'English' };
  const french: LanguageMasterOption = { id: 12, name: 'French' };
  const german: LanguageMasterOption = { id: 13, name: 'German' };

  beforeEach(async () => {
    context = {
      selectedId: signal('1'),
      detail: signal<ProfileDetail | null>(profile),
      applyMutationVersion: jasmine.createSpy('applyMutationVersion').and.returnValue(true),
      reloadDetail: jasmine.createSpy('reloadDetail').and.returnValue(of(profile)),
    };
    profiles = {
      listProfileLanguages: jasmine.createSpy('listProfileLanguages').and.returnValue(of([english, vietnamese])),
      createProfileLanguage: jasmine.createSpy('createProfileLanguage'),
      updateProfileLanguage: jasmine.createSpy('updateProfileLanguage'),
      deleteProfileLanguage: jasmine.createSpy('deleteProfileLanguage'),
      listLanguageMaster: jasmine.createSpy('listLanguageMaster').and.returnValue(of({ content: [java, french, german], page: 0, size: 10, totalElements: 3, totalPages: 1 })),
    };
    notifications = { showSuccess: jasmine.createSpy('showSuccess') };

    await TestBed.configureTestingModule({
      imports: [LanguageSectionComponent],
      providers: [
        { provide: ProfileContextService, useValue: context },
        { provide: ProfileService, useValue: profiles },
        { provide: NotificationService, useValue: notifications },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(LanguageSectionComponent);
    fixture.componentInstance.profile = profile;
    fixture.detectChanges();
    fixture.componentInstance.resetForProfile();
  });

  function openCreate(): void {
    fixture.componentInstance.startLanguageCreate();
    fixture.detectChanges();
  }

  function select(option: LanguageMasterOption = french): void {
    fixture.componentInstance.selectLanguageMasterOption(option);
    fixture.componentInstance.languageForm.controls.level.setValue('INTERMEDIATE');
  }

  it('loads and orders Language records by proficiency and name', () => {
    expect(fixture.componentInstance.languages.map((item) => item.languageName)).toEqual(['Vietnamese', 'English']);
    expect(profiles.listProfileLanguages).toHaveBeenCalledWith('1');
  });

  it('starts create mode with both required fields unselected', () => {
    openCreate();

    expect(fixture.componentInstance.languageForm.getRawValue()).toEqual({ languageId: null, level: null });
    fixture.componentInstance.submitLanguage();

    expect(profiles.createProfileLanguage).not.toHaveBeenCalled();
    expect(fixture.componentInstance.languageForm.controls.languageId.touched).toBeTrue();
    expect(fixture.componentInstance.languageForm.controls.level.touched).toBeTrue();
  });

  it('requires a committed Master value and never submits arbitrary text', () => {
    openCreate();
    fixture.componentInstance.languageMasterInputChanged('Typed only');
    fixture.componentInstance.submitLanguage();

    expect(profiles.createProfileLanguage).not.toHaveBeenCalled();
    expect(fixture.componentInstance.languageForm.controls.languageId.errors?.['required']).toBeTrue();
  });

  it('supports Master selection, keyboard selection, and duplicate prevention', () => {
    openCreate();
    fixture.componentInstance.languageMasterDropdownOpen = true;
    fixture.componentInstance.languageMasterOptions = [java, french];
    const event = { key: 'ArrowDown', preventDefault: jasmine.createSpy('preventDefault') } as unknown as KeyboardEvent;
    fixture.componentInstance.languageMasterKeydown(event);
    fixture.componentInstance.languageMasterKeydown({ key: 'Enter', preventDefault: jasmine.createSpy('preventDefault') } as unknown as KeyboardEvent);

    expect(fixture.componentInstance.selectedLanguageMasterOption).toEqual(french);
    fixture.componentInstance.languages = [english];
    fixture.componentInstance.selectedLanguageMasterOption = java;
    fixture.componentInstance.languageInputValue = java.name;
    fixture.componentInstance.languageForm.controls.languageId.setValue(java.id);
    fixture.componentInstance.selectLanguageMasterOption(java);
    fixture.componentInstance.languageForm.controls.level.setValue('ADVANCED');
    fixture.componentInstance.submitLanguage();

    expect(profiles.createProfileLanguage).not.toHaveBeenCalled();
    expect(fixture.componentInstance.languageForm.controls.languageId.errors?.['duplicate']).toBeTruthy();
  });

  it('debounces search and rejects a stale Master response', fakeAsync(() => {
    const requests: Subject<ReturnType<typeof masterPage>>[] = [];
    profiles.listLanguageMaster.and.callFake(() => {
      const request = new Subject<ReturnType<typeof masterPage>>();
      requests.push(request);
      return request;
    });
    openCreate();
    fixture.componentInstance.languageMasterInputChanged('a');
    tick(299);
    expect(profiles.listLanguageMaster).toHaveBeenCalledTimes(1);
    tick(1);
    fixture.componentInstance.languageMasterInputChanged('b');
    tick(300);

    requests[2].next(masterPage([{ id: 13, name: 'Burmese' }]));
    requests[1].next(masterPage([{ id: 14, name: 'Arabic' }]));
    expect(fixture.componentInstance.languageMasterOptions).toEqual([{ id: 13, name: 'Burmese' }]);
  }));

  it('retains query paging and merges Master results without duplicates', () => {
    const pages = [
      { content: [java], page: 0, size: 10, totalElements: 2, totalPages: 2 },
      { content: [java, french], page: 1, size: 10, totalElements: 2, totalPages: 2 },
    ];
    profiles.listLanguageMaster.and.returnValues(of(pages[0]), of(pages[1]));
    openCreate();
    fixture.componentInstance.loadMoreLanguageMaster();

    expect(profiles.listLanguageMaster).toHaveBeenCalledWith(1, 10, '');
    expect(fixture.componentInstance.languageMasterOptions).toEqual([java, french]);
  });

  it('chains the returned canonical version through Save and add another', () => {
    context.applyMutationVersion.and.callFake((_id: string, version: number) => {
      context.detail.set({ ...profile, version });
      return true;
    });
    profiles.createProfileLanguage.and.returnValues(
      of({ profileLanguage: { profileLanguageId: 3, languageId: french.id, languageName: french.name, level: 'INTERMEDIATE' as const }, profileVersion: 4 }),
      of({ profileLanguage: { profileLanguageId: 4, languageId: german.id, languageName: german.name, level: 'ADVANCED' as const }, profileVersion: 5 }),
    );
    openCreate();
    select();
    fixture.componentInstance.submitLanguage('add-another');
    expect(profiles.createProfileLanguage).toHaveBeenCalledWith('1', jasmine.objectContaining({ version: 3 }));
    expect(fixture.componentInstance.languageEditorMode).toBe('create');
    select(german);
    fixture.componentInstance.submitLanguage();

    expect(profiles.createProfileLanguage).toHaveBeenCalledWith('1', jasmine.objectContaining({ version: 4 }));
    expect(context.applyMutationVersion).toHaveBeenCalledWith('1', 5);
    expect(fixture.componentInstance.editSession.dirty()).toBeFalse();
  });

  it('updates an existing Language and clears the dirty editor after success', () => {
    const updated = { ...english, level: 'NATIVE' as const };
    profiles.updateProfileLanguage.and.returnValue(of({ profileLanguage: updated, profileVersion: 4 }));
    fixture.componentInstance.startLanguageEdit(english);
    fixture.componentInstance.languageForm.controls.level.setValue('NATIVE');
    fixture.componentInstance.submitLanguage();

    expect(profiles.updateProfileLanguage).toHaveBeenCalledWith('1', 1, jasmine.objectContaining({ level: 'NATIVE', version: 3 }));
    expect(fixture.componentInstance.languages.find((item) => item.profileLanguageId === 1)?.level).toBe('NATIVE');
    expect(fixture.componentInstance.languageEditorMode).toBeNull();
    expect(notifications.showSuccess).toHaveBeenCalledWith('Language updated successfully.');
  });

  it('tracks dirty drafts through cancel and successful delete mutation', () => {
    fixture.componentInstance.startLanguageCreate();
    select(german);
    expect(fixture.componentInstance.editSession.dirty()).toBeTrue();
    fixture.componentInstance.cancelEditing();
    expect(fixture.componentInstance.cancelConfirmation).toBeTrue();
    fixture.componentInstance.discardEditing();
    expect(fixture.componentInstance.editSession.dirty()).toBeFalse();

    profiles.deleteProfileLanguage.and.returnValue(of({ profileVersion: 4 }));
    fixture.componentInstance.openLanguageDeleteConfirmation(english);
    fixture.componentInstance.confirmLanguageDelete();
    expect(fixture.componentInstance.languages).not.toContain(english);
    expect(notifications.showSuccess).toHaveBeenCalledWith('Language deleted successfully.');
  });

  it('keeps a draft on save conflict and requires explicit reload', () => {
    profiles.createProfileLanguage.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'PROFILE_VERSION_CONFLICT' } })));
    openCreate();
    select();
    fixture.componentInstance.submitLanguage();

    expect(fixture.componentInstance.languageConflict).toBeTrue();
    expect(fixture.componentInstance.languageEditorMode).toBe('create');
    expect(fixture.componentInstance.editSession.dirty()).toBeTrue();
  });

  it('recovers a delete conflict without automatically retrying deletion', () => {
    profiles.deleteProfileLanguage.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'PROFILE_VERSION_CONFLICT' } })));
    fixture.componentInstance.openLanguageDeleteConfirmation(english);
    fixture.componentInstance.confirmLanguageDelete();

    expect(fixture.componentInstance.hasDeleteConflict()).toBeTrue();
    expect(fixture.componentInstance.languages).toContain(english);
    expect(notifications.showSuccess).not.toHaveBeenCalled();
    fixture.componentInstance.reloadLatest();

    expect(fixture.componentInstance.hasDeleteConflict()).toBeFalse();
    expect(fixture.componentInstance.languageDeleteTarget).toEqual(english);
    expect(profiles.deleteProfileLanguage).toHaveBeenCalledTimes(1);
  });

  it('ignores stale list responses after Profile switching', () => {
    const pending = new Subject<ProfileLanguage[]>();
    profiles.listProfileLanguages.and.returnValue(pending);
    const switchedFixture = TestBed.createComponent(LanguageSectionComponent);
    switchedFixture.componentInstance.profile = profile;
    switchedFixture.detectChanges();
    switchedFixture.componentInstance.resetForProfile();
    context.selectedId.set('2');
    context.detail.set({ ...profile, id: 2 });
    pending.next([english]);

    expect(switchedFixture.componentInstance.languages).toEqual([]);
    switchedFixture.destroy();
  });
});

function masterPage(content: LanguageMasterOption[]) {
  return { content, page: 0, size: 10, totalElements: content.length, totalPages: 1 };
}
