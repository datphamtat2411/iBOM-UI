import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { ProfileDetail, ProfileSummary } from '../models/profile.models';
import { ProfileService } from './profile.service';
import { ProfileContextService } from './profile-context.service';

describe('ProfileContextService', () => {
  let service: ProfileContextService;
  let sessionEnded: Subject<void>;
  let profiles: { list: jasmine.Spy; get: jasmine.Spy; create: jasmine.Spy };
  const summary: ProfileSummary = { id: 1, profileName: 'Backend CV', firstName: 'A', lastName: 'User', jobTitle: 'Engineer', updatedAt: '2026-01-01' };
  const detail: ProfileDetail = { ...summary, yearsOfExperience: 5, personality: null, technicalSummary: null, hasPreviewed: false, version: 1, createdAt: '2026-01-01' };

  beforeEach(() => {
    sessionEnded = new Subject<void>();
    profiles = { list: jasmine.createSpy('list'), get: jasmine.createSpy('get'), create: jasmine.createSpy('create') };
    TestBed.configureTestingModule({
      providers: [
        ProfileContextService,
        { provide: ProfileService, useValue: profiles },
        { provide: AuthService, useValue: { sessionEnded$: () => sessionEnded.asObservable() } },
      ],
    });
    service = TestBed.inject(ProfileContextService);
  });

  it('resets all Profile state when the authenticated session ends', () => {
    const summaries = new Subject<ProfileSummary[]>();
    const details = new Subject<ProfileDetail>();
    profiles.list.and.returnValue(summaries);
    profiles.get.and.returnValue(details);
    service.loadSummaries();
    summaries.next([summary]);
    service.loadDetail('1');
    details.next(detail);

    sessionEnded.next();

    expect(service.summaries()).toEqual([]);
    expect(service.summariesError()).toBeNull();
    expect(service.summariesLoading()).toBeFalse();
    expect(service.selectedId()).toBeNull();
    expect(service.detail()).toBeNull();
    expect(service.detailError()).toBeNull();
    expect(service.detailLoading()).toBeFalse();
  });

  it('retries summary loading after a failed request', () => {
    const first = new Subject<ProfileSummary[]>();
    const second = new Subject<ProfileSummary[]>();
    profiles.list.and.returnValues(first, second);
    service.loadSummaries();
    first.error(new Error('unavailable'));
    service.loadSummaries();
    second.next([summary]);

    expect(profiles.list).toHaveBeenCalledTimes(2);
    expect(service.summaries()).toEqual([summary]);
    expect(service.summariesError()).toBeNull();
  });

  it('invalidates summary state without accepting the superseded response', () => {
    const first = new Subject<ProfileSummary[]>();
    const second = new Subject<ProfileSummary[]>();
    profiles.list.and.returnValues(first, second);
    service.loadSummaries();
    service.invalidateSummaries();
    service.loadSummaries();
    first.next([summary]);
    second.next([{ ...summary, id: 2, profileName: 'Frontend CV' }]);

    expect(service.summaries()).toEqual([{ ...summary, id: 2, profileName: 'Frontend CV' }]);
  });

  it('ignores stale detail successes and errors during rapid switching', () => {
    const first = new Subject<ProfileDetail>();
    const second = new Subject<ProfileDetail>();
    profiles.get.and.returnValues(first, second);
    service.loadDetail('1');
    service.loadDetail('2');
    first.next(detail);
    first.error(new Error('stale'));
    second.next({ ...detail, id: 2, profileName: 'Frontend CV' });

    expect(service.selectedId()).toBe('2');
    expect(service.detail()?.profileName).toBe('Frontend CV');
    expect(service.detailError()).toBeNull();
  });

  it('replaces the selected detail and matching summary after an update', () => {
    service.summaries.set([summary, { ...summary, id: 2, profileName: 'Frontend CV' }]);
    service.beginSelection('1');
    const updated = { ...detail, firstName: 'Updated', version: 2, hasPreviewed: false, updatedAt: '2026-01-02' };

    service.replaceDetail(updated);

    expect(service.selectedId()).toBe('1');
    expect(service.detail()).toEqual(updated);
    expect(service.summaries()).toEqual([{ ...summary, firstName: 'Updated', updatedAt: '2026-01-02' }, { ...summary, id: 2, profileName: 'Frontend CV' }]);
  });

  it('refreshes summaries and selects the newly created Profile', () => {
    const refreshed = new Subject<ProfileSummary[]>();
    profiles.list.and.returnValue(refreshed);
    service.refreshSummariesAndSelect(2).subscribe();
    refreshed.next([summary, { ...summary, id: 2, profileName: 'Frontend CV' }]);

    expect(service.summaries().map((item) => item.id)).toEqual([1, 2]);
    expect(service.selectedId()).toBe('2');
  });
});
