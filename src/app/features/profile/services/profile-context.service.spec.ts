import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { ProfileDetail, ProfileSummary } from '../models/profile.models';
import { ProfileService } from './profile.service';
import { ProfileContextService } from './profile-context.service';

describe('ProfileContextService', () => {
  let service: ProfileContextService;
  let sessionEnded: Subject<void>;
  let profiles: { list: jasmine.Spy; listForMember: jasmine.Spy; get: jasmine.Spy; create: jasmine.Spy };
  const summary: ProfileSummary = { id: 1, profileName: 'Backend CV', firstName: 'A', lastName: 'User', jobTitle: 'Engineer', updatedAt: '2026-01-01' };
  const detail: ProfileDetail = { ...summary, yearsOfExperience: 5, personality: null, technicalSummary: null, hasPreviewed: false, version: 1, createdAt: '2026-01-01', lastExportedAt: null, preferredFileNameFormatId: null };
  const managedSummary: ProfileSummary = { ...summary, id: 2, profileName: 'Managed CV' };
  const managedDetail: ProfileDetail = { ...detail, id: 2, profileName: 'Managed CV' };

  beforeEach(() => {
    sessionEnded = new Subject<void>();
    profiles = { list: jasmine.createSpy('list'), listForMember: jasmine.createSpy('listForMember'), get: jasmine.createSpy('get'), create: jasmine.createSpy('create') };
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

  it('keeps own and managed summaries and selections isolated', () => {
    const ownSummaries = new Subject<ProfileSummary[]>();
    const managedSummaries = new Subject<ProfileSummary[]>();
    profiles.list.and.returnValue(ownSummaries);
    profiles.listForMember.and.returnValue(managedSummaries);
    profiles.get.and.returnValue(of(managedDetail));

    service.loadSummaries();
    ownSummaries.next([summary]);
    service.beginSelection('1');
    service.loadManagedMember({ id: 'member-1', username: 'managed-user' });
    managedSummaries.next([managedSummary]);

    expect(service.summaries()).toEqual([summary]);
    expect(service.selectedId()).toBe('1');
    expect(service.managedMember()?.id).toBe('member-1');
    expect(service.managedSummaries()).toEqual([managedSummary]);
    expect(service.managedSelectedId()).toBe('2');
    expect(profiles.list).toHaveBeenCalledTimes(1);
    expect(profiles.listForMember).toHaveBeenCalledWith('member-1');
  });

  it('loads the authoritative managed list before selecting, replaces Member context, and clears stale detail on Profile switch', () => {
    const firstList = new Subject<ProfileSummary[]>();
    const firstDetail = new Subject<ProfileDetail>();
    const secondDetail = new Subject<ProfileDetail>();
    profiles.listForMember.and.returnValue(firstList);
    profiles.get.and.returnValues(firstDetail, secondDetail);

    service.loadManagedMember({ id: 10, username: 'first-member' }, '2');
    firstList.next([{ ...managedSummary, id: 2 }, { ...managedSummary, id: 3, profileName: 'Second Managed CV' }]);
    expect(profiles.get).toHaveBeenCalledWith('2');
    firstDetail.next({ ...managedDetail, id: 2 });
    expect(service.managedDetail()?.id).toBe(2);

    service.selectManagedProfile('3');
    expect(service.managedSelectedId()).toBe('3');
    expect(service.managedDetail()).toBeNull();
    expect(service.managedMember()?.username).toBe('first-member');
    expect(profiles.get).toHaveBeenCalledWith('3');
    secondDetail.next({ ...managedDetail, id: 3, profileName: 'Second Managed CV' });
    expect(service.managedDetail()?.id).toBe(3);

    const replacementList = new Subject<ProfileSummary[]>();
    profiles.listForMember.and.returnValue(replacementList);
    service.loadManagedMember({ id: 11, username: 'second-member' });
    expect(service.managedMember()?.id).toBe('11');
    expect(service.managedSummaries()).toEqual([]);
    expect(service.managedDetail()).toBeNull();
    replacementList.next([]);
    expect(service.managedSelectedId()).toBeNull();
  });

  it('keeps zero managed Profiles unselected and marks an unavailable route Profile without falling back to own context', () => {
    profiles.list.and.returnValue(of([summary]));
    profiles.listForMember.and.returnValue(of([managedSummary]));
    profiles.get.and.returnValue(of(managedDetail));
    service.loadSummaries();
    service.beginSelection('1');

    service.loadManagedMember({ id: 10 }, 'missing');

    expect(service.managedSelectedId()).toBe('missing');
    expect(service.managedProfileMissing()).toBeTrue();
    expect(service.managedDetail()).toBeNull();
    expect(service.selectedId()).toBe('1');
    expect(profiles.get).not.toHaveBeenCalled();
  });

  it('clears managed context when the authenticated session ends', () => {
    profiles.listForMember.and.returnValue(of([managedSummary]));
    profiles.get.and.returnValue(of(managedDetail));
    service.loadManagedMember({ id: 10, username: 'managed-user' });

    sessionEnded.next();

    expect(service.managedMember()).toBeNull();
    expect(service.managedSummaries()).toEqual([]);
    expect(service.managedSelectedId()).toBeNull();
    expect(service.managedDetail()).toBeNull();
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

  it('retains a valid own-Profile selection when Dashboard context loads', () => {
    profiles.list.and.returnValue(of([summary, { ...summary, id: 2, profileName: 'Frontend CV' }]));
    service.beginSelection('2');

    service.loadSummariesAndResolveSelection();

    expect(service.selectedId()).toBe('2');
  });

  it('falls back to the first own Profile when Dashboard selection is unavailable', () => {
    profiles.list.and.returnValue(of([summary, { ...summary, id: 2, profileName: 'Frontend CV' }]));
    service.beginSelection('missing');

    service.loadSummariesAndResolveSelection();

    expect(service.selectedId()).toBe('1');
  });

  it('clears own-Profile selection when Dashboard context has no Profiles', () => {
    profiles.list.and.returnValue(of([summary]));
    service.beginSelection('1');
    profiles.list.and.returnValue(of([]));

    service.invalidateSummaries();
    service.loadSummariesAndResolveSelection();

    expect(service.selectedId()).toBeNull();
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

  it('synchronizes a successful section mutation version and invalidates the preview', () => {
    service.beginSelection('1');
    service.detail.set({ ...detail, hasPreviewed: true, version: 4 });

    expect(service.applyMutationVersion('1', 5)).toBeTrue();
    expect(service.detail()).toEqual({ ...detail, hasPreviewed: false, version: 5 });
  });

  it('publishes replaced Profile detail as the authority for Preview validity', () => {
    service.beginSelection('1');
    service.detail.set({ ...detail, hasPreviewed: true, version: 4 });
    const updated = { ...detail, version: 5, hasPreviewed: false };

    service.replaceDetail(updated);

    expect(service.detail()).toEqual(updated);
    expect(service.detail()?.hasPreviewed).toBeFalse();
    expect(service.detail()?.version).toBe(5);
  });

  it('ignores a section mutation returned for a Profile that is no longer selected', () => {
    service.beginSelection('1');
    service.detail.set({ ...detail, hasPreviewed: true, version: 4 });

    expect(service.applyMutationVersion('2', 9)).toBeFalse();
    expect(service.detail()).toEqual({ ...detail, hasPreviewed: true, version: 4 });
  });

  it('refreshes summaries and selects the newly created Profile', () => {
    const refreshed = new Subject<ProfileSummary[]>();
    profiles.list.and.returnValue(refreshed);
    service.refreshSummariesAndSelect(2).subscribe();
    refreshed.next([summary, { ...summary, id: 2, profileName: 'Frontend CV' }]);

    expect(service.summaries().map((item) => item.id)).toEqual([1, 2]);
    expect(service.selectedId()).toBe('2');
  });

  it('records and propagates a failed summary refresh without selecting the copied Profile', () => {
    const refreshed = new Subject<ProfileSummary[]>();
    const failure = new Error('unavailable');
    const onError = jasmine.createSpy('onError');
    profiles.list.and.returnValue(refreshed);

    service.refreshSummariesAndSelect(2).subscribe({ error: onError });
    refreshed.error(failure);

    expect(service.summariesError()).toBe(failure);
    expect(service.summariesLoading()).toBeFalse();
    expect(service.selectedId()).toBeNull();
    expect(onError).toHaveBeenCalledWith(failure);
  });

  it('clears deleted detail state and selects the first Profile in refreshed backend order', () => {
    const refreshed = new Subject<ProfileSummary[]>();
    const remaining = { ...summary, id: 2, profileName: 'Frontend CV' };
    profiles.list.and.returnValue(refreshed);
    service.beginSelection('1');
    service.detail.set(detail);

    service.refreshSummariesAndSelectFirst().subscribe();

    expect(service.summaries()).toEqual([]);
    expect(service.selectedId()).toBeNull();
    expect(service.detail()).toBeNull();
    refreshed.next([remaining, summary]);

    expect(service.summaries()).toEqual([remaining, summary]);
    expect(service.selectedId()).toBe('2');
    expect(service.detail()).toBeNull();
  });

  it('refreshes managed summaries and selected detail through Member-scoped APIs only', () => {
    profiles.listForMember.and.returnValue(of([managedSummary]));
    profiles.get.and.returnValue(of({ ...managedDetail, version: 2, hasPreviewed: false }));
    service.loadManagedMember({ id: 10, username: 'managed-user' });
    service.refreshManagedProfile('2').subscribe();

    expect(profiles.list).not.toHaveBeenCalled();
    expect(profiles.listForMember).toHaveBeenCalledWith('10');
    expect(profiles.get).toHaveBeenCalledWith('2');
    expect(service.managedSummaries()).toEqual([managedSummary]);
    expect(service.managedDetail()?.version).toBe(2);
  });

  it('waits for a managed Profile list before resolving a direct Profile editor load', () => {
    const summaries = new Subject<ProfileSummary[]>();
    const loaded = jasmine.createSpy('loaded');
    profiles.listForMember.and.returnValue(summaries);
    profiles.get.and.returnValue(of(managedDetail));

    service.loadManagedProfile({ id: 10 }, '2').subscribe(loaded);
    expect(profiles.get).not.toHaveBeenCalled();

    summaries.next([managedSummary]);

    expect(profiles.get).toHaveBeenCalledWith('2');
    expect(loaded).toHaveBeenCalledWith(managedDetail);
  });

  it('refreshes managed Profile deletion state and selects the remaining active Profile', () => {
    const remaining = { ...managedSummary, id: 3, profileName: 'Remaining Managed CV' };
    profiles.listForMember.and.returnValues(of([managedSummary]), of([remaining]));
    profiles.get.and.returnValues(of(managedDetail), of({ ...managedDetail, id: 3, profileName: remaining.profileName }));
    service.loadManagedMember({ id: 10, username: 'managed-user' });
    service.refreshManagedSummariesAndSelectFirst().subscribe();

    expect(profiles.list).not.toHaveBeenCalled();
    expect(profiles.listForMember).toHaveBeenCalledWith('10');
    expect(service.managedSummaries()).toEqual([remaining]);
    expect(service.managedSelectedId()).toBe('3');
    expect(service.managedDetail()?.id).toBe(3);
  });
});
