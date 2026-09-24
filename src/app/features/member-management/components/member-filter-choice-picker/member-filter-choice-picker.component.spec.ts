import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { MasterDataService } from '../../../master-data/services/master-data.service';
import { SearchChoice, SearchChoicePage } from '../../models/member-management.models';
import { MemberManagementService } from '../../services/member-management.service';
import { MemberFilterChoicePickerComponent } from './member-filter-choice-picker.component';

describe('MemberFilterChoicePickerComponent', () => {
  let fixture: ComponentFixture<MemberFilterChoicePickerComponent>;
  let component: MemberFilterChoicePickerComponent;
  let members: { listSkills: jasmine.Spy; listLanguages: jasmine.Spy };
  let masterData: { listSkillCategories: jasmine.Spy };

  function choicePage(content: SearchChoice[], page = 0, totalPages = 1): SearchChoicePage {
    return { content, page, size: 10, totalElements: content.length, totalPages };
  }

  beforeEach(async () => {
    members = {
      listSkills: jasmine.createSpy('listSkills').and.returnValue(of(choicePage([{ id: 1, name: 'Java', categoryId: 7, categoryName: 'Backend' }]))),
      listLanguages: jasmine.createSpy('listLanguages').and.returnValue(of(choicePage([{ id: 'en', name: 'English' }]))),
    };
    masterData = {
      listSkillCategories: jasmine.createSpy('listSkillCategories').and.returnValue(of([{ id: 7, code: 'BACKEND', name: 'Backend' }])),
    };
    await TestBed.configureTestingModule({
      imports: [MemberFilterChoicePickerComponent],
      providers: [
        { provide: MemberManagementService, useValue: members },
        { provide: MasterDataService, useValue: masterData },
      ],
    }).compileComponents();
  });

  function initialize(kind: 'SKILL' | 'LANGUAGE' = 'SKILL'): void {
    fixture = TestBed.createComponent(MemberFilterChoicePickerComponent);
    component = fixture.componentInstance;
    component.kind = kind;
    fixture.detectChanges();
  }

  it('selects immediately, exposes duplicate state, and keeps the selection through search, Category, and page changes', () => {
    initialize();
    const selected: SearchChoice[] = [];
    component.choiceSelected.subscribe((choice) => selected.push(choice));
    component.selectChoice({ id: 1, name: 'Java', categoryId: 7, categoryName: 'Backend' });
    component.selectChoice({ id: 1, name: 'Java', categoryId: 7, categoryName: 'Backend' });

    members.listSkills.and.returnValues(
      of(choicePage([{ id: 2, name: 'JavaScript', categoryId: 7, categoryName: 'Backend' }], 0, 2)),
      of(choicePage([{ id: 3, name: 'Python', categoryId: 8, categoryName: 'Data' }], 1, 2)),
      of(choicePage([{ id: 4, name: 'Go', categoryId: 7, categoryName: 'Backend' }], 0, 1)),
    );
    component.setSearchDraft('java');
    component.setCategoryFilter('7');
    component.goToPage(1);

    expect(selected).toEqual([{ id: 1, name: 'Java', categoryId: 7, categoryName: 'Backend' }]);
    expect(component.isSelected({ id: 1, name: 'Java' })).toBeTrue();
    expect(component.selectedIds).toEqual([1]);
  });

  it('retains selected IDs when a Skill picker request is empty or fails', () => {
    initialize();
    component.selectChoice({ id: 1, name: 'Java' });
    members.listSkills.and.returnValue(of(choicePage([])));
    component.setSearchDraft('missing');
    expect(component.isSelected({ id: 1, name: 'Java' })).toBeTrue();

    members.listSkills.and.returnValue(throwError(() => new Error('unavailable')));
    component.setCategoryFilter('7');
    expect(component.errorMessage).toBe('Unable to load Skills right now.');
    expect(component.isSelected({ id: 1, name: 'Java' })).toBeTrue();
  });

  it('uses the same searchable list interaction for Languages without Category discovery', () => {
    initialize('LANGUAGE');

    expect(masterData.listSkillCategories).not.toHaveBeenCalled();
    expect(members.listLanguages).toHaveBeenCalledWith(0, 10, '');
    expect(fixture.nativeElement.textContent).not.toContain('Category');

    component.setSearchDraft('eng');
    expect(members.listLanguages).toHaveBeenCalledWith(0, 10, 'eng');
  });
});
