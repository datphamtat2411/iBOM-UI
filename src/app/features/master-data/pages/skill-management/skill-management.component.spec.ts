import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';

import { NotificationService } from '../../../../core/notifications/notification.service';
import { Skill, SkillCategory } from '../../models/master-data.models';
import { MasterDataService } from '../../services/master-data.service';
import { SkillManagementComponent } from './skill-management.component';

describe('SkillManagementComponent', () => {
  let fixture: ComponentFixture<SkillManagementComponent>;
  let service: {
    listSkills: jasmine.Spy;
    listSkillCategories: jasmine.Spy;
    createSkill: jasmine.Spy;
    updateSkill: jasmine.Spy;
    deleteSkill: jasmine.Spy;
  };
  let notifications: { showSuccess: jasmine.Spy };

  const categories: SkillCategory[] = [
    { id: 1, code: 'BACKEND', name: 'Backend' },
    { id: 2, code: 'FRONTEND', name: 'Frontend' },
  ];
  const java: Skill = { id: 4, name: 'Java', categoryId: 1, categoryCode: 'BACKEND', categoryName: 'Backend', createdAt: '2026-01-01T08:00:00Z', updatedAt: '2026-01-02T08:00:00Z' };
  const angular: Skill = { id: 5, name: 'Angular', categoryId: 2, categoryCode: 'FRONTEND', categoryName: 'Frontend', createdAt: '2026-01-03T08:00:00Z', updatedAt: '2026-01-04T08:00:00Z' };

  beforeEach(async () => {
    service = {
      listSkills: jasmine.createSpy('listSkills').and.returnValue(pageOf([java, angular], 0, 1)),
      listSkillCategories: jasmine.createSpy('listSkillCategories').and.returnValue(of(categories)),
      createSkill: jasmine.createSpy('createSkill'),
      updateSkill: jasmine.createSpy('updateSkill'),
      deleteSkill: jasmine.createSpy('deleteSkill'),
    };
    notifications = { showSuccess: jasmine.createSpy('showSuccess') };

    await TestBed.configureTestingModule({
      imports: [SkillManagementComponent],
      providers: [
        { provide: MasterDataService, useValue: service },
        { provide: NotificationService, useValue: notifications },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SkillManagementComponent);
    fixture.detectChanges();
  });

  it('loads the default page and controlled Categories with size 10', () => {
    expect(service.listSkills).toHaveBeenCalledWith(0, 10, '');
    expect(service.listSkillCategories).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.categories).toEqual(categories);
    expect(fixture.nativeElement.querySelector('th').textContent).toContain('Skill Name');
  });

  it('trims server-driven search terms and resets to page zero, including empty search', () => {
    fixture.componentInstance.searchDraft = '  java  ';
    fixture.componentInstance.applySearch();
    expect(service.listSkills).toHaveBeenCalledWith(0, 10, 'java');

    fixture.componentInstance.clearSearch();
    expect(service.listSkills).toHaveBeenCalledWith(0, 10, '');
  });

  it('distinguishes initial empty and no-result search states and retries list failures', () => {
    const pending = new Subject<ReturnType<typeof pageOf>>();
    service.listSkills.and.returnValue(pending);
    const pendingFixture = TestBed.createComponent(SkillManagementComponent);
    pendingFixture.detectChanges();
    expect(pendingFixture.componentInstance.isLoading).toBeTrue();

    pending.error(new HttpErrorResponse({ status: 503, error: { message: 'Unavailable' } }));
    pendingFixture.detectChanges();
    expect(pendingFixture.componentInstance.listError).toBeTruthy();

    service.listSkills.and.returnValue(pageOf([], 0, 0));
    pendingFixture.componentInstance.retrySkills();
    pendingFixture.detectChanges();
    expect(pendingFixture.nativeElement.textContent).toContain('No Skills configured');

    pendingFixture.componentInstance.searchDraft = 'missing';
    pendingFixture.componentInstance.applySearch();
    pendingFixture.detectChanges();
    expect(pendingFixture.nativeElement.textContent).toContain('No Skills found');
    expect(pendingFixture.nativeElement.textContent).toContain('Clear search');
    pendingFixture.destroy();
  });

  it('uses server pagination and disables boundary controls', () => {
    service.listSkills.and.returnValues(pageOf([java], 0, 2), pageOf([angular], 1, 2));
    const pagedFixture = TestBed.createComponent(SkillManagementComponent);
    pagedFixture.detectChanges();
    expect(pagedFixture.componentInstance.canGoPrevious()).toBeFalse();
    expect(pagedFixture.componentInstance.canGoNext()).toBeTrue();

    pagedFixture.componentInstance.nextPage();
    expect(service.listSkills).toHaveBeenCalledWith(1, 10, '');
    expect(pagedFixture.componentInstance.canGoPrevious()).toBeTrue();
    expect(pagedFixture.componentInstance.canGoNext()).toBeFalse();
    pagedFixture.destroy();
  });

  it('recovers the previous page only when deleting its only non-first-page row', () => {
    const component = fixture.componentInstance;
    service.deleteSkill.and.returnValue(of(undefined));

    component.page = 1;
    component.search = 'java';
    component.skills = [java];
    service.listSkills.calls.reset();
    component.openDeleteConfirmation(java);
    component.confirmDelete();
    expect(service.listSkills).toHaveBeenCalledWith(0, 10, 'java');

    component.page = 1;
    component.skills = [java, angular];
    service.listSkills.calls.reset();
    component.openDeleteConfirmation(java);
    component.confirmDelete();
    expect(service.listSkills).toHaveBeenCalledWith(1, 10, 'java');

    component.page = 0;
    component.skills = [java];
    service.listSkills.calls.reset();
    component.openDeleteConfirmation(java);
    component.confirmDelete();
    expect(service.listSkills).toHaveBeenCalledWith(0, 10, 'java');
  });

  it('requires a Skill Name and controlled Category', () => {
    fixture.componentInstance.openCreate();
    fixture.detectChanges();
    fixture.componentInstance.submitSkill();

    expect(service.createSkill).not.toHaveBeenCalled();
    expect(fixture.componentInstance.skillForm.controls.name.errors?.['required']).toBeTrue();
    expect(fixture.componentInstance.skillForm.controls.categoryId.errors?.['required']).toBeTrue();
    expect(fixture.nativeElement.querySelector('#skill-category')?.tagName).toBe('SELECT');
  });

  it('enforces the backend Skill Name limit of 255 characters', () => {
    const component = fixture.componentInstance;
    component.openCreate();
    fixture.detectChanges();

    const name = component.skillForm.controls.name;
    name.setValue('a'.repeat(255));
    expect(name.valid).toBeTrue();
    expect(fixture.nativeElement.querySelector('#skill-name').getAttribute('maxlength')).toBe('255');

    name.setValue('a'.repeat(256));
    expect(name.errors?.['maxlength']).toEqual({ requiredLength: 255, actualLength: 256 });
    expect(component.fieldError('name')).toBe('Skill Name must be 255 characters or fewer.');
  });

  it('trims Skill Name in the exact create payload, refreshes the current list, and notifies on success', () => {
    service.createSkill.and.returnValue(of(java));
    fixture.componentInstance.openCreate();
    fixture.componentInstance.skillForm.setValue({ name: '  Kotlin  ', categoryId: 1 });
    fixture.componentInstance.submitSkill();

    expect(service.createSkill).toHaveBeenCalledWith({ name: 'Kotlin', categoryId: 1 });
    expect(service.listSkills).toHaveBeenCalledWith(0, 10, '');
    expect(notifications.showSuccess).toHaveBeenCalledWith('Skill created successfully.');
    expect(fixture.componentInstance.editorMode).toBeNull();
  });

  it('keeps editor input open after duplicate and validation failures', () => {
    service.createSkill.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'SKILL_NAME_ALREADY_EXISTS', message: 'ignored backend wording' } })));
    fixture.componentInstance.openCreate();
    fixture.componentInstance.skillForm.setValue({ name: '  Java  ', categoryId: 1 });
    fixture.componentInstance.submitSkill();

    expect(fixture.componentInstance.editorMode).toBe('create');
    expect(fixture.componentInstance.skillForm.controls.name.value).toBe('  Java  ');
    expect(fixture.componentInstance.skillForm.controls.name.errors?.['duplicate']).toBeTruthy();

    service.createSkill.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { errorCode: 'VALIDATION_ERROR', data: { errors: [{ field: 'categoryId', message: 'Category is invalid.' }] } } })));
    fixture.componentInstance.skillForm.controls.categoryId.setValue(2);
    fixture.componentInstance.submitSkill();
    expect(fixture.componentInstance.editorMode).toBe('create');
    expect(fixture.componentInstance.skillForm.controls.name.value).toBe('  Java  ');
    expect(fixture.componentInstance.skillForm.controls.categoryId.errors?.['server']).toBe('Category is invalid.');
  });

  it('maps a missing Category to the field and refreshes controlled lookup data', () => {
    service.createSkill.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404, error: { errorCode: 'SKILL_CATEGORY_NOT_FOUND' } })));
    fixture.componentInstance.openCreate();
    fixture.componentInstance.skillForm.setValue({ name: 'Kotlin', categoryId: 1 });
    fixture.componentInstance.submitSkill();

    expect(fixture.componentInstance.editorMode).toBe('create');
    expect(fixture.componentInstance.skillForm.controls.categoryId.errors?.['server']).toBeTruthy();
    expect(service.listSkillCategories).toHaveBeenCalledTimes(2);
  });

  it('requires delete confirmation and keeps the target row after referenced-delete failure', () => {
    service.deleteSkill.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'SKILL_REFERENCED_BY_PROFILES', message: 'ignored backend wording' } })));
    fixture.componentInstance.openDeleteConfirmation(java);
    expect(service.deleteSkill).not.toHaveBeenCalled();
    fixture.componentInstance.confirmDelete();

    expect(service.deleteSkill).toHaveBeenCalledWith(4);
    expect(fixture.componentInstance.deleteConfirmation).toBeTrue();
    expect(fixture.componentInstance.deleteErrorMessage).toContain('still in use');
    expect(fixture.componentInstance.skills).toContain(java);
  });

  it('refreshes the list and reports stable not-found delete failures', () => {
    service.deleteSkill.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404, error: { errorCode: 'SKILL_NOT_FOUND' } })));
    fixture.componentInstance.openDeleteConfirmation(java);
    fixture.componentInstance.confirmDelete();

    expect(fixture.componentInstance.deleteErrorMessage).toContain('no longer exists');
    expect(service.listSkills).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.skills).toEqual([java, angular]);
  });
});

function pageOf(content: Skill[], page: number, totalPages: number, totalElements = content.length) {
  return of({ content, page, size: 10, totalElements, totalPages });
}
