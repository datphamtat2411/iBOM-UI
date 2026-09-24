import { HttpErrorResponse } from '@angular/common/http';
import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';

import { AuthenticatedUser } from '../../../../core/auth/auth.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { UserSummary } from '../../models/user-management.models';
import { UserManagementService } from '../../services/user-management.service';
import { AccountStatusConfirmationComponent } from './account-status-confirmation.component';

describe('AccountStatusConfirmationComponent', () => {
  let fixture: ComponentFixture<AccountStatusConfirmationComponent>;
  let component: AccountStatusConfirmationComponent;
  let users: { updateStatus: jasmine.Spy };
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

  beforeEach(async () => {
    users = { updateStatus: jasmine.createSpy('updateStatus').and.returnValue(of({ ...active, status: 'INACTIVE' })) };
    auth = { user: signal<AuthenticatedUser | null>(null) };
    notifications = { showSuccess: jasmine.createSpy('showSuccess'), showError: jasmine.createSpy('showError') };
    await TestBed.configureTestingModule({
      imports: [AccountStatusConfirmationComponent],
      providers: [
        { provide: UserManagementService, useValue: users },
        { provide: AuthService, useValue: auth },
        { provide: NotificationService, useValue: notifications },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountStatusConfirmationComponent);
    component = fixture.componentInstance;
    component.user = active;
    fixture.detectChanges();
  });

  it('renders status-appropriate actions and exact confirmation copy', () => {
    expect(fixture.nativeElement.querySelector('.status-action')?.textContent?.trim()).toBe('Deactivate');
    (fixture.nativeElement.querySelector('.status-action') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"] h2')?.textContent).toContain('Deactivate alice?');
    expect(fixture.nativeElement.querySelector('[role="dialog"] #status-confirmation-copy')?.textContent).toBe(
      "This will make alice's account access and existing authenticated sessions unusable. The account and its Profile data will be retained.",
    );

    component.user = inactive;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.status-action')?.textContent?.trim()).toBe('Activate');
  });

  it('protects the current user from deactivation while allowing inactive self activation', () => {
    auth.user.set({ id: 1, email: active.email, username: active.username, role: active.role });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Self-deactivation unavailable');
    expect(fixture.nativeElement.querySelector('.status-action')).toBeNull();

    component.user = { ...active, status: 'INACTIVE' };
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.status-action')?.textContent?.trim()).toBe('Activate');
  });

  it('moves focus into the dialog, cycles keyboard focus, and restores focus on dismissal', () => {
    const trigger = fixture.nativeElement.querySelector('.status-action') as HTMLButtonElement;
    trigger.focus();
    component.requestStatusChange(active);
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('.status-modal') as HTMLElement;
    expect(document.activeElement).toBe(dialog);
    const buttons = Array.from(dialog.querySelectorAll<HTMLButtonElement>('button'));
    buttons[buttons.length - 1].focus();
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(buttons[0]);
    buttons[0].focus();
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);

    component.requestStatusChange(active);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.modal-backdrop') as HTMLElement).click();
    expect(component.statusConfirmation).toBeNull();
  });

  it('prevents duplicate requests, preserves retryable errors, and emits successful status details', () => {
    const pending = new Subject<UserSummary>();
    const changed = jasmine.createSpy('changed');
    component.statusChanged.subscribe(changed);
    users.updateStatus.and.returnValue(pending);
    component.requestStatusChange(active);
    component.confirmStatusChange();
    component.confirmStatusChange();
    fixture.detectChanges();

    expect(users.updateStatus).toHaveBeenCalledOnceWith(1, 'INACTIVE');
    expect(fixture.nativeElement.querySelector('[role="dialog"]')?.textContent).toContain('Updating...');

    pending.error(new HttpErrorResponse({ status: 503, error: { message: 'Status service unavailable' } }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"] [role="alert"]')?.textContent).toContain('Status service unavailable');
    expect(notifications.showError).toHaveBeenCalledWith('Status service unavailable');

    users.updateStatus.and.returnValue(of({ ...active, status: 'INACTIVE' }));
    component.confirmStatusChange();
    expect(users.updateStatus).toHaveBeenCalledTimes(2);
    expect(changed).toHaveBeenCalledOnceWith({ user: active, requestedStatus: 'INACTIVE' });
    expect(notifications.showSuccess).not.toHaveBeenCalled();
  });

  it('maps a rejected self-deactivation to the retryable inline error', () => {
    users.updateStatus.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 409,
      error: { errorCode: 'USER_SELF_DEACTIVATION_NOT_ALLOWED' },
    })));
    component.requestStatusChange(active);
    component.confirmStatusChange();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"] [role="alert"]')?.textContent).toContain('cannot deactivate your own account');
    expect(notifications.showError).toHaveBeenCalledWith('You cannot deactivate your own account.');
    expect(component.statusConfirmation).not.toBeNull();
  });

  it('cancels without a mutation', () => {
    component.requestStatusChange(active);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('[role="dialog"] .btn:not(.primary)') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(users.updateStatus).not.toHaveBeenCalled();
  });
});
