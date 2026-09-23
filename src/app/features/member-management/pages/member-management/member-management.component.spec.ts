import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

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
  let members: {
    list: jasmine.Spy;
    searchBySkill: jasmine.Spy;
    searchByLanguage: jasmine.Spy;
    listSkills: jasmine.Spy;
    listLanguages: jasmine.Spy;
    listSeniorities: jasmine.Spy;
  };
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
    return { content, page: currentPage, size: 100, totalElements: content.length, totalPages };
  }

  beforeEach(async () => {
    members = {
      list: jasmine.createSpy('list').and.returnValue(of(page())),
      searchBySkill: jasmine.createSpy('searchBySkill').and.returnValue(of(page())),
      searchByLanguage: jasmine.createSpy('searchByLanguage').and.returnValue(of(page())),
      listSkills: jasmine.createSpy('listSkills').and.returnValue(of(choicePage([{ id: 1, name: 'Java' }]))),
      listLanguages: jasmine.createSpy('listLanguages').and.returnValue(of(choicePage([{ id: 2, name: 'English' }]))),
      listSeniorities: jasmine.createSpy('listSeniorities').and.returnValue(of([{ id: 3, name: 'Senior' }])),
    };
    router = { navigate: jasmine.createSpy('navigate').and.resolveTo(true) };
    await TestBed.configureTestingModule({
      imports: [MemberManagementComponent],
      providers: [{ provide: MemberManagementService, useValue: members }, { provide: Router, useValue: router }],
    }).compileComponents();

    fixture = TestBed.createComponent(MemberManagementComponent);
  });

  function initialize(): MemberManagementComponent {
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('loads inactive Members by default and preserves backend ordering without Profile-derived identity fields', () => {
    members.list.and.returnValue(of(page([inactive, active])));
    const component = initialize();

    expect(members.list).toHaveBeenCalledWith(0, 10, '', undefined);
    expect(component.members).toEqual([inactive, active]);
    const rows = [...fixture.nativeElement.querySelectorAll('tbody tr')].map((row: HTMLTableRowElement) => row.cells[0].textContent?.trim());
    expect(rows).toEqual(['zara', 'alice']);
    expect(fixture.nativeElement.textContent).not.toContain('Full Name');
    expect(fixture.nativeElement.textContent).not.toContain('Job Title');
    expect(fixture.nativeElement.textContent).toContain('INACTIVE');
  });

  it('resets applied base search and status filters to page zero and clears them', () => {
    const component = initialize();
    members.list.calls.reset();

    component.searchDraft = '  alice  ';
    component.statusDraft = 'INACTIVE';
    component.applyFilters();
    expect(members.list).toHaveBeenCalledWith(0, 10, 'alice', 'INACTIVE');

    members.list.calls.reset();
    component.clearFilters();
    expect(members.list).toHaveBeenCalledWith(0, 10, '', undefined);
    expect(component.searchTerm).toBe('');
    expect(component.statusFilter).toBe('ALL');
    expect(component.appliedQuery).toBeNull();
  });

  it('shows total count, page boundaries, and the backend-recovered page', () => {
    members.list.and.returnValue(of(page([active], 0, 3, 21)));
    const component = initialize();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('21 Members');
    expect(fixture.nativeElement.textContent).toContain('Page 1 of 3');
    const buttons = fixture.nativeElement.querySelectorAll('.pagination button') as NodeListOf<HTMLButtonElement>;
    expect(buttons[0].disabled).toBeTrue();
    expect(buttons[1].disabled).toBeFalse();

    members.list.and.returnValue(of(page([active], 1, 3, 21)));
    component.goToPage(1);
    fixture.detectChanges();
    expect(members.list).toHaveBeenCalledWith(1, 10, '', undefined);
    expect(fixture.nativeElement.textContent).toContain('Page 2 of 3');

    members.list.and.returnValue(of(page([active], 1, 2, 11)));
    component.loadMembers(9);
    fixture.detectChanges();
    expect(component.currentPage).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('The requested page was unavailable. Showing page 2 instead.');
  });

  it('renders loading, unfiltered-empty, filtered-empty, error, retry, and busy states', () => {
    const initialRequest = new Subject<MemberPage>();
    members.list.and.returnValue(initialRequest);
    const component = initialize();

    expect(component.loading).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Loading Members...');
    initialRequest.next(page([]));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No Members yet');

    const filteredRequest = new Subject<MemberPage>();
    members.list.and.returnValue(filteredRequest);
    component.searchDraft = 'missing';
    component.applyFilters();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Filtering Members...');
    filteredRequest.next(page([]));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No Members match these filters');

    const failedRequest = new Subject<MemberPage>();
    members.list.and.returnValue(failedRequest);
    component.loadMembers(0, 'missing', 'ALL');
    failedRequest.error(new HttpErrorResponse({ status: 503, error: { message: 'Members service unavailable' } }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('Members service unavailable');
    expect(component.loading).toBeFalse();

    members.list.and.returnValue(of(page([active], 0, 1, 1)));
    component.retryMembers();
    fixture.detectChanges();
    expect(members.list).toHaveBeenCalledWith(0, 10, 'missing', undefined);
    expect(component.loading).toBeFalse();
  });

  it('keeps Skill + Seniority and Language + Level as isolated pair modes with ordered applied snapshots', () => {
    const component = initialize();
    members.searchBySkill.calls.reset();
    members.searchByLanguage.calls.reset();

    component.setSearchMode('SKILL');
    component.setSkillConditionValue(0, 'skillId', '11');
    component.setSkillConditionValue(0, 'seniorityId', '21');
    component.addCondition();
    component.setSkillConditionValue(1, 'skillId', '12');
    component.setSkillConditionValue(1, 'seniorityId', '22');
    members.searchBySkill.and.returnValue(of(page([inactive], 0, 2, 2)));
    component.applySearch();

    expect(members.searchBySkill).toHaveBeenCalledWith(0, 10, ['11', '12'], ['21', '22'], undefined);
    expect(members.searchByLanguage).not.toHaveBeenCalled();
    expect(component.appliedQuery).toEqual({
      mode: 'SKILL',
      pairs: [{ skillId: '11', seniorityId: '21' }, { skillId: '12', seniorityId: '22' }],
      status: 'ALL',
    });

    component.skillConditions[0].skillId = '999';
    members.searchBySkill.and.returnValue(of(page([active], 1, 2, 2)));
    component.goToPage(1);
    expect(members.searchBySkill).toHaveBeenCalledWith(1, 10, ['11', '12'], ['21', '22'], undefined);
    expect(members.searchByLanguage).not.toHaveBeenCalled();
    expect(component.members).toEqual([active]);
  });

  it('blocks incomplete and duplicate draft pairs without issuing a request', () => {
    const component = initialize();
    members.searchBySkill.calls.reset();
    component.setSearchMode('SKILL');

    component.applySearch();
    expect(component.validationMessage).toContain('Complete every Skill + Seniority condition');
    expect(members.searchBySkill).not.toHaveBeenCalled();

    component.setSkillConditionValue(0, 'skillId', '11');
    component.applySearch();
    expect(members.searchBySkill).not.toHaveBeenCalled();

    component.setSkillConditionValue(0, 'seniorityId', '21');
    component.addCondition();
    component.setSkillConditionValue(1, 'skillId', '11');
    component.setSkillConditionValue(1, 'seniorityId', '22');
    component.applySearch();
    expect(component.validationMessage).toContain('Each Skill can appear only once');
    expect(members.searchBySkill).not.toHaveBeenCalled();
  });

  it('loads every Skill and Language page and the complete Seniority read', () => {
    members.listSkills.and.returnValues(
      of(choicePage([{ id: 1, name: 'Java' }], 0, 2)),
      of(choicePage([{ id: 4, name: 'Angular' }], 1, 2)),
    );
    members.listLanguages.and.returnValues(
      of(choicePage([{ id: 2, name: 'English' }], 0, 2)),
      of(choicePage([{ id: 5, name: 'Japanese' }], 1, 2)),
    );
    members.listSeniorities.and.returnValue(of([{ id: 3, name: 'Senior' }, { id: 6, name: 'Junior' }]));

    const component = initialize();

    expect(members.listSkills).toHaveBeenCalledWith(0, 100);
    expect(members.listSkills).toHaveBeenCalledWith(1, 100);
    expect(members.listLanguages).toHaveBeenCalledWith(0, 100);
    expect(members.listLanguages).toHaveBeenCalledWith(1, 100);
    expect(component.skills.map((choice) => choice.name)).toEqual(['Java', 'Angular']);
    expect(component.languages.map((choice) => choice.name)).toEqual(['English', 'Japanese']);
    expect(component.seniorities.map((choice) => choice.name)).toEqual(['Senior', 'Junior']);
    expect(component.choicesLoaded).toBeTrue();
  });

  it('shows and retries search-choice load errors', () => {
    members.listSkills.and.returnValue(throwError(() => new HttpErrorResponse({ status: 503, error: { message: 'Master data unavailable' } })));
    const component = initialize();

    expect(component.choicesErrorMessage).toBe('Master data unavailable');
    expect(component.choicesLoaded).toBeFalse();
    members.listSkills.and.returnValue(of(choicePage([{ id: 1, name: 'Java' }])));
    component.retryChoices();

    expect(component.choicesErrorMessage).toBe('');
    expect(component.choicesLoaded).toBeTrue();
  });

  it('renders multiple matching Profiles as evidence on one Member row and keeps inactive Members eligible', () => {
    const matchingMember: MemberSummary = {
      ...inactive,
      matchingProfiles: [
        { id: 101, name: 'Backend CV', firstName: 'Zara', lastName: 'Nguyen', jobTitle: 'Engineer', updatedAt: '2026-02-01T00:00:00Z' },
        { id: 102, name: 'Platform CV', firstName: 'Zara', lastName: 'Nguyen', jobTitle: 'Lead Engineer', updatedAt: '2026-02-02T00:00:00Z' },
      ],
    };
    const component = initialize();
    component.setSearchMode('LANGUAGE');
    component.setLanguageConditionValue(0, 'languageId', '2');
    component.setLanguageConditionValue(0, 'level', 'ADVANCED');
    members.searchByLanguage.and.returnValue(of(page([matchingMember])));
    component.applySearch();
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(1);
    expect(rows[0].cells[0].textContent.trim()).toBe('zara');
    expect(rows[0].textContent).toContain('Backend CV');
    expect(rows[0].textContent).toContain('Platform CV');
    expect(rows[0].textContent).toContain('Lead Engineer');
    expect(fixture.nativeElement.textContent).toContain('INACTIVE');
    expect(members.searchBySkill).not.toHaveBeenCalled();
  });

  it('retains applied conditions through no-result and error states, then resets to the base operation', () => {
    const component = initialize();
    component.setSearchMode('SKILL');
    component.setSkillConditionValue(0, 'skillId', '1');
    component.setSkillConditionValue(0, 'seniorityId', '3');
    members.searchBySkill.and.returnValue(of(page([], 0, 0, 0)));
    component.applySearch();
    fixture.detectChanges();

    expect(component.appliedQuery).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Applied search:');
    expect(fixture.nativeElement.textContent).toContain('No Members match these conditions');

    const failedSearch = new Subject<MemberPage>();
    members.searchBySkill.and.returnValue(failedSearch);
    component.applySearch();
    failedSearch.error(new HttpErrorResponse({ status: 503, error: { message: 'Search unavailable' } }));
    fixture.detectChanges();
    expect(component.appliedQuery).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Applied search:');
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('Search unavailable');

    members.list.and.returnValue(of(page([active])));
    component.clearFilters();
    expect(component.appliedQuery).toBeNull();
    expect(component.searchModeDraft).toBe('BASE');
    expect(members.list).toHaveBeenCalledWith(0, 10, '', undefined);
  });

  it('opens the managed Member Profile route with known Member identity state', () => {
    const component = initialize();
    const action = fixture.nativeElement.querySelector('.row-actions button') as HTMLButtonElement;

    action.click();
    fixture.detectChanges();

    expect(component.currentPage).toBe(0);
    expect(router.navigate).toHaveBeenCalledWith(['/members', 1, 'profiles'], {
      state: { managedMember: { id: '1', username: 'alice', email: 'alice@example.com' } },
    });
  });
});
