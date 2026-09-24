import { HttpErrorResponse } from '@angular/common/http';
import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Subject, of } from 'rxjs';

import { AuthenticatedUser } from '../../../../core/auth/auth.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { AccountStatusConfirmationComponent } from '../../components/account-status-confirmation/account-status-confirmation.component';
import { ManagedUserCreationComponent } from '../../components/managed-user-creation/managed-user-creation.component';
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

  it('renders the directory and delegates row actions to the status boundary', () => {
    const headers = [...fixture.nativeElement.querySelectorAll('th')].map((header: HTMLElement) => header.textContent?.trim());

    expect(headers).toEqual(['Username', 'Email', 'Role', 'Account Status', 'Actions']);
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(2);
    expect([...fixture.nativeElement.querySelectorAll('.status-action')].map((button: HTMLElement) => button.textContent?.trim())).toEqual(['Deactivate', 'Activate']);
    expect(fixture.nativeElement.textContent).not.toContain('Full Name');
    expect(fixture.nativeElement.textContent).not.toContain('Job Title');
    expect(fixture.nativeElement.textContent).toContain('Create User');
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

  it('uses immutable applied filters for pagination and honors returned page and row ordering', () => {
    users.list.and.returnValue(of(page([inactive], 1, 2, 11)));
    component.setSearchDraft('alice');
    component.applyFilters();
    fixture.detectChanges();

    expect(component.currentPage).toBe(1);
    expect(component.users).toEqual([inactive]);
    expect(fixture.nativeElement.querySelector('tbody tr strong')?.textContent?.trim()).toBe('zara');
    expect(component.pageMessage).toBe('The requested page was unavailable. Showing page 2 instead.');
  });

  it('shows loading and a retryable directory error state', () => {
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

  it('shows initial-empty and filtered-empty directory results', () => {
    users.list.and.returnValue(of(page([], 0, 0, 0)));
    component.loadUsers(0);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty-state h2')?.textContent?.trim()).toBe('No user accounts found.');

    component.setSearchDraft('missing');
    expect(component.filtersApplied).toBeFalse();
    expect(component.canResetFilters).toBeTrue();
    component.applyFilters();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty-state h2')?.textContent?.trim()).toBe('No matching user accounts found.');
  });

  it('refreshes the current page with applied search, roles, and page after child success events', () => {
    component.appliedFilter = { search: 'alice', roles: ['ADMIN'] };
    component.currentPage = 2;
    users.list.calls.reset();
    users.list.and.returnValue(of(page([active], 2, 3, 3)));

    const creation = fixture.debugElement.query(By.directive(ManagedUserCreationComponent)).componentInstance as ManagedUserCreationComponent;
    creation.created.emit(active);

    expect(notifications.showSuccess).toHaveBeenCalledWith('User created successfully.');
    expect(users.list).toHaveBeenCalledOnceWith(2, 10, 'alice', ['ADMIN']);

    users.list.calls.reset();
    const status = fixture.debugElement.query(By.directive(AccountStatusConfirmationComponent)).componentInstance as AccountStatusConfirmationComponent;
    status.statusChanged.emit({ user: active, requestedStatus: 'INACTIVE' });

    expect(notifications.showSuccess).toHaveBeenCalledWith('alice deactivated successfully.');
    expect(users.list).toHaveBeenCalledOnceWith(2, 10, 'alice', ['ADMIN']);
    expect(component.appliedFilter).toEqual({ search: 'alice', roles: ['ADMIN'] });
    expect(component.currentPage).toBe(2);
  });
});
