import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';

import { NotificationService } from '../../../../core/notifications/notification.service';
import { LanguageMaster, LanguageMasterPage } from '../../models/language-master.models';
import { LanguageMasterService } from '../../services/language-master.service';
import { LanguageMasterManagementComponent } from './language-master-management.component';

describe('LanguageMasterManagementComponent', () => {
  let fixture: ComponentFixture<LanguageMasterManagementComponent>;
  let languages: {
    list: jasmine.Spy;
    create: jasmine.Spy;
    update: jasmine.Spy;
    delete: jasmine.Spy;
  };
  let notifications: { showSuccess: jasmine.Spy };

  const english: LanguageMaster = { id: 1, name: 'English', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z' };
  const japanese: LanguageMaster = { id: 2, name: 'Japanese', createdAt: '2026-01-03T00:00:00Z', updatedAt: '2026-01-04T00:00:00Z' };

  function page(content: LanguageMaster[] = [english], currentPage = 0, totalPages = 1, totalElements = content.length): LanguageMasterPage {
    return { content, page: currentPage, size: 10, totalElements, totalPages };
  }

  beforeEach(async () => {
    languages = {
      list: jasmine.createSpy('list').and.returnValue(of(page())),
      create: jasmine.createSpy('create'),
      update: jasmine.createSpy('update'),
      delete: jasmine.createSpy('delete'),
    };
    notifications = { showSuccess: jasmine.createSpy('showSuccess') };

    await TestBed.configureTestingModule({
      imports: [LanguageMasterManagementComponent],
      providers: [
        { provide: LanguageMasterService, useValue: languages },
        { provide: NotificationService, useValue: notifications },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LanguageMasterManagementComponent);
  });

  function initialize(): LanguageMasterManagementComponent {
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('loads the first page with the default server page size of 10', () => {
    const component = initialize();

    expect(languages.list).toHaveBeenCalledWith(0, 10, '');
    expect(component.pageSize).toBe(10);
    expect(component.languages).toEqual([english]);
  });

  it('renders backend-provided ordering without client-side reordering and shows all table columns', () => {
    languages.list.and.returnValue(of(page([japanese, english])));
    initialize();

    const headers = [...fixture.nativeElement.querySelectorAll('th')].map((header: HTMLElement) => (header.textContent ?? '').trim());
    const names = [...fixture.nativeElement.querySelectorAll('tbody td:first-child')].map((cell: HTMLElement) => (cell.textContent ?? '').trim());

    expect(headers).toEqual(['Language Name', 'Created Date', 'Updated Date', 'Actions']);
    expect(names).toEqual(['Japanese', 'English']);
  });

  it('keeps paging and search server-driven, including resetting an empty search to page zero', () => {
    languages.list.and.returnValue(of(page([english, japanese], 0, 2, 11)));
    const component = initialize();
    languages.list.calls.reset();

    component.nextPage();
    expect(languages.list).toHaveBeenCalledWith(1, 10, '');

    languages.list.calls.reset();
    component.searchDraft = '  jap  ';
    component.searchLanguages();
    expect(languages.list).toHaveBeenCalledWith(0, 10, 'jap');

    languages.list.calls.reset();
    component.setSearchDraft('');
    expect(languages.list).toHaveBeenCalledWith(0, 10, '');
    expect(component.searchDraft).toBe('');
    expect(component.searchTerm).toBe('');
    expect(component.currentPage).toBe(0);
  });

  it('recovers the previous page only when deleting its only non-first-page row', () => {
    const component = initialize();
    languages.delete.and.returnValue(of(undefined));

    component.currentPage = 1;
    component.searchTerm = 'jap';
    component.languages = [japanese];
    languages.list.calls.reset();
    component.openDeleteConfirmation(japanese);
    component.confirmDelete();
    expect(languages.list).toHaveBeenCalledWith(0, 10, 'jap');

    component.currentPage = 1;
    component.languages = [english, japanese];
    languages.list.calls.reset();
    component.openDeleteConfirmation(japanese);
    component.confirmDelete();
    expect(languages.list).toHaveBeenCalledWith(1, 10, 'jap');

    component.currentPage = 0;
    component.languages = [japanese];
    languages.list.calls.reset();
    component.openDeleteConfirmation(japanese);
    component.confirmDelete();
    expect(languages.list).toHaveBeenCalledWith(0, 10, 'jap');
  });

  it('shows loading, empty, no-result, failure, and retry states', () => {
    const request = new Subject<LanguageMasterPage>();
    languages.list.and.returnValue(request);
    const component = initialize();

    expect(component.loading).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Loading Languages...');

    request.next(page([]));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No Languages yet');

    component.searchDraft = 'missing';
    component.searchLanguages();
    const failure = new Subject<LanguageMasterPage>();
    languages.list.and.returnValue(failure);
    component.loadLanguages(0);
    failure.error(new HttpErrorResponse({ status: 503, error: { errorCode: 'REQUEST_FAILED', message: 'unrelated backend wording' } }));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Unable to load Languages right now.');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();

    languages.list.and.returnValue(of(page([])));
    component.searchDraft = 'changed draft';
    component.retryLanguages();
    fixture.detectChanges();
    expect(languages.list).toHaveBeenCalledWith(0, 10, 'missing');
  });

  it('clears prior rows and result metadata when a new query fails', () => {
    languages.list.and.returnValue(of(page([english])));
    const component = initialize();
    expect(component.languages).toEqual([english]);

    const failedRequest = new Subject<LanguageMasterPage>();
    languages.list.and.returnValue(failedRequest);
    component.searchDraft = 'missing';
    component.searchLanguages();
    fixture.detectChanges();
    expect(component.loading).toBeTrue();
    expect(component.languages).toEqual([]);
    expect(fixture.nativeElement.textContent).not.toContain('English');

    failedRequest.error(new HttpErrorResponse({ status: 503, error: { errorCode: 'REQUEST_FAILED', message: 'query failed' } }));
    fixture.detectChanges();
    expect(component.languages).toEqual([]);
    expect(component.totalElements).toBe(0);
    expect(component.totalPages).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Unable to load Languages right now.');
    expect(fixture.nativeElement.textContent).not.toContain('English');
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
  });

  it('retries the failed submitted page and search instead of the draft, and clear resets both', () => {
    const component = initialize();
    const failedRequest = new Subject<LanguageMasterPage>();
    languages.list.and.returnValue(failedRequest);
    component.searchTerm = 'jap';
    component.searchDraft = 'draft';
    component.loadLanguages(2);
    failedRequest.error(new HttpErrorResponse({ status: 503, error: { errorCode: 'REQUEST_FAILED' } }));

    languages.list.and.returnValue(of(page([])));
    component.searchDraft = 'different draft';
    component.retryLanguages();
    expect(languages.list).toHaveBeenCalledWith(2, 10, 'jap');

    languages.list.calls.reset();
    component.currentPage = 1;
    component.searchTerm = 'jap';
    component.searchDraft = ' jap ';
    component.clearSearch();
    expect(component.searchDraft).toBe('');
    expect(component.searchTerm).toBe('');
    expect(component.currentPage).toBe(0);
    expect(languages.list).toHaveBeenCalledWith(0, 10, '');
  });

  it('uses the exact blank-name validation message without submitting', () => {
    const component = initialize();
    component.startCreate();
    component.editorForm.controls.name.setValue('   ');
    component.submitEditor();
    fixture.detectChanges();

    expect(languages.create).not.toHaveBeenCalled();
    expect(component.editorNameError()).toBe('Please enter Language Name.');
    expect(fixture.nativeElement.textContent).toContain('Please enter Language Name.');
  });

  it('trims create and edit payloads and refreshes after successful mutations', () => {
    const component = initialize();
    languages.create.and.returnValue(of({ ...japanese, name: 'Japanese' }));
    component.startCreate();
    component.editorForm.controls.name.setValue('  Japanese  ');
    component.submitEditor();
    expect(languages.create).toHaveBeenCalledWith({ name: 'Japanese' });
    expect(notifications.showSuccess).toHaveBeenCalledWith('Language created successfully.');
    expect(languages.list).toHaveBeenCalledTimes(2);

    languages.update.and.returnValue(of({ ...english, name: 'English (UK)' }));
    component.startEdit(english);
    component.editorForm.controls.name.setValue('  English (UK)  ');
    component.submitEditor();
    expect(languages.update).toHaveBeenCalledWith(english.id, { name: 'English (UK)' });
    expect(notifications.showSuccess).toHaveBeenCalledWith('Language updated successfully.');
  });

  it('keeps the editor open and preserves input after duplicate and validation failures', () => {
    const component = initialize();
    component.startCreate();
    component.editorForm.controls.name.setValue('  English  ');
    languages.create.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 409,
      error: { errorCode: 'LANGUAGE_ALREADY_EXISTS', message: 'backend wording may change' },
    })));
    component.submitEditor();

    expect(component.editorOpen).toBeTrue();
    expect(component.editorForm.controls.name.value).toBe('  English  ');
    expect(component.editorNameError()).toBe('backend wording may change');

    languages.create.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 400,
      error: { errorCode: 'VALIDATION_ERROR', message: 'Validation failed', data: { errors: [{ field: 'name', message: 'Name detail' }] } },
    })));
    component.submitEditor();
    expect(component.editorOpen).toBeTrue();
    expect(component.editorForm.controls.name.value).toBe('  English  ');
    expect(component.editorNameError()).toBe('Name detail');
  });

  it('handles stable duplicate and validation codes independently of their messages', () => {
    const component = initialize();
    component.startCreate();
    component.editorForm.controls.name.setValue('French');
    languages.create.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 500,
      error: { errorCode: 'LANGUAGE_ALREADY_EXISTS', message: 'not a conflict message' },
    })));
    component.submitEditor();
    expect(component.editorOpen).toBeTrue();
    expect(component.editorNameError()).toBe('not a conflict message');

    languages.create.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 500,
      error: { errorCode: 'VALIDATION_ERROR', message: 'not a validation message', data: { errors: [{ field: 'name', message: 'invalid name' }] } },
    })));
    component.submitEditor();
    expect(component.editorOpen).toBeTrue();
    expect(component.editorNameError()).toBe('invalid name');
  });

  it('keeps the row and confirmation open while a referenced Language delete fails', () => {
    const component = initialize();
    const pending = new Subject<void>();
    languages.delete.and.returnValue(pending);
    component.openDeleteConfirmation(english);
    component.confirmDelete();

    expect(component.pendingMutation).toBe('delete');
    expect(component.languages).toContain(english);
    expect(component.deleteConfirmationOpen).toBeTrue();

    pending.error(new HttpErrorResponse({
      status: 500,
      error: { errorCode: 'LANGUAGE_IN_USE', message: 'different backend wording' },
    }));
    fixture.detectChanges();
    expect(component.pendingMutation).toBeNull();
    expect(component.deleteConfirmationOpen).toBeTrue();
    expect(component.deleteTarget).toBe(english);
    expect(component.languages).toContain(english);
    expect(component.deleteErrorMessage).toContain('referenced by Profile data');
  });

  it('requires confirmation, disables controls while pending, and refreshes after delete success', () => {
    const component = initialize();
    const pending = new Subject<void>();
    languages.delete.and.returnValue(pending);
    component.openDeleteConfirmation(english);
    fixture.detectChanges();
    expect(languages.delete).not.toHaveBeenCalled();

    component.confirmDelete();
    fixture.detectChanges();
    expect(languages.delete).toHaveBeenCalledWith(english.id);
    expect(fixture.nativeElement.querySelector('#delete-language-title')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.dialog-actions .danger').disabled).toBeTrue();

    pending.next();
    fixture.detectChanges();
    expect(component.deleteConfirmationOpen).toBeFalse();
    expect(notifications.showSuccess).toHaveBeenCalledWith('Language deleted successfully.');
    expect(languages.list).toHaveBeenCalledTimes(2);
  });
});
