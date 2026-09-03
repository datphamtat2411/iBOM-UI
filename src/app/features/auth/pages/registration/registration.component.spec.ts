import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { RegistrationComponent } from './registration.component';
import { RegistrationService } from '../../services/registration.service';

describe('RegistrationComponent', () => {
  let fixture: ComponentFixture<RegistrationComponent>;
  let service: jasmine.SpyObj<RegistrationService>;

  beforeEach(async () => {
    service = jasmine.createSpyObj<RegistrationService>('RegistrationService', ['requestVerificationCode', 'register']);
    service.requestVerificationCode.and.returnValue(of(undefined));
    service.register.and.returnValue(of(undefined));
    await TestBed.configureTestingModule({
      imports: [RegistrationComponent],
      providers: [provideRouter([]), { provide: RegistrationService, useValue: service }],
    }).compileComponents();
    fixture = TestBed.createComponent(RegistrationComponent);
    fixture.detectChanges();
  });

  function fillInitial(): void {
    fixture.componentInstance.registrationForm.patchValue({ email: ' MEMBER@EXAMPLE.COM ', username: 'member', password: 'Strong1!', confirmPassword: 'Strong1!' });
    fixture.detectChanges();
  }

  it('renders initial fields and hides Verification Code', () => {
    expect(fixture.nativeElement.querySelector('#email')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#username')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#password')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#confirm-password')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#verification-code')).toBeNull();
  });

  it('toggles password visibility independently without changing values', () => {
    fillInitial();
    const inputs = fixture.nativeElement.querySelectorAll('.password-input input') as NodeListOf<HTMLInputElement>;
    const buttons = fixture.nativeElement.querySelectorAll('.password-toggle') as NodeListOf<HTMLButtonElement>;
    expect(inputs[0].type).toBe('password');
    expect(inputs[1].type).toBe('password');
    expect(buttons[0].type).toBe('button');
    expect(buttons[0].getAttribute('aria-label')).toBe('Show password');

    buttons[0].click();
    fixture.detectChanges();
    expect(inputs[0].type).toBe('text');
    expect(inputs[1].type).toBe('password');
    expect(buttons[0].getAttribute('aria-label')).toBe('Hide password');
    expect(fixture.componentInstance.registrationForm.getRawValue().password).toBe('Strong1!');
    expect(fixture.componentInstance.registrationForm.getRawValue().confirmPassword).toBe('Strong1!');

    buttons[1].click();
    fixture.detectChanges();
    expect(inputs[0].type).toBe('text');
    expect(inputs[1].type).toBe('text');
    expect(buttons[1].getAttribute('aria-label')).toBe('Hide confirm password');
    buttons[0].click();
    fixture.detectChanges();
    expect(inputs[0].type).toBe('password');
    expect(inputs[1].type).toBe('text');
  });

  it('updates password requirement indicators live', () => {
    const password = fixture.componentInstance.registrationForm.controls.password;
    password.setValue('weak');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.requirements span.met').length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('.requirements span')[2].classList).toContain('met');
    password.setValue('Strong1!');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.requirements span.met').length).toBe(5);
  });

  it('requests one code, reveals the code field, and preserves inputs', () => {
    fillInitial();
    const pending = new Subject<void>();
    service.requestVerificationCode.and.returnValue(pending.asObservable());
    fixture.componentInstance.requestCode();
    fixture.componentInstance.requestCode();
    expect(service.requestVerificationCode).toHaveBeenCalledTimes(1);
    pending.next(); pending.complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#verification-code')).toBeTruthy();
    expect(fixture.componentInstance.registrationForm.controls.username.value).toBe('member');
  });

  it('resets verification when email changes but not for other inputs', () => {
    fillInitial();
    fixture.componentInstance.requestCode();
    expect(fixture.componentInstance.codeRequested).toBeTrue();
    fixture.componentInstance.registrationForm.controls.password.setValue('Other1!');
    expect(fixture.componentInstance.codeRequested).toBeTrue();
    fixture.componentInstance.registrationForm.controls.email.setValue('other@example.com');
    expect(fixture.componentInstance.codeRequested).toBeFalse();
    expect(fixture.componentInstance.registrationForm.controls.verificationCode.value).toBe('');
  });

  it('excludes Confirm Password on submit and navigates to Login', async () => {
    fillInitial();
    fixture.componentInstance.requestCode();
    fixture.componentInstance.registrationForm.controls.verificationCode.setValue('123456');
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    fixture.componentInstance.submit();
    expect(service.register).toHaveBeenCalledWith({ email: 'member@example.com', username: 'member', password: 'Strong1!', verificationCode: '123456' });
    await fixture.whenStable();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('maps structured backend errors to controls', () => {
    service.register.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { errorCode: 'VALIDATION_ERROR', data: { errors: [{ field: 'password', message: 'Too weak.' }] } } })));
    fillInitial(); fixture.componentInstance.requestCode(); fixture.componentInstance.registrationForm.controls.verificationCode.setValue('123456'); fixture.componentInstance.submit(); fixture.detectChanges();
    expect(fixture.componentInstance.registrationForm.controls.password.errors?.['backend']).toBe('Too weak.');
  });
});
