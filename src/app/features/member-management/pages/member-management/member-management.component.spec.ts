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

  it('shows a left-side tab workspace with only the selected picker panel rendered', () => {
    const tablist = fixture.nativeElement.querySelector('[role="tablist"]') as HTMLElement;
    const languageTab = fixture.nativeElement.querySelector('#member-filter-tab-languages') as HTMLButtonElement;
    const skillTab = fixture.nativeElement.querySelector('#member-filter-tab-skills') as HTMLButtonElement;

    expect(tablist).not.toBeNull();
    expect(languageTab.getAttribute('aria-selected')).toBe('true');
    expect(skillTab.getAttribute('aria-selected')).toBe('false');
    expect(fixture.nativeElement.querySelectorAll('app-member-filter-choice-picker').length).toBe(1);
    expect(fixture.nativeElement.querySelector('app-member-filter-choice-picker').getAttribute('kind')).toBe('LANGUAGE');

    skillTab.click();
    fixture.detectChanges();

    expect(languageTab.getAttribute('aria-selected')).toBe('false');
    expect(skillTab.getAttribute('aria-selected')).toBe('true');
    expect(fixture.nativeElement.querySelectorAll('app-member-filter-choice-picker').length).toBe(1);
    expect(fixture.nativeElement.querySelector('app-member-filter-choice-picker').getAttribute('kind')).toBe('SKILL');
  });

  it('shows optional Level and adds a Language with Any Level by default', () => {
    const level = fixture.nativeElement.querySelector('#pending-language-level') as HTMLSelectElement;
    const add = fixture.nativeElement.querySelector('#add-pending-language') as HTMLButtonElement;

    expect(level).not.toBeNull();
    expect(level.options[0].textContent).toBe('Any Level');
    expect(add.disabled).toBeTrue();
    component.chooseLanguage({ id: 'en', name: 'English' });
    fixture.detectChanges();
    expect(component.filterDraft.languages).toEqual([]);
    expect(add.disabled).toBeFalse();
    component.addPendingLanguage();
    fixture.detectChanges();

    expect(component.filterDraft.languages).toEqual([{ languageId: 'en', level: null }]);
    expect(fixture.nativeElement.querySelector('#pending-language-level').value).toBe('');
    expect(fixture.nativeElement.querySelector('.selected-filter-language')?.textContent).toContain('English');
    expect(fixture.nativeElement.querySelector('.selected-filter-language')?.textContent).toContain('Any Level');
  });

  it('shows optional Seniority before selecting a Skill and adds the Skill with Any Seniority by default', () => {
    (fixture.nativeElement.querySelector('#member-filter-tab-skills') as HTMLButtonElement).click();
    fixture.detectChanges();
    const seniority = fixture.nativeElement.querySelector('#pending-skill-seniority') as HTMLSelectElement;
    expect(seniority).not.toBeNull();
    expect(seniority.value).toBe('');

    component.chooseSkill({ id: 11, name: 'Java' });
    fixture.detectChanges();
    expect(component.canAddPendingSkill).toBeTrue();
    component.addPendingSkill();
    fixture.detectChanges();

    expect(component.filterDraft.skills).toEqual([{ skillId: 11, seniorityId: null }]);
    expect(fixture.nativeElement.querySelector('.selected-filter-skill')?.textContent).toContain('Any Seniority');
  });

  it('keeps Level and Seniority editable in the selected summary while switching tabs', () => {
    component.selectLanguage({ id: 'en', name: 'English' });
    component.setLanguageLevel(0, 'INTERMEDIATE');
    component.selectSkill({ id: 11, name: 'Java' });
    component.setSkillSeniority(0, '21');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#selected-language-level-0')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#selected-skill-seniority-0')).not.toBeNull();
    (fixture.nativeElement.querySelector('#member-filter-tab-skills') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.selected-filter-language')?.textContent).toContain('English');
    expect(fixture.nativeElement.querySelector('.selected-filter-skill')?.textContent).toContain('Java');
    expect((fixture.nativeElement.querySelector('#selected-language-level-0') as HTMLSelectElement).value).toBe('INTERMEDIATE');
    expect((fixture.nativeElement.querySelector('#selected-skill-seniority-0') as HTMLSelectElement).value).toBe('21');
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

  it('shows the base empty-state copy when the Member list has no records', () => {
    members.list.and.returnValue(of(page([], 0, 0, 0)));
    component.loadMembers(0);
    fixture.detectChanges();

    expect(component.appliedFilter).toBeNull();
    expect(fixture.nativeElement.querySelector('.empty-state h2')?.textContent?.trim()).toBe('No members found.');
  });

  it('shows the matching empty-state copy and retains applied filters when the Member search is empty or fails', () => {
    component.selectSkill({ id: 11, name: 'Java' });
    members.searchMembers.and.returnValue(of(page([], 0, 0, 0)));
    component.applyFilters();
    fixture.detectChanges();

    expect(component.appliedFilter?.skills).toEqual([{ skillId: 11, seniorityId: null }]);
    expect(component.filterDraft.skills).toEqual([{ skillId: 11, seniorityId: null }]);
    expect(fixture.nativeElement.querySelector('.empty-state h2')?.textContent?.trim()).toBe('No matching members found.');

    component.setSearchDraft('alice');
    expect(component.appliedFilter?.search).toBe('');
    expect(component.filterDraft.search).toBe('alice');
    component.applyFilters();
    expect(component.appliedFilter?.search).toBe('alice');
    expect(component.appliedFilter?.skills).toEqual([{ skillId: 11, seniorityId: null }]);

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
    (fixture.nativeElement.querySelector('#member-filter-tab-skills') as HTMLButtonElement).click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('[role="combobox"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(component.filterDraft.languages).toEqual([{ languageId: 'en', level: null }]);
    expect(component.filterDraft.skills).toEqual([{ skillId: 11, seniorityId: null }]);
    expect(fixture.nativeElement.textContent).toContain('Unable to load Skills right now.');
  });
});
