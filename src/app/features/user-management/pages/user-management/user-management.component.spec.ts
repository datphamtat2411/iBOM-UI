import { HttpErrorResponse } from '@angular/common/http';
import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';

import { AuthenticatedUser } from '../../../../core/auth/auth.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { UserPage, UserSummary } from '../../models/user-management.models';
import { UserManagementService } from '../../services/user-management.service';
import { UserManagementComponent } from './user-management.component';

describe('UserManagementComponent', () => {
  let fixture: ComponentFixture<UserManagementComponent>;
  let component: UserManagementComponent;
  let users: { list: jasmine.Spy; create: jasmine.Spy; updateStatus: jasmine.Spy };
  let auth: { user: WritableSignal<AuthenticatedUser | null> };
  let notifications: { showSuccess: jasmine.Spy; showError: jasmine.Spy };

  const active: UserSummary = {
    id: 1,
    username: 'alice',
    email: 'alice@example.com',
    role: 'MEMBER',
    status: 'ACTIVE',
  };
  const inactive: UserSummary = {
    id: 2,
    username: 'zara',
    email: 'zara@example.com',
    role: 'ADMIN',
    status: 'INACTIVE',
  };

  function page(content: UserSummary[] = [active, inactive], currentPage = 0, totalPages = 1, totalElements = content.length): UserPage {
    return { content, page: currentPage, size: 10, totalElements, totalPages };
  }

  beforeEach(async () => {
    users = {
      list: jasmine.createSpy('list').and.returnValue(of(page())),
      create: jasmine.createSpy('create'),
      updateStatus: jasmine.createSpy('updateStatus').and.returnValue(of(active)),
    };
    auth = { user: signal<AuthenticatedUser | null>(null) };
    notifications = { showSuccess: jasmine.createSpy('showSuccess'), showError: jasmine.createSpy('showError') };
    await TestBed.configureTestingModule({
      imports: [UserManagementComponent],
      providers: [
        { provide: UserManagementService, useValue: users },
        { provide: AuthService, useValue: auth },
        { provide: NotificationService, useValue: notifications },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserManagementComponent);
    fixture.detectChanges();
    component = fixture.componentInstance;
  });

  it('renders status-appropriate Activate and Deactivate actions', () => {
    const headers = [...fixture.nativeElement.querySelectorAll('th')].map((header: HTMLElement) => header.textContent?.trim());

    expect(headers).toEqual(['Username', 'Email', 'Role', 'Account Status', 'Actions']);
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(2);
    expect([...fixture.nativeElement.querySelectorAll('.status-action')].map((button: HTMLElement) => button.textContent?.trim())).toEqual(['Deactivate', 'Activate']);
    expect(fixture.nativeElement.textContent).not.toContain('Full Name');
    expect(fixture.nativeElement.textContent).not.toContain('Job Title');
    expect(fixture.nativeElement.textContent).toContain('Create User');
  });

  it('opens the create dialog with only the supported roles and MEMBER selected', () => {
    component.openCreateDialog();
    fixture.detectChanges();

    const options = [...fixture.nativeElement.querySelectorAll('#create-user-role option')].map((option: HTMLOptionElement) => option.value);
    expect(options).toEqual(['MEMBER', 'MANAGER', 'ADMIN']);
    expect(component.createForm.controls.role.value).toBe('MEMBER');
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeTruthy();
  });

  it('validates required, email, username, password, and confirmation fields', () => {
    component.openCreateDialog();
    component.createUser();

    expect(component.createForm.controls.email.errors?.['required']).toBeTrue();
    expect(component.createForm.controls.username.errors?.['required']).toBeTrue();
    expect(component.createForm.controls.password.errors?.['required']).toBeTrue();
    expect(component.createForm.controls.confirmPassword.errors?.['required']).toBeTrue();
    expect(component.createForm.controls.role.valid).toBeTrue();

    component.createForm.controls.email.setValue('invalid-email');
    component.createForm.controls.username.setValue('a'.repeat(101));
    component.createForm.controls.password.setValue('weak');
    component.createForm.controls.confirmPassword.setValue('different');

    expect(component.createForm.controls.email.errors?.['email']).toBeTrue();
    expect(component.createForm.controls.username.errors?.['maxlength']).toBeTruthy();
    expect(component.createForm.controls.password.errors?.['strongPassword']).toBeTrue();
    expect(component.createForm.controls.confirmPassword.errors?.['passwordMismatch']).toBeTrue();
  });

  it('revalidates confirmation when the password changes', () => {
    component.openCreateDialog();
    component.createForm.controls.password.setValue('Strong!Password1');
    component.createForm.controls.confirmPassword.setValue('Strong!Password1');
    expect(component.createForm.controls.confirmPassword.valid).toBeTrue();

    component.createForm.controls.password.setValue('Other!Password2');
    expect(component.createForm.controls.confirmPassword.errors?.['passwordMismatch']).toBeTrue();
  });

  it('requires confirmation and leaves cancellation without a mutation', () => {
    const activeAction = fixture.nativeElement.querySelector('.status-action') as HTMLButtonElement;
    activeAction.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"] h2')?.textContent).toContain('Deactivate alice?');
    (fixture.nativeElement.querySelector('[role="dialog"] .btn:not(.primary)') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(users.updateStatus).not.toHaveBeenCalled();
  });

  it('explains self-protection and defensively preserves a rejected self-deactivation for retry', () => {
    auth.user.set({ id: 1, email: active.email, username: active.username, role: active.role });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Self-deactivation unavailable');
    expect(fixture.nativeElement.querySelectorAll('.status-action').length).toBe(1);

    auth.user.set(null);
    users.updateStatus.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 409,
      error: { errorCode: 'USER_SELF_DEACTIVATION_NOT_ALLOWED' },
    })));
    component.requestStatusChange(active);
    component.confirmStatusChange();
    fixture.detectChanges();

    expect(component.users[0].status).toBe('ACTIVE');
    expect(fixture.nativeElement.querySelector('[role="dialog"] [role="alert"]')?.textContent).toContain('cannot deactivate your own account');
    expect(notifications.showError).toHaveBeenCalledWith('You cannot deactivate your own account.');
  });

  it('prevents duplicate requests, keeps status unchanged while pending, and preserves retryable failure state', () => {
    const pending = new Subject<UserSummary>();
    users.updateStatus.and.returnValue(pending);
    component.requestStatusChange(active);
    component.confirmStatusChange();
    component.confirmStatusChange();
    fixture.detectChanges();

    expect(users.updateStatus).toHaveBeenCalledOnceWith(1, 'INACTIVE');
    expect(component.users[0].status).toBe('ACTIVE');
    expect(fixture.nativeElement.querySelector('[role="dialog"]')?.textContent).toContain('Updating...');

    pending.error(new HttpErrorResponse({ status: 503, error: { message: 'Status service unavailable' } }));
    fixture.detectChanges();
    expect(component.users[0].status).toBe('ACTIVE');
    expect(fixture.nativeElement.querySelector('[role="dialog"] [role="alert"]')?.textContent).toContain('Status service unavailable');

    users.updateStatus.and.returnValue(of({ ...active, status: 'INACTIVE' }));
    component.confirmStatusChange();
    expect(users.updateStatus).toHaveBeenCalledTimes(2);
  });

  it('shows success feedback and refreshes the current page with applied filters intact', () => {
    users.updateStatus.and.returnValue(of({ ...active, status: 'INACTIVE' }));
    component.appliedFilter = { search: 'alice', roles: ['ADMIN'] };
    component.currentPage = 2;
    users.list.calls.reset();
    users.list.and.returnValue(of(page([active], 2, 3, 3)));
    component.requestStatusChange(active);
    component.confirmStatusChange();

    expect(notifications.showSuccess).toHaveBeenCalledWith('alice deactivated successfully.');
    expect(users.list).toHaveBeenCalledOnceWith(2, 10, 'alice', ['ADMIN']);
    expect(component.appliedFilter).toEqual({ search: 'alice', roles: ['ADMIN'] });
    expect(component.currentPage).toBe(2);
  });

  it('applies trimmed Username/email search and selected roles from page zero, then resets them', () => {
    users.list.calls.reset();
    component.setSearchDraft('  alice  ');
    component.toggleRole('MANAGER', true);
    component.toggleRole('ADMIN', true);
    component.applyFilters();

    expect(users.list).toHaveBeenCalledWith(0, 10, 'alice', ['MANAGER', 'ADMIN']);
    expect(component.appliedFilter).toEqual({ search: 'alice', roles: ['MANAGER', 'ADMIN'] });

    component.clearFilters();
    expect(users.list).toHaveBeenCalledWith(0, 10, '', []);
    expect(component.appliedFilter).toBeNull();
  });

  it('uses the immutable applied filters for pagination and honors returned page and row ordering', () => {
    users.list.and.returnValue(of(page([inactive], 1, 2, 11)));
    component.setSearchDraft('alice');
    component.applyFilters();
    fixture.detectChanges();

    expect(component.currentPage).toBe(1);
    expect(component.users).toEqual([inactive]);
    expect(fixture.nativeElement.querySelector('tbody tr strong')?.textContent?.trim()).toBe('zara');
    expect(fixture.nativeElement.querySelector('.pageMessage') ?? component.pageMessage).toBeTruthy();
  });

  it('shows loading and a retryable error state', () => {
    const pending = new Subject<UserPage>();
    users.list.and.returnValue(pending);
    component.loadUsers(0);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.state-panel')?.textContent).toContain('Loading Users');

    pending.error(new HttpErrorResponse({ status: 503, error: { message: 'Users unavailable' } }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('Users unavailable');
    expect(fixture.nativeElement.querySelector('[role="alert"] button')?.textContent).toContain('Retry');
  });

  it('prevents duplicate creation while the request is pending', () => {
    const pending = new Subject<UserSummary>();
    users.create.and.returnValue(pending);
    component.openCreateDialog();
    component.createForm.setValue({
      email: 'new@example.com',
      username: 'new-user',
      password: 'Strong!Password1',
      confirmPassword: 'Strong!Password1',
      role: 'MEMBER',
    });

    component.createUser();
    component.createUser();

    expect(users.create).toHaveBeenCalledTimes(1);
    expect(component.isCreatingUser).toBeTrue();
    pending.error(new HttpErrorResponse({ status: 503, error: { message: 'Unavailable' } }));
    expect(component.isCreatingUser).toBeFalse();
    expect(component.isCreateDialogOpen).toBeTrue();
  });

  it('maps structured validation and conflict errors without losing dialog values', () => {
    users.create.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 400,
      error: {
        errorCode: 'VALIDATION_ERROR',
        data: { errors: [{ field: 'username', message: 'Username is invalid.' }] },
      },
    })));
    component.openCreateDialog();
    component.createForm.setValue({
      email: 'new@example.com',
      username: 'new-user',
      password: 'Strong!Password1',
      confirmPassword: 'Strong!Password1',
      role: 'ADMIN',
    });
    component.createUser();

    expect(component.createForm.controls.username.errors?.['backend']).toBe('Username is invalid.');
    expect(component.createForm.getRawValue()).toEqual({
      email: 'new@example.com',
      username: 'new-user',
      password: 'Strong!Password1',
      confirmPassword: 'Strong!Password1',
      role: 'ADMIN',
    });
    expect(component.createUserErrorMessage).toBe('Please correct the highlighted fields.');
    expect(component.isCreateDialogOpen).toBeTrue();

    users.create.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 409,
      error: { errorCode: 'AUTH_EMAIL_OR_USERNAME_ALREADY_REGISTERED', message: 'Already registered.' },
    })));
    component.createUser();
    expect(component.createForm.controls.email.errors?.['backend']).toBe('Already registered.');
    expect(component.createForm.controls.username.errors?.['backend']).toBe('Already registered.');
  });

  it('closes, notifies, and refreshes the current filtered page after creation', () => {
    const pending = new Subject<UserSummary>();
    users.create.and.returnValue(pending);
    component.appliedFilter = { search: 'alice', roles: ['ADMIN'] };
    component.currentPage = 2;
    component.users = [inactive];
    users.list.calls.reset();
    users.list.and.returnValue(of(page([active], 2, 3, 11)));
    component.openCreateDialog();
    component.createForm.setValue({
      email: 'new@example.com',
      username: 'new-user',
      password: 'Strong!Password1',
      confirmPassword: 'Strong!Password1',
      role: 'MANAGER',
    });

    component.createUser();
    expect(component.users).toEqual([inactive]);
    expect(users.list).not.toHaveBeenCalled();

    pending.next(active);
    pending.complete();

    expect(component.isCreateDialogOpen).toBeFalse();
    expect(notifications.showSuccess).toHaveBeenCalledWith('User created successfully.');
    expect(users.list).toHaveBeenCalledWith(2, 10, 'alice', ['ADMIN']);
    expect(component.users).toEqual([active]);
  });

  it('distinguishes initial-empty and filtered-empty results', () => {
    users.list.and.returnValue(of(page([], 0, 0, 0)));
    component.loadUsers(0);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty-state h2')?.textContent?.trim()).toBe('No users found.');

    component.setSearchDraft('missing');
    component.applyFilters();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty-state h2')?.textContent?.trim()).toBe('No matching users found.');
  });
});
