import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Subject, of, throwError } from 'rxjs';

import { NotificationService } from '../../../../../../core/notifications/notification.service';
import { ProfileDetail, ProfileSkill, SkillMasterOption } from '../../../../models/profile.models';
import { ProfileContextService } from '../../../../services/profile-context.service';
import { ProfileService } from '../../../../services/profile.service';
import { SkillSectionComponent } from './skill-section.component';

describe('SkillSectionComponent', () => {
  let fixture: ComponentFixture<SkillSectionComponent>;
  let context: {
    selectedId: ReturnType<typeof signal>;
    detail: ReturnType<typeof signal>;
    applyMutationVersion: jasmine.Spy;
    reloadDetail: jasmine.Spy;
  };
  let profiles: {
    listProfileSkills: jasmine.Spy;
    createProfileSkill: jasmine.Spy;
    updateProfileSkill: jasmine.Spy;
    deleteProfileSkill: jasmine.Spy;
    listSkillMaster: jasmine.Spy;
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
  };
  const angularSkill: ProfileSkill = { profileSkillId: 1, skillId: 10, skillName: 'Angular', categoryId: 1, categoryCode: 'FE', categoryName: 'Frontend', experienceYears: 4.5, lastUsed: '2026-01-01' };
  const javaSkill: ProfileSkill = { profileSkillId: 2, skillId: 11, skillName: 'Java', categoryId: 2, categoryCode: 'BE', categoryName: 'Backend', experienceYears: 6, lastUsed: null };
  const angular: SkillMasterOption = { id: 10, name: 'Angular', categoryId: 1, categoryCode: 'FE', categoryName: 'Frontend' };
  const typescript: SkillMasterOption = { id: 12, name: 'TypeScript', categoryId: 1, categoryCode: 'FE', categoryName: 'Frontend' };
  const python: SkillMasterOption = { id: 13, name: 'Python', categoryId: 2, categoryCode: 'BE', categoryName: 'Backend' };

  beforeEach(async () => {
    context = {
      selectedId: signal('1'),
      detail: signal<ProfileDetail | null>(profile),
      applyMutationVersion: jasmine.createSpy('applyMutationVersion').and.returnValue(true),
      reloadDetail: jasmine.createSpy('reloadDetail').and.returnValue(of(profile)),
    };
    profiles = {
      listProfileSkills: jasmine.createSpy('listProfileSkills').and.returnValue(of([angularSkill, javaSkill])),
      createProfileSkill: jasmine.createSpy('createProfileSkill'),
      updateProfileSkill: jasmine.createSpy('updateProfileSkill'),
      deleteProfileSkill: jasmine.createSpy('deleteProfileSkill'),
      listSkillMaster: jasmine.createSpy('listSkillMaster').and.returnValue(of({ content: [angular, typescript, python], page: 0, size: 10, totalElements: 3, totalPages: 1 })),
    };
    notifications = { showSuccess: jasmine.createSpy('showSuccess') };

    await TestBed.configureTestingModule({
      imports: [SkillSectionComponent],
      providers: [
        { provide: ProfileContextService, useValue: context },
        { provide: ProfileService, useValue: profiles },
        { provide: NotificationService, useValue: notifications },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(SkillSectionComponent);
    fixture.componentInstance.profile = profile;
    fixture.detectChanges();
    fixture.componentInstance.resetForProfile();
  });

  function openCreate(): void {
    fixture.componentInstance.startSkillCreate();
    fixture.detectChanges();
  }

  function select(option: SkillMasterOption = typescript): void {
    fixture.componentInstance.selectSkillMasterOption(option);
    fixture.componentInstance.skillForm.controls.experienceYears.setValue(1.5);
  }

  it('loads and orders Skill records by experience then case-insensitive name', () => {
    expect(fixture.componentInstance.skills.map((item) => item.skillName)).toEqual(['Java', 'Angular']);
    expect(fixture.componentInstance.skillLastUsedLabel(angularSkill)).toBe('Jan 2026');
  });

  it('starts create mode with required Experience Years validation', () => {
    openCreate();
    fixture.componentInstance.submitSkill();

    expect(profiles.createProfileSkill).not.toHaveBeenCalled();
    expect(fixture.componentInstance.skillForm.controls.skillId.touched).toBeTrue();
    expect(fixture.componentInstance.skillForm.controls.experienceYears.errors?.['required']).toBeTrue();
  });

  it('requires controlled Master selection and derives Category read-only', () => {
    openCreate();
    fixture.componentInstance.skillMasterInputChanged('Typed only');
    fixture.componentInstance.skillForm.controls.experienceYears.setValue(2.25);
    fixture.componentInstance.submitSkill();
    expect(profiles.createProfileSkill).not.toHaveBeenCalled();

    select(typescript);
    expect(fixture.componentInstance.selectedSkillCategory()).toBe('Frontend');
    profiles.createProfileSkill.and.returnValue(of({ profileSkill: { profileSkillId: 3, skillId: typescript.id, skillName: typescript.name, categoryId: typescript.categoryId, categoryCode: typescript.categoryCode, categoryName: typescript.categoryName, experienceYears: 1.5, lastUsed: null }, profileVersion: 4 }));
    fixture.componentInstance.submitSkill();
    expect(profiles.createProfileSkill).toHaveBeenCalledWith('1', jasmine.objectContaining({ skillId: 12, experienceYears: 1.5, version: 3 }));
  });

  it('preserves decimal Experience Years and rejects future Last Used', () => {
    openCreate();
    select();
    fixture.componentInstance.skillForm.controls.lastUsed.setValue('2999-01-01');
    expect(fixture.componentInstance.skillForm.controls.lastUsed.errors?.['futureDate']).toBeTrue();
    fixture.componentInstance.submitSkill();
    expect(profiles.createProfileSkill).not.toHaveBeenCalled();

    fixture.componentInstance.skillForm.controls.lastUsed.setValue('2024-05-01');
    profiles.createProfileSkill.and.returnValue(of({ profileSkill: { profileSkillId: 3, skillId: typescript.id, skillName: typescript.name, categoryId: typescript.categoryId, categoryCode: typescript.categoryCode, categoryName: typescript.categoryName, experienceYears: 1.5, lastUsed: '2024-05-01' }, profileVersion: 4 }));
    fixture.componentInstance.submitSkill();
    expect(profiles.createProfileSkill).toHaveBeenCalledWith('1', jasmine.objectContaining({ experienceYears: 1.5, lastUsed: '2024-05-01' }));
  });

  it('supports keyboard selection, duplicate prevention, and paging', () => {
    openCreate();
    fixture.componentInstance.skillMasterDropdownOpen = true;
    fixture.componentInstance.skillMasterOptions = [angular, typescript];
    fixture.componentInstance.skillMasterKeydown({ key: 'ArrowDown', preventDefault: jasmine.createSpy() } as unknown as KeyboardEvent);
    fixture.componentInstance.skillMasterKeydown({ key: 'Enter', preventDefault: jasmine.createSpy() } as unknown as KeyboardEvent);
    expect(fixture.componentInstance.selectedSkillMasterOption).toEqual(typescript);

    fixture.componentInstance.skills = [angularSkill];
    fixture.componentInstance.selectedSkillMasterOption = angular;
    fixture.componentInstance.skillInputValue = angular.name;
    fixture.componentInstance.skillForm.controls.skillId.setValue(angular.id);
    fixture.componentInstance.skillForm.controls.experienceYears.setValue(1);
    fixture.componentInstance.submitSkill();
    expect(profiles.createProfileSkill).not.toHaveBeenCalled();
    expect(fixture.componentInstance.skillForm.controls.skillId.errors?.['duplicate']).toBeTruthy();

    profiles.listSkillMaster.and.returnValues(
      of({ content: [angular], page: 0, size: 10, totalElements: 2, totalPages: 2 }),
      of({ content: [angular, typescript], page: 1, size: 10, totalElements: 2, totalPages: 2 }),
    );
    fixture.componentInstance.searchSkillMaster();
    fixture.componentInstance.loadMoreSkillMaster();
    expect(profiles.listSkillMaster).toHaveBeenCalledWith(1, 10, 'Angular');
    expect(fixture.componentInstance.skillMasterOptions).toEqual([angular, typescript]);
  });

  it('debounces search and rejects stale Skill responses', fakeAsync(() => {
    const requests: Subject<ReturnType<typeof skillPage>>[] = [];
    profiles.listSkillMaster.and.callFake(() => {
      const request = new Subject<ReturnType<typeof skillPage>>();
      requests.push(request);
      return request;
    });
    openCreate();
    fixture.componentInstance.skillMasterInputChanged('a');
    tick(300);
    fixture.componentInstance.skillMasterInputChanged('b');
    tick(300);
    requests[2].next(skillPage([{ id: 14, name: 'Bun', categoryId: 1, categoryCode: 'FE', categoryName: 'Frontend' }]));
    requests[1].next(skillPage([{ id: 15, name: 'Ant', categoryId: 1, categoryCode: 'FE', categoryName: 'Frontend' }]));

    expect(fixture.componentInstance.skillMasterOptions[0].name).toBe('Bun');
  }));

  it('chains the canonical Profile version through Save and add another', () => {
    context.applyMutationVersion.and.callFake((_id: string, version: number) => {
      context.detail.set({ ...profile, version });
      return true;
    });
    profiles.createProfileSkill.and.returnValues(
      of({ profileSkill: { profileSkillId: 3, skillId: typescript.id, skillName: typescript.name, categoryId: typescript.categoryId, categoryCode: typescript.categoryCode, categoryName: typescript.categoryName, experienceYears: 1.5, lastUsed: null }, profileVersion: 4 }),
      of({ profileSkill: { profileSkillId: 4, skillId: python.id, skillName: python.name, categoryId: python.categoryId, categoryCode: python.categoryCode, categoryName: python.categoryName, experienceYears: 2, lastUsed: null }, profileVersion: 5 }),
    );
    openCreate();
    select();
    fixture.componentInstance.submitSkill('add-another');
    expect(profiles.createProfileSkill).toHaveBeenCalledWith('1', jasmine.objectContaining({ version: 3 }));
    select(python);
    fixture.componentInstance.submitSkill();

    expect(profiles.createProfileSkill).toHaveBeenCalledWith('1', jasmine.objectContaining({ version: 4 }));
    expect(fixture.componentInstance.editSession.dirty()).toBeFalse();
  });

  it('updates an existing Skill with decimal Experience Years', () => {
    const updated = { ...angularSkill, experienceYears: 5.75 };
    profiles.updateProfileSkill.and.returnValue(of({ profileSkill: updated, profileVersion: 4 }));
    fixture.componentInstance.startSkillEdit(angularSkill);
    fixture.componentInstance.skillForm.controls.experienceYears.setValue(5.75);
    fixture.componentInstance.submitSkill();

    expect(profiles.updateProfileSkill).toHaveBeenCalledWith('1', 1, jasmine.objectContaining({ experienceYears: 5.75, version: 3 }));
    expect(fixture.componentInstance.skills.find((item) => item.profileSkillId === 1)?.experienceYears).toBe(5.75);
    expect(fixture.componentInstance.skillEditorMode).toBeNull();
    expect(notifications.showSuccess).toHaveBeenCalledWith('Skill updated successfully.');
  });

  it('tracks dirty drafts through cancel and successful delete mutation', () => {
    fixture.componentInstance.startSkillCreate();
    select(python);
    expect(fixture.componentInstance.editSession.dirty()).toBeTrue();
    fixture.componentInstance.cancelEditing();
    expect(fixture.componentInstance.cancelConfirmation).toBeTrue();
    fixture.componentInstance.discardEditing();
    expect(fixture.componentInstance.editSession.dirty()).toBeFalse();

    profiles.deleteProfileSkill.and.returnValue(of({ profileVersion: 4 }));
    fixture.componentInstance.openSkillDeleteConfirmation(angularSkill);
    fixture.componentInstance.confirmSkillDelete();
    expect(fixture.componentInstance.skills).not.toContain(angularSkill);
    expect(notifications.showSuccess).toHaveBeenCalledWith('Skill deleted successfully.');
  });

  it('keeps a draft on update conflict', () => {
    profiles.updateProfileSkill.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'PROFILE_VERSION_CONFLICT' } })));
    fixture.componentInstance.startSkillEdit(angularSkill);
    fixture.componentInstance.skillForm.controls.experienceYears.setValue(5.5);
    fixture.componentInstance.submitSkill();

    expect(fixture.componentInstance.skillConflict).toBeTrue();
    expect(fixture.componentInstance.skillEditorMode).toBe('edit');
  });

  it('recovers a delete conflict without automatically retrying deletion', () => {
    profiles.deleteProfileSkill.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'PROFILE_VERSION_CONFLICT' } })));
    fixture.componentInstance.openSkillDeleteConfirmation(angularSkill);
    fixture.componentInstance.confirmSkillDelete();

    expect(fixture.componentInstance.hasDeleteConflict()).toBeTrue();
    expect(fixture.componentInstance.skills).toContain(angularSkill);
    expect(notifications.showSuccess).not.toHaveBeenCalled();
    fixture.componentInstance.reloadLatest();

    expect(fixture.componentInstance.hasDeleteConflict()).toBeFalse();
    expect(fixture.componentInstance.skillDeleteTarget).toEqual(angularSkill);
    expect(profiles.deleteProfileSkill).toHaveBeenCalledTimes(1);
  });

  it('ignores stale list responses after Profile switching', () => {
    const pending = new Subject<ProfileSkill[]>();
    profiles.listProfileSkills.and.returnValue(pending);
    const switchedFixture = TestBed.createComponent(SkillSectionComponent);
    switchedFixture.componentInstance.profile = profile;
    switchedFixture.detectChanges();
    switchedFixture.componentInstance.resetForProfile();
    context.selectedId.set('2');
    context.detail.set({ ...profile, id: 2 });
    pending.next([angularSkill]);

    expect(switchedFixture.componentInstance.skills).toEqual([]);
    switchedFixture.destroy();
  });
});

function skillPage(content: SkillMasterOption[]) {
  return { content, page: 0, size: 10, totalElements: content.length, totalPages: 1 };
}
