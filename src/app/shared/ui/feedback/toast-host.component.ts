import { AfterViewInit, Component, DestroyRef, ElementRef, EventEmitter, inject, Input, Output, ViewChild } from '@angular/core';

import { ApplicationNotification, NotificationService } from '../../../core/notifications/notification.service';
import { IbomMotionService } from '../motion/ibom-motion.service';
import { IbomLoadingIndicatorComponent } from '../loading/loading-indicator.component';

@Component({
  selector: 'ibom-toast-item',
  standalone: true,
  imports: [IbomLoadingIndicatorComponent],
  template: `
    <article
      #toastElement
      class="ibom-toast ibom-notice ibom-motion-enter"
      [class.ibom-notice--success]="toast.tone === 'success'"
      [class.ibom-notice--warning]="toast.tone === 'warning'"
      [class.ibom-notice--error]="toast.tone === 'error'"
      [class.ibom-notice--information]="toast.tone === 'info'"
      [class.ibom-toast--loading]="toast.state === 'loading'"
      [attr.role]="isAssertive() ? 'alert' : 'status'"
      [attr.aria-live]="isAssertive() ? 'assertive' : 'polite'"
      aria-atomic="true"
      data-notification-toast
    >
      <span class="ibom-toast__tone" aria-hidden="true">{{ toneLabel() }}</span>
      <div class="ibom-toast__body">
        @if (toast.state === 'loading') {
          <ibom-loading-indicator label="Loading" [announce]="false" [decorative]="true" />
        }
        <p class="ibom-toast__message">{{ toast.message }}</p>
      </div>
      @if (toast.dismissible) {
        <button
          class="ibom-button ibom-button--quiet ibom-toast__dismiss"
          type="button"
          aria-label="Dismiss notification"
          (click)="dismissed.emit(toast.id)"
        >Dismiss</button>
      }
    </article>
  `,
})
export class IbomToastItemComponent implements AfterViewInit {
  @Input({ required: true }) toast!: ApplicationNotification;
  @Output() readonly dismissed = new EventEmitter<number>();

  @ViewChild('toastElement', { static: true, read: ElementRef })
  private readonly toastElement!: ElementRef<HTMLElement>;

  private readonly motion = inject(IbomMotionService).createScope(inject(DestroyRef));

  ngAfterViewInit(): void {
    this.motion.enter(this.toastElement.nativeElement);
  }

  isAssertive(): boolean {
    return this.toast.tone === 'error' || this.toast.tone === 'warning';
  }

  toneLabel(): string {
    if (this.toast.state === 'loading') return 'Loading';
    return this.toast.tone === 'info'
      ? 'Info'
      : this.toast.tone[0].toUpperCase() + this.toast.tone.slice(1);
  }
}

/**
 * The application root owns one instance of this host so authenticated and
 * unauthenticated routes share the same non-blocking feedback surface.
 */
@Component({
  selector: 'ibom-toast-host',
  standalone: true,
  imports: [IbomToastItemComponent],
  template: `
    <div class="ibom-toast-host" data-toast-host>
      @for (toast of notifications.toasts(); track toast.id) {
        <ibom-toast-item [toast]="toast" (dismissed)="dismiss($event)" />
      }
    </div>
  `,
})
export class IbomToastHostComponent {
  readonly notifications = inject(NotificationService);

  dismiss(id: number): void {
    this.notifications.dismiss(id);
  }
}
