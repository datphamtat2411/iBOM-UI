import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let auth: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['login']);
    auth.login.and.returnValue(of({ accessToken: 'token', user: { id: '1', email: 'user@example.com', username: 'member', role: 'MEMBER' } }));
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();
    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
  });

  it('renders the approved Login actions and controls', () => {
    expect(fixture.nativeElement.querySelector('#login-heading').textContent).toContain('Several precise CVs');
    expect(fixture.nativeElement.querySelector('#email')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#password')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#login-submit').textContent).toContain('Sign in');
  });

  it('links the registration entry point to Registration', () => {
    expect(fixture.nativeElement.querySelector('a[routerLink="/registration"]')).toBeTruthy();
  });

  it('links the Forgot Password entry point to recovery', () => {
    expect(fixture.nativeElement.querySelector('a[routerLink="/forgot-password"]')).toBeTruthy();
  });

  it('toggles password visibility without changing the value', () => {
    const password = fixture.nativeElement.querySelector('#password') as HTMLInputElement;
    const toggle = fixture.nativeElement.querySelector('.password-toggle') as HTMLButtonElement;
    password.value = 'secret';
    password.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(password.type).toBe('password');
    expect(toggle.getAttribute('aria-label')).toBe('Show password');
    toggle.click();
    fixture.detectChanges();
    expect(password.type).toBe('text');
    expect(toggle.getAttribute('aria-label')).toBe('Hide password');
    expect(fixture.componentInstance.loginForm.controls.password.value).toBe('secret');
  });

  it('prevents invalid submission and shows field feedback', () => {
    fixture.nativeElement.querySelector('#login-form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(auth.login).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('#email-error').textContent).toContain('Email is required');
    expect(fixture.nativeElement.querySelector('#password-error').textContent).toContain('Password is required');
  });

  it('submits once, shows loading, then navigates on success', async () => {
    const request = new Subject<ReturnType<AuthService['login']> extends import('rxjs').Observable<infer T> ? T : never>();
    auth.login.and.returnValue(request.asObservable());
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const email = fixture.nativeElement.querySelector('#email');
    const password = fixture.nativeElement.querySelector('#password');
    email.value = ' USER@EXAMPLE.COM ';
    email.dispatchEvent(new Event('input'));
    password.value = 'secret';
    password.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('#login-form').dispatchEvent(new Event('submit'));
    fixture.nativeElement.querySelector('#login-form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(auth.login).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('#login-submit').disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('#login-submit').textContent).toContain('Signing in');

    request.next({ accessToken: 'token', user: { id: '1', email: 'user@example.com', username: 'member', role: 'MEMBER' } });
    request.complete();
    await fixture.whenStable();
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('renders inactive-account backend feedback as a warning', () => {
    auth.login.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403, error: { errorCode: 'AUTH_ACCOUNT_INACTIVE', message: 'Account disabled.' } })));
    fixture.componentInstance.loginForm.setValue({ email: 'user@example.com', password: 'secret' });
    fixture.componentInstance.submit();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#auth-message').textContent).toContain('Account disabled.');
    expect(fixture.nativeElement.querySelector('#auth-message').classList).toContain('warning');
  });
});
