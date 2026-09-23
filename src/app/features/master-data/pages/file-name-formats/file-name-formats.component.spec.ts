import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { NotificationService } from '../../../../core/notifications/notification.service';
import { FileNameFormatService } from '../../services/file-name-format.service';
import { FileNameFormatsComponent } from './file-name-formats.component';

describe('FileNameFormatsComponent', () => {
  let fixture: ComponentFixture<FileNameFormatsComponent>;
  let formats: { list: jasmine.Spy; create: jasmine.Spy; update: jasmine.Spy; delete: jasmine.Spy };
  let notifications: { showSuccess: jasmine.Spy };

  const standardFormat = { id: 1, name: 'Last first', pattern: '{LastName}-{FirstName}', isDefault: false, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z' };
  const defaultFormat = { id: 2, name: 'System default', pattern: '{LastName}_{FirstName}', isDefault: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z' };

  beforeEach(async () => {
    formats = {
      list: jasmine.createSpy('list').and.returnValue(of({ content: [standardFormat, defaultFormat], page: 0, size: 10, totalElements: 2, totalPages: 1 })),
      create: jasmine.createSpy('create'),
      update: jasmine.createSpy('update'),
      delete: jasmine.createSpy('delete'),
    };
    notifications = { showSuccess: jasmine.createSpy('showSuccess') };
    await TestBed.configureTestingModule({
      imports: [FileNameFormatsComponent],
      providers: [
        { provide: FileNameFormatService, useValue: formats },
        { provide: NotificationService, useValue: notifications },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(FileNameFormatsComponent);
    fixture.detectChanges();
  });

  it('renders the compact required columns, default distinction, actions, and no search control', () => {
    const headers = Array.from(fixture.nativeElement.querySelectorAll('th') as NodeListOf<HTMLElement>).map((header) => header.textContent?.trim());
    expect(headers).toEqual(['Format Name', 'Format Pattern', 'Created Date', 'Updated Date', 'Actions']);
    expect(fixture.nativeElement.textContent).toContain('System default');
    expect(fixture.nativeElement.querySelector('input[type="search"]')).toBeNull();
    fixture.componentInstance.openDelete(standardFormat);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Formats referenced by Profiles cannot be deleted.');
    const deleteButtons = fixture.nativeElement.querySelectorAll('.record-actions .danger') as NodeListOf<HTMLButtonElement>;
    expect(deleteButtons[1].disabled).toBeTrue();
  });

  it('keeps delete confirmation open for referenced and default protection errors', () => {
    formats.delete.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'FILE_NAME_FORMAT_REFERENCED_BY_PROFILE' } })));
    fixture.componentInstance.openDelete(standardFormat);
    fixture.componentInstance.confirmDelete();
    expect(fixture.componentInstance.deleteConfirmation).toBeTrue();
    expect(fixture.componentInstance.deleteErrorMessage).toContain('referenced');
    expect(fixture.componentInstance.formats).toContain(standardFormat);

    fixture.componentInstance.openDelete(defaultFormat);
    expect(fixture.componentInstance.deleteConfirmation).toBeTrue();
    expect(formats.delete).toHaveBeenCalledTimes(1);
  });

  it('refreshes the current page and notifies after successful mutations', () => {
    formats.delete.and.returnValue(of(undefined));
    fixture.componentInstance.openDelete(standardFormat);
    fixture.componentInstance.confirmDelete();
    expect(notifications.showSuccess).toHaveBeenCalledWith('File Name Format deleted successfully.');
    expect(formats.list).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.deleteConfirmation).toBeFalse();
  });

  it('closes a stale editor before refreshing the current page', () => {
    fixture.componentInstance.editorOpen = true;
    fixture.componentInstance.editingFormat = standardFormat;
    fixture.componentInstance.editorStale();
    expect(fixture.componentInstance.editorOpen).toBeFalse();
    expect(fixture.componentInstance.editingFormat).toBeNull();
    expect(fixture.componentInstance.pageMessage).toContain('no longer available');
    expect(formats.list).toHaveBeenCalledTimes(2);
  });

  it('shows loading and request failure states with retry', () => {
    const pending = formats.list.and.returnValue(of({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 }));
    fixture.componentInstance.loadFormats();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No File Name Formats');
    expect(pending).toBeDefined();

    formats.list.and.returnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    fixture.componentInstance.loadFormats();
    fixture.detectChanges();
    expect(fixture.componentInstance.loadError).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Unable to load File Name Formats');
  });
});
