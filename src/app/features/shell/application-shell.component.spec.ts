import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';

import { AuthService } from '../../core/auth/auth.service';
import { ApplicationShellComponent } from './application-shell.component';

describe('ApplicationShellComponent', () => {
  let fixture: ComponentFixture<ApplicationShellComponent>;

  beforeEach(async () => {
    const auth = {
      user: signal({ id: '1', email: 'minh@example.com', username: 'Minh Anh', role: 'MEMBER' }),
    };
    await TestBed.configureTestingModule({
      imports: [ApplicationShellComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();
    fixture = TestBed.createComponent(ApplicationShellComponent);
    fixture.detectChanges();
  });

  it('renders the authenticated identity and derived initials', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.avatar')?.textContent?.trim()).toBe('MA');
    expect(element.querySelector('.account-copy strong')?.textContent?.trim()).toBe('Minh Anh');
    expect(element.querySelector('.account-copy small')?.textContent?.trim()).toBe('MEMBER');
    expect(element.querySelector('.account-email')?.textContent?.trim()).toBe('minh@example.com');
  });

  it('opens and closes mobile navigation from the labeled control', () => {
    const toggle = fixture.nativeElement.querySelector('.mobile-nav-toggle') as HTMLButtonElement;
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('.sidebar-nav').classList).toContain('open');
  });
});
