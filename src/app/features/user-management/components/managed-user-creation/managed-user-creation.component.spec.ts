import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';

import { UserSummary } from '../../models/user-management.models';
import { UserManagementService } from '../../services/user-management.service';
import { ManagedUserCreationComponent } from './managed-user-creation.component';

describe('ManagedUserCreationComponent', () => {
  let fixture: ComponentFixture<ManagedUserCreationComponent>;
  let component: ManagedUserCreationComponent;
  let users: { create: jasmine.Spy };

  const createdUser: UserSummary = {
    id: 3,
    username: 'new-user',
    email: 'new@example.com',
    role: 'MANAGER',
    status: 'ACTIVE',
  };

  function setValidForm(): void {
    component.createForm.setValue({
      email: 'new@example.com',
      username: 'new-user',
      password: 'Strong!Password1',
      confirmPassword: 'Strong!Password1',
      role: 'MANAGER',
    });
  }

  beforeEach(async () => {
    users = { create: jasmine.createSpy('create') };
    await TestBed.configureTestingModule({
      imports: [ManagedUserCreationComponent],
      providers: [{ provide: UserManagementService, useValue: users }],
    }).compileComponents();

    fixture = TestBed.createComponent(ManagedUserCreationComponent);
    fixture.detectChanges();
    component = fixture.componentInstance;
  });

  it('opens with supported roles and MEMBER selected', () => {
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

  it('revalidates confirmation and toggles password visibility', () => {
    component.openCreateDialog();
    fixture.detectChanges();
    component.createForm.controls.password.setValue('Strong!Password1');
    component.createForm.controls.confirmPassword.setValue('Strong!Password1');
    expect(component.createForm.controls.confirmPassword.valid).toBeTrue();

    component.createForm.controls.password.setValue('Other!Password2');
    expect(component.createForm.controls.confirmPassword.errors?.['passwordMismatch']).toBeTrue();

    const password = fixture.nativeElement.querySelector('#create-user-password') as HTMLInputElement;
    expect(password.type).toBe('password');
    component.toggleCreatePasswordVisibility();
    fixture.detectChanges();
    expect(password.type).toBe('text');
    component.toggleCreateConfirmPasswordVisibility();
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('#create-user-confirm-password') as HTMLInputElement).type).toBe('text');
  });

  it('moves focus into the dialog and restores it after idle dismissal', () => {
    const trigger = fixture.nativeElement.querySelector('button.btn.primary') as HTMLButtonElement;
    trigger.focus();
    component.openCreateDialog();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('.create-user-dialog') as HTMLElement;
    expect(document.activeElement).toBe(dialog);

    component.closeCreateDialog();
    expect(document.activeElement).toBe(trigger);
  });

  it('contains Tab and Shift+Tab and dismisses with Escape or a direct backdrop click', () => {
    component.openCreateDialog();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('.create-user-dialog') as HTMLElement;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('input, select, button'));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    last.focus();
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(first);

    first.focus();
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    expect(document.activeElement).toBe(last);

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(component.isCreateDialogOpen).toBeFalse();

    component.openCreateDialog();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.dialog-backdrop') as HTMLElement).click();
    expect(component.isCreateDialogOpen).toBeFalse();
  });

  it('blocks dismissal and duplicate submits while creation is pending', () => {
    const pending = new Subject<UserSummary>();
    users.create.and.returnValue(pending);
    component.openCreateDialog();
    setValidForm();
    component.createUser();
    component.createUser();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('.create-user-dialog') as HTMLElement;
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    (fixture.nativeElement.querySelector('.dialog-backdrop') as HTMLElement).click();
    expect(users.create).toHaveBeenCalledTimes(1);
    expect(component.isCreatingUser).toBeTrue();
    expect(component.isCreateDialogOpen).toBeTrue();

    pending.error(new HttpErrorResponse({ status: 503, error: { message: 'Unavailable' } }));
    expect(component.isCreatingUser).toBeFalse();
    expect(component.isCreateDialogOpen).toBeTrue();
  });

  it('maps backend errors while preserving values and supports retry', () => {
    users.create.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 400,
      error: {
        errorCode: 'VALIDATION_ERROR',
        data: { errors: [{ field: 'username', message: 'Username is invalid.' }] },
      },
    })));
    component.openCreateDialog();
    setValidForm();
    component.createUser();

    expect(component.createForm.controls.username.errors?.['backend']).toBe('Username is invalid.');
    expect(component.createForm.getRawValue()).toEqual({
      email: 'new@example.com',
      username: 'new-user',
      password: 'Strong!Password1',
      confirmPassword: 'Strong!Password1',
      role: 'MANAGER',
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

  it('emits the created user and closes after a successful request', () => {
    const created = jasmine.createSpy('created');
    component.created.subscribe(created);
    users.create.and.returnValue(of(createdUser));
    component.openCreateDialog();
    setValidForm();
    component.createUser();

    expect(created).toHaveBeenCalledOnceWith(createdUser);
    expect(component.isCreateDialogOpen).toBeFalse();
    expect(component.isCreatingUser).toBeFalse();
  });
});
