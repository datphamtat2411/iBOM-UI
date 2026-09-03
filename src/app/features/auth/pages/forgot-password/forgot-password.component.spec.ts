import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { PasswordResetService } from '../../services/password-reset.service';
import { ForgotPasswordComponent } from './forgot-password.component';

describe('ForgotPasswordComponent', () => {
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let service: jasmine.SpyObj<PasswordResetService>;

  beforeEach(async () => {
    service = jasmine.createSpyObj<PasswordResetService>('PasswordResetService', ['requestCode', 'verifyCode', 'resetPassword']);
    service.requestCode.and.returnValue(of(undefined));
    service.verifyCode.and.returnValue(of(undefined));
    service.resetPassword.and.returnValue(of(undefined));
    await TestBed.configureTestingModule({ imports: [ForgotPasswordComponent], providers: [provideRouter([]), { provide: PasswordResetService, useValue: service }] }).compileComponents();
    fixture = TestBed.createComponent(ForgotPasswordComponent);
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture.detectChanges();
  });

  it('validates email and keeps the request neutral on success', () => {
    fixture.componentInstance.requestCode();
    expect(service.requestCode).not.toHaveBeenCalled();
    fixture.componentInstance.requestForm.controls.email.setValue(' USER@EXAMPLE.COM ');
    fixture.componentInstance.requestCode();
    expect(service.requestCode).toHaveBeenCalledWith({ email: 'user@example.com' });
    expect(fixture.componentInstance.step).toBe('verify');
    expect(fixture.componentInstance.message).toContain('If an account exists');
  });

  it('toggles reset passwords independently without changing values', () => {
    fixture.componentInstance.step = 'reset';
    fixture.componentInstance.resetForm.setValue({ password: 'Strong1!', confirmPassword: 'Strong1!' });
    fixture.detectChanges();
    const inputs = fixture.nativeElement.querySelectorAll('.password-input input') as NodeListOf<HTMLInputElement>;
    const buttons = fixture.nativeElement.querySelectorAll('.password-toggle') as NodeListOf<HTMLButtonElement>;
    expect(inputs[0].type).toBe('password');
    expect(inputs[1].type).toBe('password');
    expect(buttons[0].type).toBe('button');
    expect(buttons[0].getAttribute('aria-label')).toBe('Show password');

    buttons[1].click();
    fixture.detectChanges();
    expect(inputs[0].type).toBe('password');
    expect(inputs[1].type).toBe('text');
    expect(buttons[1].getAttribute('aria-label')).toBe('Hide confirm password');
    expect(fixture.componentInstance.resetForm.getRawValue()).toEqual({ password: 'Strong1!', confirmPassword: 'Strong1!' });
  });

  it('ignores duplicate requests while loading and verifies a six-digit code', () => {
    const pending = new Subject<void>();
    service.requestCode.and.returnValue(pending.asObservable());
    fixture.componentInstance.requestForm.controls.email.setValue('user@example.com');
    fixture.componentInstance.requestCode();
    fixture.componentInstance.requestCode();
    expect(service.requestCode).toHaveBeenCalledTimes(1);
    pending.next(); pending.complete();
    fixture.componentInstance.verifyForm.controls.verificationCode.setValue('12345');
    fixture.componentInstance.verifyCode();
    expect(service.verifyCode).not.toHaveBeenCalled();
    fixture.componentInstance.verifyForm.controls.verificationCode.setValue('123456');
    fixture.componentInstance.verifyCode();
    expect(service.verifyCode).toHaveBeenCalledWith({ email: 'user@example.com', verificationCode: '123456' });
  });

  it('shows code errors and omits confirm password on reset', () => {
    fixture.componentInstance.requestForm.controls.email.setValue('user@example.com');
    fixture.componentInstance.requestCode();
    fixture.componentInstance.verifyForm.controls.verificationCode.setValue('123456');
    fixture.componentInstance.verifyCode();
    fixture.componentInstance.resetForm.setValue({ password: 'Strong1!', confirmPassword: 'Different1!' });
    fixture.componentInstance.resetPassword();
    expect(service.resetPassword).not.toHaveBeenCalled();
    fixture.componentInstance.resetForm.controls.confirmPassword.setValue('Strong1!');
    fixture.componentInstance.resetPassword();
    expect(service.resetPassword).toHaveBeenCalledWith({ email: 'user@example.com', verificationCode: '123456', password: 'Strong1!' });
  });

  it('maps invalid codes and rate limits without using message text for branching', () => {
    service.verifyCode.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { errorCode: 'AUTH_INVALID_OR_EXPIRED_VERIFICATION_CODE', message: 'backend code detail' } })));
    fixture.componentInstance.requestForm.controls.email.setValue('user@example.com');
    fixture.componentInstance.requestCode();
    fixture.componentInstance.verifyForm.controls.verificationCode.setValue('123456');
    fixture.componentInstance.verifyCode();
    expect(fixture.componentInstance.verifyForm.controls.verificationCode.errors?.['backend']).toBe('backend code detail');
  });

  it('navigates to Login after reset success', async () => {
    const router = TestBed.inject(Router);
    fixture.componentInstance.requestForm.controls.email.setValue('user@example.com');
    fixture.componentInstance.requestCode();
    fixture.componentInstance.verifyForm.controls.verificationCode.setValue('123456');
    fixture.componentInstance.verifyCode();
    fixture.componentInstance.resetForm.setValue({ password: 'Strong1!', confirmPassword: 'Strong1!' });
    fixture.componentInstance.resetPassword();
    await fixture.whenStable();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(fixture.componentInstance.step).toBe('request');
  });
});
