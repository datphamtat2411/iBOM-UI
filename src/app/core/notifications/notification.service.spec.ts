import { fakeAsync, TestBed, tick } from '@angular/core/testing';

import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [NotificationService] });
    service = TestBed.inject(NotificationService);
  });

  it('publishes one success notification and auto-dismisses it deterministically', fakeAsync(() => {
    service.showSuccess('Project added successfully.');

    expect(service.notification()).toEqual(jasmine.objectContaining({ message: 'Project added successfully.', tone: 'success' }));
    tick(4999);
    expect(service.notification()).not.toBeNull();
    tick(1);
    expect(service.notification()).toBeNull();
  }));

  it('replaces rapid notifications and resets the dismissal window', fakeAsync(() => {
    service.showSuccess('Education added successfully.');
    tick(4000);
    service.showSuccess('Language added successfully.');

    expect(service.notification()?.message).toBe('Language added successfully.');
    tick(4999);
    expect(service.notification()?.message).toBe('Language added successfully.');
    tick(1);
    expect(service.notification()).toBeNull();
  }));

  it('publishes an error notification and auto-dismisses it deterministically', fakeAsync(() => {
    service.showError('You do not have permission to access Member Management.');

    expect(service.notification()).toEqual(jasmine.objectContaining({ message: 'You do not have permission to access Member Management.', tone: 'error' }));
    tick(4999);
    expect(service.notification()).not.toBeNull();
    tick(1);
    expect(service.notification()).toBeNull();
  }));
});
