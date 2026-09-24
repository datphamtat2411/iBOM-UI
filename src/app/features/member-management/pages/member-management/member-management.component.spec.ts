import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { MasterDataService } from '../../../master-data/services/master-data.service';
import {
  LanguageLevel,
  MemberPage,
  MemberSummary,
  SearchChoice,
  SearchChoicePage,
} from '../../models/member-management.models';
import { MemberManagementService } from '../../services/member-management.service';
import { MemberManagementComponent } from './member-management.component';

describe('MemberManagementComponent', () => {
  let fixture: ComponentFixture<MemberManagementComponent>;
  let component: MemberManagementComponent;
  let members: {
    list: jasmine.Spy;
    searchMembers: jasmine.Spy;
    listSkills: jasmine.Spy;
    listLanguages: jasmine.Spy;
    listSeniorities: jasmine.Spy;
  };
  let masterData: { listSkillCategories: jasmine.Spy };
  let router: { navigate: jasmine.Spy };

  const inactive: MemberSummary = {
    id: 2,
    username: 'zara',
    email: 'zara@example.com',
    status: 'INACTIVE',
    activeProfileCount: 0,
    lastUpdatedAt: '2026-01-02T00:00:00Z',
  };
  const active: MemberSummary = {
    id: 1,
    username: 'alice',
    email: 'alice@example.com',
    status: 'ACTIVE',
    activeProfileCount: 2,
    lastUpdatedAt: '2026-01-03T00:00:00Z',
  };

  function page(content: MemberSummary[] = [active, inactive], currentPage = 0, totalPages = 1, totalElements = content.length): MemberPage {
    return { content, page: currentPage, size: 10, totalElements, totalPages };
  }

  function choicePage(content: SearchChoice[], currentPage = 0, totalPages = 1): SearchChoicePage {
    return { content, page: currentPage, size: 10, totalElements: content.length, totalPages };
  }

  beforeEach(async () => {
    members = {
      list: jasmine.createSpy('list').and.returnValue(of(page())),
      searchMembers: jasmine.createSpy('searchMembers').and.returnValue(of(page())),
      listSkills: jasmine.createSpy('listSkills').and.returnValue(of(choicePage([{ id: 11, name: 'Java', categoryId: 7, categoryName: 'Backend' }]))),
      listLanguages: jasmine.createSpy('listLanguages').and.returnValue(of(choicePage([{ id: 'en', name: 'English' }]))),
      listSeniorities: jasmine.createSpy('listSeniorities').and.returnValue(of([{ id: 21, name: 'Senior' }])),
    };
    masterData = {
      listSkillCategories: jasmine.createSpy('listSkillCategories').and.returnValue(of([{ id: 7, code: 'BACKEND', name: 'Backend' }])),
    };
    router = { navigate: jasmine.createSpy('navigate').and.resolveTo(true) };
    await TestBed.configureTestingModule({
      imports: [MemberManagementComponent],
      providers: [
        { provide: MemberManagementService, useValue: members },
        { provide: MasterDataService, useValue: masterData },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MemberManagementComponent);
    fixture.detectChanges();
    component = fixture.componentInstance;
  });

  it('uses one unified workspace without Search Mode or Add Condition interactions', () => {
    expect(fixture.nativeElement.textContent).not.toContain('Search mode');
    expect(fixture.nativeElement.textContent).not.toContain('Add condition');
    expect(component.filterDraft).toEqual({ search: '', status: 'ALL', languages: [], skills: [] });
  });

  it('applies account, Language, and Skill conditions in one request with optional Any modifiers', () => {
    members.searchMembers.calls.reset();
    component.setSearchDraft('  alice  ');
    component.setStatusDraft('ACTIVE');
    component.selectLanguage({ id: 'en', name: 'English' });
    component.selectSkill({ id: 11, name: 'Java', categoryId: 7, categoryName: 'Backend' });
    component.applyFilters();

    expect(members.searchMembers).toHaveBeenCalledTimes(1);
    expect(members.searchMembers).toHaveBeenCalledWith({
      search: 'alice',
      status: 'ACTIVE',
      languages: [{ languageId: 'en', level: null }],
      skills: [{ skillId: 11, seniorityId: null }],
      page: 0,
      size: 10,
    });
    expect(component.appliedFilter).toEqual({
      search: 'alice',
      status: 'ACTIVE',
      languages: [{ languageId: 'en', level: null }],
      skills: [{ skillId: 11, seniorityId: null }],
    });

    fixture.detectChanges();
    const conditionText = [...fixture.nativeElement.querySelectorAll('.condition')]
      .map((condition: HTMLElement) => condition.textContent?.trim());
    expect(conditionText[0]).toContain('English');
    expect(conditionText[1]).toContain('Java');
  });

  it('prevents duplicate conditions and allows partial modifier changes', () => {
    component.selectLanguage({ id: 'en', name: 'English' });
    component.selectLanguage({ id: 'en', name: 'English' });
    component.selectSkill({ id: 11, name: 'Java' });
    component.setLanguageLevel(0, 'ADVANCED');
    component.setSkillSeniority(0, '21');

    expect(component.filterDraft.languages).toEqual([{ languageId: 'en', level: 'ADVANCED' as LanguageLevel }]);
    expect(component.filterDraft.skills).toEqual([{ skillId: 11, seniorityId: '21' }]);
  });

  it('paginates with the immutable applied snapshot instead of unsaved draft edits', () => {
    members.searchMembers.and.returnValue(of(page([active], 0, 2, 11)));
    component.setSearchDraft('alice');
    component.selectLanguage({ id: 'en', name: 'English' });
    component.applyFilters();

    component.setSearchDraft('unsaved-edit');
    component.selectSkill({ id: 11, name: 'Java' });
    members.searchMembers.calls.reset();
    component.nextPage();

    expect(members.searchMembers).toHaveBeenCalledTimes(1);
    expect(members.searchMembers).toHaveBeenCalledWith({
      search: 'alice',
      status: null,
      languages: [{ languageId: 'en', level: null }],
      skills: [],
      page: 1,
      size: 10,
    });
  });

  it('retains applied filters when the Member search is empty or fails', () => {
    component.selectSkill({ id: 11, name: 'Java' });
    members.searchMembers.and.returnValue(of(page([], 0, 0, 0)));
    component.applyFilters();
    fixture.detectChanges();

    expect(component.appliedFilter?.skills).toEqual([{ skillId: 11, seniorityId: null }]);
    expect(fixture.nativeElement.textContent).toContain('No Members match these conditions');

    const failedSearch = new Subject<MemberPage>();
    members.searchMembers.and.returnValue(failedSearch);
    component.applyFilters();
    failedSearch.error(new HttpErrorResponse({ status: 503, error: { message: 'Search unavailable' } }));
    fixture.detectChanges();

    expect(component.appliedFilter?.skills).toEqual([{ skillId: 11, seniorityId: null }]);
    expect(fixture.nativeElement.textContent).toContain('Search unavailable');
  });

  it('keeps matching Profile evidence and managed-Member navigation in the result table', () => {
    const matchingMember: MemberSummary = {
      ...inactive,
      matchingProfiles: [{ id: 101, name: 'Backend CV', firstName: 'Zara', lastName: 'Nguyen', jobTitle: 'Engineer' }],
    };
    members.list.and.returnValue(of(page([matchingMember])));
    component.loadMembers(0);
    fixture.detectChanges();

    const action = fixture.nativeElement.querySelector('.row-actions button') as HTMLButtonElement;
    action.click();
    expect(fixture.nativeElement.textContent).toContain('Backend CV');
    expect(router.navigate).toHaveBeenCalledWith(['/members', 2, 'profiles'], {
      state: { managedMember: { id: '2', username: 'zara', email: 'zara@example.com' } },
    });
  });

  it('preserves draft choices when choice loading fails', () => {
    component.selectLanguage({ id: 'en', name: 'English' });
    component.selectSkill({ id: 11, name: 'Java' });
    members.listSkills.and.returnValue(throwError(() => new HttpErrorResponse({ status: 503, error: { message: 'Skills unavailable' } })));
    fixture.detectChanges();

    expect(component.filterDraft.languages).toEqual([{ languageId: 'en', level: null }]);
    expect(component.filterDraft.skills).toEqual([{ skillId: 11, seniorityId: null }]);
  });
});
