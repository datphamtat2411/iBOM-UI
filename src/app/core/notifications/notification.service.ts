import { Injectable, signal } from '@angular/core';

export interface ApplicationNotification {
  id: number;
  tone: 'success';
  message: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly notification = signal<ApplicationNotification | null>(null);

  private nextId = 0;
  private dismissTimer: ReturnType<typeof setTimeout> | null = null;

  showSuccess(message: string): void {
    this.clearDismissTimer();
    const notification = { id: ++this.nextId, tone: 'success' as const, message };
    this.notification.set(notification);
    this.dismissTimer = setTimeout(() => {
      if (this.notification()?.id === notification.id) this.notification.set(null);
      this.dismissTimer = null;
    }, 5000);
  }

  clear(): void {
    this.clearDismissTimer();
    this.notification.set(null);
  }

  private clearDismissTimer(): void {
    if (this.dismissTimer !== null) clearTimeout(this.dismissTimer);
    this.dismissTimer = null;
  }
}
