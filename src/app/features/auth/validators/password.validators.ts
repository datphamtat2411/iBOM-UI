import { AbstractControl, ValidationErrors } from '@angular/forms';

export function strongPassword(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '');
  return value.length >= 8 && value.length <= 72 && /[A-Z]/.test(value) && /[a-z]/.test(value)
    && /\d/.test(value) && /[^A-Za-z0-9\s]/.test(value) ? null : { strongPassword: true };
}

export function matchingPassword(control: AbstractControl): ValidationErrors | null {
  const group = control.parent;
  return group && control.value !== group.get('password')?.value ? { passwordMismatch: true } : null;
}
