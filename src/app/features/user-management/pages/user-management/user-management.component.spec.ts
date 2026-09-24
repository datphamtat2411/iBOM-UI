import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';

import { UserPage, UserSummary } from '../../models/user-management.models';
import { UserManagementService } from '../../services/user-management.service';
import { UserManagementComponent } from './user-management.component';

describe('UserManagementComponent', () => {
  let fixture: ComponentFixture<UserManagementComponent>;
  let component: UserManagementComponent;
  let users: { list: jasmine.Spy };

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
    users = { list: jasmine.createSpy('list').and.returnValue(of(page())) };
    await TestBed.configureTestingModule({
      imports: [UserManagementComponent],
      providers: [{ provide: UserManagementService, useValue: users }],
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
    expect(fixture.nativeElement.textContent).not.toContain('Create User');
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
