import { computed, Injectable, OnDestroy, signal } from '@angular/core';

export type NotificationTone = 'success' | 'error' | 'warning' | 'info';
export type NotificationState = 'loading' | 'visible';

export interface ApplicationNotification {
  id: number;
  tone: NotificationTone;
  message: string;
  duration: number | null;
  dismissible: boolean;
  state: NotificationState;
}

export interface NotificationOptions {
  duration?: number | null;
  dismissible?: boolean;
  dedupeKey?: string;
}

export interface NotificationUpdate {
  tone?: NotificationTone;
  message?: string;
  duration?: number | null;
  dismissible?: boolean;
  state?: NotificationState;
}

export const NOTIFICATION_DEFAULT_DURATIONS: Record<NotificationTone, number> = {
  success: 4500,
  error: 6000,
  warning: 5500,
  info: 4500,
};

export const NOTIFICATION_MAX_VISIBLE = 4;
export const NOTIFICATION_DEDUPE_WINDOW = 1000;

interface RecentNotification {
  id: number;
  createdAt: number;
}

/**
 * Shared non-blocking feedback store. Feature code chooses whether a result
 * belongs inline or in this global toast surface; HTTP requests are not
 * converted into notifications automatically.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  private readonly toastsSignal = signal<ApplicationNotification[]>([]);
  private readonly dismissTimers = new Map<number, ReturnType<typeof setTimeout>>();
  private readonly recentNotifications = new Map<string, RecentNotification>();
  private nextId = 0;

  readonly toasts = this.toastsSignal.asReadonly();
  readonly notifications = this.toasts;

  // Compatibility view for callers that only need the most recent notification.
  readonly notification = computed<ApplicationNotification | null>(() => {
    const current = this.toastsSignal();
    return current[current.length - 1] ?? null;
  });

  success(message: string, options: NotificationOptions = {}): number {
    return this.show('success', message, options);
  }

  error(message: string, options: NotificationOptions = {}): number {
    return this.show('error', message, options);
  }

  warning(message: string, options: NotificationOptions = {}): number {
    return this.show('warning', message, options);
  }

  info(message: string, options: NotificationOptions = {}): number {
    return this.show('info', message, options);
  }

  loading(message: string, options: Omit<NotificationOptions, 'duration'> = {}): number {
    return this.add('info', message, { ...options, duration: null }, 'loading');
  }

  showSuccess(message: string, options: NotificationOptions = {}): number {
    return this.success(message, options);
  }

  showError(message: string, options: NotificationOptions = {}): number {
    return this.error(message, options);
  }

  showWarning(message: string, options: NotificationOptions = {}): number {
    return this.warning(message, options);
  }

  showInfo(message: string, options: NotificationOptions = {}): number {
    return this.info(message, options);
  }

  showLoading(message: string, options: Omit<NotificationOptions, 'duration'> = {}): number {
    return this.loading(message, options);
  }

  show(
    tone: NotificationTone,
    message: string,
    options: NotificationOptions = {},
  ): number {
    return this.add(tone, message, options, 'visible');
  }

  update(id: number, update: NotificationUpdate): boolean {
    const current = this.toastsSignal().find((toast) => toast.id === id);
    if (!current) return false;

    this.clearDismissTimer(id);
    const tone = update.tone ?? current.tone;
    const state = update.state ?? (update.tone && current.state === 'loading' ? 'visible' : current.state);
    const duration = state === 'loading'
      ? null
      : update.duration !== undefined
        ? update.duration
        : current.state === 'loading' || update.tone
          ? NOTIFICATION_DEFAULT_DURATIONS[tone]
          : current.duration;
    const next: ApplicationNotification = {
      ...current,
      tone,
      message: update.message ?? current.message,
      duration,
      dismissible: update.dismissible ?? current.dismissible,
      state,
    };

    this.toastsSignal.update((toasts) => toasts.map((toast) => (toast.id === id ? next : toast)));
    this.rememberNotification(next, Date.now());
    this.scheduleDismiss(next);
    return true;
  }

  dismiss(id: number): void {
    this.clearDismissTimer(id);
    this.toastsSignal.update((toasts) => toasts.filter((toast) => toast.id !== id));

    for (const [key, recent] of this.recentNotifications) {
      if (recent.id === id) this.recentNotifications.delete(key);
    }
  }

  clear(): void {
    for (const timer of this.dismissTimers.values()) clearTimeout(timer);
    this.dismissTimers.clear();
    this.recentNotifications.clear();
    this.toastsSignal.set([]);
  }

  ngOnDestroy(): void {
    this.clear();
  }

  private add(
    tone: NotificationTone,
    message: string,
    options: NotificationOptions,
    state: NotificationState,
  ): number {
    const now = Date.now();
    this.pruneRecentNotifications(now);
    const duplicateId = state === 'visible' ? this.findDuplicate(tone, message, options, now) : null;
    if (duplicateId !== null) return duplicateId;

    const notification: ApplicationNotification = {
      id: ++this.nextId,
      tone,
      message,
      duration: state === 'loading' ? null : options.duration ?? NOTIFICATION_DEFAULT_DURATIONS[tone],
      dismissible: options.dismissible ?? true,
      state,
    };
    const current = this.toastsSignal();
    const overflow = current.length >= NOTIFICATION_MAX_VISIBLE
      ? current.slice(0, current.length - NOTIFICATION_MAX_VISIBLE + 1)
      : [];

    for (const toast of overflow) this.clearDismissTimer(toast.id);
    this.toastsSignal.set([...current.slice(overflow.length), notification]);
    this.rememberNotification(notification, now, options.dedupeKey);
    this.scheduleDismiss(notification);
    return notification.id;
  }

  private findDuplicate(
    tone: NotificationTone,
    message: string,
    options: NotificationOptions,
    now: number,
  ): number | null {
    const key = options.dedupeKey ?? this.notificationKey(tone, message);
    const recent = this.recentNotifications.get(key);
    if (!recent || now - recent.createdAt >= NOTIFICATION_DEDUPE_WINDOW) return null;
    return this.toastsSignal().some((toast) => toast.id === recent.id) ? recent.id : null;
  }

  private rememberNotification(
    notification: ApplicationNotification,
    createdAt: number,
    dedupeKey?: string,
  ): void {
    this.recentNotifications.set(
      dedupeKey ?? this.notificationKey(notification.tone, notification.message),
      { id: notification.id, createdAt },
    );
  }

  private pruneRecentNotifications(now: number): void {
    for (const [key, recent] of this.recentNotifications) {
      if (now - recent.createdAt >= NOTIFICATION_DEDUPE_WINDOW) this.recentNotifications.delete(key);
    }
  }

  private notificationKey(tone: NotificationTone, message: string): string {
    return `${tone}\u0000${message}`;
  }

  private scheduleDismiss(notification: ApplicationNotification): void {
    if (notification.state === 'loading' || notification.duration === null) return;

    const timer = setTimeout(() => {
      this.dismissTimers.delete(notification.id);
      if (this.toastsSignal().some((toast) => toast.id === notification.id)) this.dismiss(notification.id);
    }, notification.duration);
    this.dismissTimers.set(notification.id, timer);
  }

  private clearDismissTimer(id: number): void {
    const timer = this.dismissTimers.get(id);
    if (timer === undefined) return;
    clearTimeout(timer);
    this.dismissTimers.delete(id);
  }
}
