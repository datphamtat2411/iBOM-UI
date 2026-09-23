import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';

import { NotificationService } from '../../../../core/notifications/notification.service';
import { Seniority } from '../../models/seniority.models';
import { SeniorityService } from '../../services/seniority.service';
import { SeniorityManagementComponent } from './seniority-management.component';

describe('SeniorityManagementComponent', () => {
  let fixture: ComponentFixture<SeniorityManagementComponent>;
  let seniorityService: {
    list: jasmine.Spy;
    create: jasmine.Spy;
    update: jasmine.Spy;
    delete: jasmine.Spy;
  };
  let notifications: { showSuccess: jasmine.Spy };

  const junior: Seniority = {
    id: 1,
    name: 'Junior',
    fromExperience: 0,
    toExperience: 3,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-02',
  };
  const senior: Seniority = {
    id: 2,
    name: 'Senior',
    fromExperience: 5,
    toExperience: null,
    createdAt: '2026-01-03',
    updatedAt: '2026-01-04',
  };

  beforeEach(async () => {
    seniorityService = {
      list: jasmine.createSpy('list').and.returnValue(of([senior, junior])),
      create: jasmine.createSpy('create'),
      update: jasmine.createSpy('update'),
      delete: jasmine.createSpy('delete'),
    };
    notifications = { showSuccess: jasmine.createSpy('showSuccess') };

    await TestBed.configureTestingModule({
      imports: [SeniorityManagementComponent],
      providers: [
        { provide: SeniorityService, useValue: seniorityService },
        { provide: NotificationService, useValue: notifications },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(SeniorityManagementComponent);
    fixture.detectChanges();
  });

  function openCreate(): void {
    fixture.componentInstance.startCreate();
    fixture.detectChanges();
  }

  function fillFinite(name = 'Mid', minimum = 3, maximum = 5): void {
    const component = fixture.componentInstance;
    component.seniorityForm.controls.name.setValue(name);
    component.seniorityForm.controls.fromExperience.setValue(minimum);
    component.setUnlimited(false);
    component.seniorityForm.controls.toExperience.setValue(maximum);
  }

  function response(overrides: Partial<Seniority> = {}): Seniority {
    return { ...junior, ...overrides };
  }

  it('loads ordered records and renders nullable maximums as Unlimited without search or pagination', () => {
    expect(fixture.componentInstance.seniorities.map((item) => item.name)).toEqual(['Junior', 'Senior']);
    expect(fixture.nativeElement.textContent).toContain('Unlimited');
    expect(fixture.nativeElement.textContent).toContain('Created Date');
    expect(fixture.nativeElement.querySelector('input[type="search"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('.pagination')).toBeNull();
  });

  it('shows the empty state and retries a failed list load', () => {
    seniorityService.list.and.returnValues(
      throwError(() => new HttpErrorResponse({ status: 503, error: { message: 'Unavailable' } })),
      of([]),
    );
    const retryFixture = TestBed.createComponent(SeniorityManagementComponent);
    retryFixture.detectChanges();
    expect(retryFixture.componentInstance.loadError).toBeTruthy();
    expect(retryFixture.nativeElement.textContent).toContain('Try again');

    retryFixture.componentInstance.retrySeniorities();
    retryFixture.detectChanges();
    expect(retryFixture.componentInstance.seniorities).toEqual([]);
    expect(retryFixture.nativeElement.textContent).toContain('No Seniority levels exist yet.');
    retryFixture.destroy();
  });

  it('trims names, serializes finite ranges, and accepts a touching existing boundary', () => {
    seniorityService.create.and.returnValue(of(response({ id: 3, name: 'Mid', fromExperience: 3, toExperience: 5 })));
    openCreate();
    fillFinite('  Mid  ', 3, 5);
    fixture.componentInstance.submit();

    expect(seniorityService.create).toHaveBeenCalledWith({ name: 'Mid', fromExperience: 3, toExperience: 5 });
    expect(fixture.componentInstance.editorMode).toBeNull();
    expect(notifications.showSuccess).toHaveBeenCalledWith('Seniority created successfully.');
  });

  it('serializes Unlimited as null and never sends a sentinel maximum', () => {
    seniorityService.create.and.returnValue(of(response({ id: 3, name: 'Lead', fromExperience: 10, toExperience: null })));
    openCreate();
    const component = fixture.componentInstance;
    component.seniorityForm.controls.name.setValue('Lead');
    component.seniorityForm.controls.fromExperience.setValue(10);
    component.submit();

    expect(seniorityService.create).toHaveBeenCalledWith({ name: 'Lead', fromExperience: 10, toExperience: null });
    expect(component.seniorityForm.controls.toExperience.disabled).toBeTrue();
  });

  it('requires a finite maximum and clears it when switching Unlimited back on', () => {
    openCreate();
    const component = fixture.componentInstance;
    component.seniorityForm.controls.name.setValue('Mid');
    component.seniorityForm.controls.fromExperience.setValue(3);
    component.setUnlimited(false);

    expect(component.seniorityForm.controls.toExperience.enabled).toBeTrue();
    expect(component.seniorityForm.controls.toExperience.hasError('required')).toBeTrue();
    component.submit();
    expect(seniorityService.create).not.toHaveBeenCalled();
    expect(component.editorMode).toBe('create');

    component.seniorityForm.controls.toExperience.setValue(5);
    component.setUnlimited(true);
    expect(component.seniorityForm.controls.toExperience.disabled).toBeTrue();
    expect(component.seniorityForm.controls.toExperience.value).toBeNull();
    component.setUnlimited(false);
    expect(component.seniorityForm.controls.toExperience.enabled).toBeTrue();
    expect(component.seniorityForm.controls.toExperience.value).toBeNull();
    expect(component.seniorityForm.controls.toExperience.hasError('required')).toBeTrue();
  });

  it('accepts the backend precision boundaries and rejects excess digits', () => {
    seniorityService.create.and.returnValue(of(response({ id: 3, name: 'Mid', fromExperience: 999, toExperience: 999.99 })));
    openCreate();
    fillFinite('Mid', 999, 999.99);
    fixture.componentInstance.submit();

    expect(seniorityService.create).toHaveBeenCalledWith({ name: 'Mid', fromExperience: 999, toExperience: 999.99 });

    openCreate();
    fillFinite('TooWide', 0, 1000);
    fixture.componentInstance.submit();
    expect(seniorityService.create).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.fieldError('toExperience')).toContain('3 integer digits');

    fixture.componentInstance.seniorityForm.controls.toExperience.setValue(1.234);
    fixture.componentInstance.submit();
    expect(seniorityService.create).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.fieldError('toExperience')).toContain('2 decimal places');
  });

  it('rejects a negative minimum and a maximum that is not greater than the minimum', () => {
    openCreate();
    const component = fixture.componentInstance;
    component.seniorityForm.controls.name.setValue('Invalid');
    component.seniorityForm.controls.fromExperience.setValue(-1);
    component.setUnlimited(false);
    component.seniorityForm.controls.toExperience.setValue(-1);
    component.submit();
    expect(seniorityService.create).not.toHaveBeenCalled();

    component.seniorityForm.controls.fromExperience.setValue(2);
    component.seniorityForm.controls.toExperience.setValue(2);
    component.submit();
    expect(seniorityService.create).not.toHaveBeenCalled();
    expect(component.fieldError('toExperience')).toContain('greater than');
  });

  it('keeps the editor and input after duplicate and range conflict failures', () => {
    seniorityService.create.and.returnValues(
      throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'SENIORITY_NAME_ALREADY_EXISTS', message: 'Name exists.' } })),
      throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'SENIORITY_RANGE_CONFLICT', message: 'Range overlaps.' } })),
    );
    openCreate();
    fillFinite('Mid', 3, 5);
    fixture.componentInstance.submit();
    expect(fixture.componentInstance.editorMode).toBe('create');
    expect(fixture.componentInstance.seniorityForm.controls.name.value).toBe('Mid');
    expect(fixture.componentInstance.editorErrorMessage).toBe('Name exists.');

    fixture.componentInstance.submit();
    expect(fixture.componentInstance.editorMode).toBe('create');
    expect(fixture.componentInstance.seniorityForm.getRawValue().toExperience).toBe(5);
    expect(fixture.componentInstance.editorErrorMessage).toBe('Range overlaps.');
  });

  it('maps structured validation errors to fields and keeps the editor retryable', () => {
    seniorityService.create.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 400,
      error: {
        errorCode: 'VALIDATION_ERROR',
        data: { errors: [{ field: 'fromExperience', message: 'Minimum is invalid.' }] },
      },
    })));
    openCreate();
    fillFinite('Mid', 3, 5);
    fixture.componentInstance.submit();

    expect(fixture.componentInstance.editorMode).toBe('create');
    expect(fixture.componentInstance.fieldError('fromExperience')).toBe('Minimum is invalid.');
    expect(fixture.componentInstance.isSubmitting).toBeFalse();
  });

  it('disables mutation controls while saving and updates edit records in range order', () => {
    const pending = new Subject<Seniority>();
    seniorityService.update.and.returnValue(pending);
    fixture.componentInstance.startEdit(senior);
    fixture.componentInstance.seniorityForm.controls.fromExperience.setValue(4);
    fixture.componentInstance.submit();
    fixture.componentInstance.submit();

    expect(seniorityService.update).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.isSubmitting).toBeTrue();
    pending.next(response({ id: 2, name: 'Senior', fromExperience: 4, toExperience: null }));
    pending.complete();
    expect(fixture.componentInstance.seniorities[1].fromExperience).toBe(4);
    expect(notifications.showSuccess).toHaveBeenCalledWith('Seniority updated successfully.');
  });

  it('requires delete confirmation and keeps it open when Seniority is in use', () => {
    seniorityService.delete.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 409,
      error: { errorCode: 'SENIORITY_IN_USE', message: 'Profiles use this level.' },
    })));
    fixture.componentInstance.openDeleteConfirmation(junior);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Delete Junior?');
    fixture.componentInstance.confirmDelete();

    expect(fixture.componentInstance.deleteConfirmation).toBeTrue();
    expect(fixture.componentInstance.deleteErrorMessage).toBe('Profiles use this level.');
    expect(notifications.showSuccess).not.toHaveBeenCalled();
  });

  it('refreshes after a stale record error and closes the affected dialog', () => {
    seniorityService.delete.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 404,
      error: { errorCode: 'SENIORITY_NOT_FOUND', message: 'Record was removed.' },
    })));
    seniorityService.list.and.returnValue(of([senior]));
    fixture.componentInstance.openDeleteConfirmation(junior);
    fixture.componentInstance.confirmDelete();

    expect(fixture.componentInstance.deleteConfirmation).toBeFalse();
    expect(fixture.componentInstance.pageMessage).toBe('Record was removed.');
    expect(seniorityService.list).toHaveBeenCalledTimes(2);
  });
});
