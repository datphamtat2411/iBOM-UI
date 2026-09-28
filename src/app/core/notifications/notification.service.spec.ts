import { fakeAsync, TestBed, tick } from '@angular/core/testing';

import {
  NOTIFICATION_DEFAULT_DURATIONS,
  NOTIFICATION_MAX_VISIBLE,
  NotificationService,
} from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [NotificationService] });
    service = TestBed.inject(NotificationService);
  });

  afterEach(() => service.clear());

  it('creates success, error, warning, and info notifications', () => {
    service.success('Saved', { duration: null });
    service.error('Could not save', { duration: null });
    service.warning('Review this value', { duration: null });
    service.info('Sync started', { duration: null });

    expect(service.toasts().map((toast) => toast.tone)).toEqual(['success', 'error', 'warning', 'info']);
    expect(service.notification()?.message).toBe('Sync started');
  });

  it('keeps multiple notifications in a bounded, deterministic stack', () => {
    const ids = Array.from({ length: NOTIFICATION_MAX_VISIBLE + 1 }, (_, index) =>
      service.info(`Notice ${index}`, { duration: null }),
    );

    expect(service.toasts().length).toBe(NOTIFICATION_MAX_VISIBLE);
    expect(service.toasts().map((toast) => toast.id)).toEqual(ids.slice(1));
    expect(service.toasts()[0].message).toBe('Notice 1');
  });

  it('keeps compatibility wrappers and supports targeted dismiss and clear', () => {
    const successId = service.showSuccess('Saved', { duration: null });
    const errorId = service.showError('Failed', { duration: null });

    service.dismiss(successId);
    expect(service.toasts().map((toast) => toast.id)).toEqual([errorId]);

    service.clear();
    expect(service.toasts()).toEqual([]);
    expect(service.notification()).toBeNull();
  });

  it('auto-dismisses a notification after its configured duration', fakeAsync(() => {
    service.success('Saved', { duration: 100 });

    tick(99);
    expect(service.toasts()).not.toHaveSize(0);
    tick(1);
    expect(service.toasts()).toEqual([]);
  }));

  it('keeps loading notifications persistent and updates them into final states', fakeAsync(() => {
    const successId = service.loading('Saving profile');
    const errorId = service.loading('Deleting profile');

    tick(10000);
    expect(service.toasts().map((toast) => toast.state)).toEqual(['loading', 'loading']);

    expect(service.update(successId, { tone: 'success', message: 'Profile saved' })).toBeTrue();
    expect(service.update(errorId, { tone: 'error', message: 'Profile could not be deleted' })).toBeTrue();
    expect(service.toasts().map((toast) => [toast.tone, toast.state])).toEqual([
      ['success', 'visible'],
      ['error', 'visible'],
    ]);
    service.clear();
  }));

  it('clears stale timers when an existing notification changes lifecycle', fakeAsync(() => {
    const id = service.success('Saving', { duration: 100 });
    tick(90);

    expect(service.update(id, { state: 'loading', message: 'Still saving' })).toBeTrue();
    tick(20);
    expect(service.toasts()).not.toHaveSize(0);

    expect(service.update(id, { tone: 'success', message: 'Saved' })).toBeTrue();
    tick(NOTIFICATION_DEFAULT_DURATIONS.success - 1);
    expect(service.toasts()).not.toHaveSize(0);
    tick(1);
    expect(service.toasts()).toEqual([]);
  }));

  it('suppresses rapid identical duplicates without merging different tones', () => {
    const firstErrorId = service.error('Could not save', { duration: null });
    const duplicateErrorId = service.error('Could not save', { duration: null });
    const infoId = service.info('Could not save', { duration: null });

    expect(duplicateErrorId).toBe(firstErrorId);
    expect(infoId).not.toBe(firstErrorId);
    expect(service.toasts()).toHaveSize(2);
  });
});
