import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';

import { NotificationService } from '../../../../core/notifications/notification.service';
import { UserPage, UserSummary } from '../../models/user-management.models';
import { UserManagementService } from '../../services/user-management.service';
import { UserManagementComponent } from './user-management.component';

describe('UserManagementComponent', () => {
  let fixture: ComponentFixture<UserManagementComponent>;
  let component: UserManagementComponent;
  let users: { list: jasmine.Spy; create: jasmine.Spy };
  let notifications: { showSuccess: jasmine.Spy };

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
    users = { list: jasmine.createSpy('list').and.returnValue(of(page())), create: jasmine.createSpy('create') };
    notifications = { showSuccess: jasmine.createSpy('showSuccess') };
    await TestBed.configureTestingModule({
      imports: [UserManagementComponent],
      providers: [
        { provide: UserManagementService, useValue: users },
        { provide: NotificationService, useValue: notifications },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserManagementComponent);
    fixture.detectChanges();
    component = fixture.componentInstance;
  });

  it('renders one unified User table with only the four approved columns', () => {
    const headers = [...fixture.nativeElement.querySelectorAll('th')].map((header: HTMLElement) => header.textContent?.trim());

    expect(headers).toEqual(['Username', 'Email', 'Role', 'Account Status']);
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(2);
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
