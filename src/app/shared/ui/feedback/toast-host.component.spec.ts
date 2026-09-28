import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationService } from '../../../core/notifications/notification.service';
import { IbomToastHostComponent } from './toast-host.component';

describe('IbomToastHostComponent', () => {
  let fixture: ComponentFixture<IbomToastHostComponent>;
  let notifications: NotificationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IbomToastHostComponent],
      providers: [NotificationService],
    }).compileComponents();

    fixture = TestBed.createComponent(IbomToastHostComponent);
    notifications = TestBed.inject(NotificationService);
    fixture.detectChanges();
  });

  afterEach(() => {
    notifications.clear();
    fixture.destroy();
  });

  it('renders polite success feedback without taking focus', () => {
    const activeElement = document.activeElement;
    notifications.success('Profile saved', { duration: null });
    fixture.detectChanges();

    const toast = fixture.nativeElement.querySelector('[data-notification-toast]') as HTMLElement;
    expect(toast.getAttribute('role')).toBe('status');
    expect(toast.getAttribute('aria-live')).toBe('polite');
    expect(toast.getAttribute('aria-atomic')).toBe('true');
    expect(toast.textContent).toContain('Profile saved');
    expect(document.activeElement).toBe(activeElement);
  });

  it('renders assertive error feedback with a keyboard-accessible dismiss action', () => {
    notifications.error('Unable to save', { duration: null });
    fixture.detectChanges();

    const toast = fixture.nativeElement.querySelector('[data-notification-toast]') as HTMLElement;
    const dismiss = toast.querySelector('button') as HTMLButtonElement;
    expect(toast.getAttribute('role')).toBe('alert');
    expect(toast.getAttribute('aria-live')).toBe('assertive');
    expect(dismiss.getAttribute('aria-label')).toBe('Dismiss notification');

    dismiss.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-notification-toast]')).toBeNull();
  });

  it('renders persistent loading feedback with status semantics', () => {
    notifications.loading('Exporting CV');
    fixture.detectChanges();

    const toast = fixture.nativeElement.querySelector('[data-notification-toast]') as HTMLElement;
    expect(toast.getAttribute('role')).toBe('status');
    expect(toast.getAttribute('aria-live')).toBe('polite');
    expect(toast.classList).toContain('ibom-toast--loading');
    expect(toast.textContent).toContain('Exporting CV');
  });
});
