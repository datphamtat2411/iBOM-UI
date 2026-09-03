import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { AccountSettingsComponent } from './account-settings.component';
import { AccountSettingsService } from '../../services/account-settings.service';

describe('AccountSettingsComponent', () => {
  let fixture: ComponentFixture<AccountSettingsComponent>;
  let service: jasmine.SpyObj<AccountSettingsService>;
  let auth: jasmine.SpyObj<AuthService>;

  const user = { id: '1', email: 'user@example.com', username: 'member', role: 'MEMBER' };

  beforeEach(async () => {
    service = jasmine.createSpyObj<AccountSettingsService>('AccountSettingsService', ['changeUsername', 'changePassword']);
    service.changeUsername.and.returnValue(of(user));
    service.changePassword.and.returnValue(of(undefined));
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['updateUser']);
    Object.defineProperty(auth, 'user', { value: signal(user) });

    await TestBed.configureTestingModule({
      imports: [AccountSettingsComponent],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: AccountSettingsService, useValue: service },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AccountSettingsComponent);
    fixture.detectChanges();
  });

  function fillPassword(): void {
    fixture.componentInstance.passwordForm.setValue({ currentPassword: 'Current1!', password: 'NewStrong1!', confirmPassword: 'NewStrong1!' });
  }

  it('submits the trimmed username and updates the authenticated user', () => {
    fixture.componentInstance.usernameForm.controls.username.setValue(' updated-user ');

    fixture.componentInstance.submitUsername();

    expect(service.changeUsername).toHaveBeenCalledWith({ username: 'updated-user' });
    expect(auth.updateUser).toHaveBeenCalledWith(user);
    expect(fixture.componentInstance.usernameForm.controls.username.value).toBe(user.username);
    expect(fixture.componentInstance.messageTone).toBe('success');
  });

  it('maps a username conflict by error code, regardless of its message text', () => {
    service.changeUsername.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 409,
      error: { errorCode: 'AUTH_USERNAME_CONFLICT', message: 'Username unavailable for this account.' },
    })));
    fixture.componentInstance.usernameForm.controls.username.setValue('taken-user');

    fixture.componentInstance.submitUsername();

    expect(fixture.componentInstance.usernameForm.controls.username.errors?.['backend']).toBe('Username unavailable for this account.');
    expect(fixture.componentInstance.message).toBe('');
  });

  it('submits exactly currentPassword and newPassword for a password change', () => {
    fillPassword();

    fixture.componentInstance.submitPassword();

    expect(service.changePassword).toHaveBeenCalledWith({ currentPassword: 'Current1!', newPassword: 'NewStrong1!' });
    expect(service.changePassword.calls.mostRecent().args[0]).not.toEqual(jasmine.objectContaining({ confirmPassword: jasmine.anything() }));
  });

  it('toggles each password independently without changing values', () => {
    fillPassword();
    const inputs = fixture.nativeElement.querySelectorAll('.password-input input') as NodeListOf<HTMLInputElement>;
    const buttons = fixture.nativeElement.querySelectorAll('.password-toggle') as NodeListOf<HTMLButtonElement>;
    expect(Array.from(inputs).every((input) => input.type === 'password')).toBeTrue();
    expect(buttons[0].type).toBe('button');
    expect(buttons[0].getAttribute('aria-label')).toBe('Show current password');

    buttons[1].click();
    fixture.detectChanges();
    expect(inputs[0].type).toBe('password');
    expect(inputs[1].type).toBe('text');
    expect(inputs[2].type).toBe('password');
    expect(buttons[1].getAttribute('aria-label')).toBe('Hide new password');

    buttons[2].click();
    fixture.detectChanges();
    expect(inputs[1].type).toBe('text');
    expect(inputs[2].type).toBe('text');
    expect(fixture.componentInstance.passwordForm.getRawValue()).toEqual({ currentPassword: 'Current1!', password: 'NewStrong1!', confirmPassword: 'NewStrong1!' });

    buttons[1].click();
    fixture.detectChanges();
    expect(inputs[1].type).toBe('password');
    expect(inputs[2].type).toBe('text');
  });

  it('attaches incorrect-current-password errors to the current password control', () => {
    service.changePassword.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 401,
      error: { errorCode: 'AUTH_INCORRECT_CURRENT_PASSWORD', message: 'The current password is incorrect.' },
    })));
    fillPassword();

    fixture.componentInstance.submitPassword();

    expect(fixture.componentInstance.passwordForm.controls.currentPassword.errors?.['backend']).toBe('The current password is incorrect.');
  });

  it('maps structured newPassword validation errors to the password control', () => {
    service.changePassword.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 400,
      error: { errorCode: 'VALIDATION_ERROR', data: { errors: [{ field: 'newPassword', message: 'Password policy failed.' }] } },
    })));
    fillPassword();

    fixture.componentInstance.submitPassword();

    expect(fixture.componentInstance.passwordForm.controls.password.errors?.['backend']).toBe('Password policy failed.');
    expect(fixture.componentInstance.passwordForm.controls.password.touched).toBeTrue();
    expect(fixture.componentInstance.passwordForm.controls.currentPassword.errors?.['backend']).toBeUndefined();
  });

  it('resets the password form and shows success after a password change', () => {
    fillPassword();

    fixture.componentInstance.submitPassword();

    expect(fixture.componentInstance.passwordForm.getRawValue()).toEqual({ currentPassword: '', password: '', confirmPassword: '' });
    expect(fixture.componentInstance.messageTone).toBe('success');
  });
});
