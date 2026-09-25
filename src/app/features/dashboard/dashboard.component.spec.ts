import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { MemberDashboardStats } from './models/dashboard.models';
import { DashboardService } from './services/dashboard.service';
import { ProfileDetail, ProfileSummary } from '../profile/models/profile.models';
import { ProfileContextService } from '../profile/services/profile-context.service';
import { ProfileService } from '../profile/services/profile.service';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let dashboardService: { getMemberStats: jasmine.Spy };
  let profileContext: {
    summaries: WritableSignal<ProfileSummary[]>;
    summariesLoading: WritableSignal<boolean>;
    summariesError: WritableSignal<unknown | null>;
    selectedId: WritableSignal<string | null>;
    detail: WritableSignal<ProfileDetail | null>;
    detailLoading: WritableSignal<boolean>;
    detailError: WritableSignal<unknown | null>;
    clearManagedContext: jasmine.Spy;
    loadSummariesAndResolveSelection: jasmine.Spy;
    loadDetail: jasmine.Spy;
    beginSelection: jasmine.Spy;
  };

  const firstSummary: ProfileSummary = {
    id: 1,
    profileName: 'Backend CV',
    firstName: 'A',
    lastName: 'User',
    jobTitle: 'Engineer',
    updatedAt: '2026-08-18T06:42:00Z',
  };
  const secondSummary: ProfileSummary = { ...firstSummary, id: 2, profileName: 'Frontend CV', jobTitle: 'Frontend Engineer' };

  function detailFor(summary: ProfileSummary, hasPreviewed = false): ProfileDetail {
    return {
      ...summary,
      yearsOfExperience: 5,
      personality: null,
      technicalSummary: null,
      hasPreviewed,
      version: 1,
      createdAt: '2026-01-01',
      lastExportedAt: null,
      preferredFileNameFormatId: null,
    };
  }

  function statsFor(summary: ProfileSummary, latestExportedAt: string | null = null): MemberDashboardStats {
    return {
      selectedProfile: summary,
      completeness: {
        percentage: 0,
        completed: false,
        sections: [
          { key: 'aboutMe', weight: 20, completed: false, validFieldCount: 0, fieldCount: 6 },
          { key: 'education', weight: 20, completed: true, hasQualifyingRecord: true },
          { key: 'skills', weight: 10, completed: false, hasQualifyingRecord: false },
        ],
      },
      latestExportedAt,
    };
  }

  function createFixture(): void {
    fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    dashboardService = { getMemberStats: jasmine.createSpy('getMemberStats').and.returnValue(of(statsFor(firstSummary))) };
    profileContext = {
      summaries: signal<ProfileSummary[]>([]),
      summariesLoading: signal(false),
      summariesError: signal<unknown | null>(null),
      selectedId: signal<string | null>(null),
      detail: signal<ProfileDetail | null>(null),
      detailLoading: signal(false),
      detailError: signal<unknown | null>(null),
      clearManagedContext: jasmine.createSpy('clearManagedContext'),
      loadSummariesAndResolveSelection: jasmine.createSpy('loadSummariesAndResolveSelection'),
      loadDetail: jasmine.createSpy('loadDetail'),
      beginSelection: jasmine.createSpy('beginSelection').and.callFake((profileId: string | null) => {
        profileContext.selectedId.set(profileId);
        profileContext.detail.set(null);
        profileContext.detailLoading.set(false);
        profileContext.detailError.set(null);
      }),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { user: signal({ id: 1, email: 'member@example.com', username: 'member', role: 'MEMBER' }) } },
        { provide: DashboardService, useValue: dashboardService },
        { provide: ProfileContextService, useValue: profileContext },
      ],
    }).compileComponents();
  });

  it('renders initial loading while own Profiles are unresolved', () => {
    profileContext.summariesLoading.set(true);
    createFixture();

    expect(fixture.nativeElement.querySelector('.workspace-state')?.textContent).toContain('Loading Profiles');
    expect(dashboardService.getMemberStats).not.toHaveBeenCalled();
  });

  it('renders the no-Profile state and navigates to Create Profile', () => {
    createFixture();
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);

    expect(fixture.nativeElement.querySelector('.empty-state')?.textContent).toContain('No Profiles yet');
    (fixture.nativeElement.querySelector('.empty-state .btn') as HTMLButtonElement).click();

    expect(router.navigate).toHaveBeenCalledWith(['/profiles/new']);
  });

  it('renders API completeness, section statuses, zero completeness, and Never exported', () => {
    profileContext.summaries.set([firstSummary]);
    profileContext.selectedId.set('1');
    profileContext.detail.set(detailFor(firstSummary, true));
    createFixture();

    const element = fixture.nativeElement as HTMLElement;
    expect(dashboardService.getMemberStats).toHaveBeenCalledWith('1');
    expect(element.querySelector('.metric')?.textContent).toContain('0%');
    expect(element.querySelector('.context-band')?.textContent).toContain('Never exported');
    expect(element.querySelector('.contribution-list')?.textContent).toContain('About Me');
    expect(element.querySelector('.contribution-list')?.textContent).toContain('0 / 6 fields');
    expect(element.querySelector('.contribution-list')?.textContent).toContain('Qualifying record present');
    expect(element.querySelector('.contribution-list')?.textContent).toContain('No qualifying record');
    expect(element.querySelector('.status.valid')?.textContent).toContain('Preview valid');
  });

  it('renders each section contribution from its actual completion', () => {
    const stats = statsFor(firstSummary);
    stats.completeness.percentage = 68;
    stats.completeness.sections = [
      { key: 'aboutMe', weight: 20, completed: false, validFieldCount: 4, fieldCount: 6 },
      { key: 'education', weight: 20, completed: false, hasQualifyingRecord: false },
      { key: 'language', weight: 15, completed: true, hasQualifyingRecord: true },
      { key: 'certificate', weight: 15, completed: false, hasQualifyingRecord: false },
      { key: 'project', weight: 20, completed: true, hasQualifyingRecord: true },
      { key: 'skills', weight: 10, completed: false, hasQualifyingRecord: false },
    ];
    dashboardService.getMemberStats.and.returnValue(of(stats));
    profileContext.summaries.set([firstSummary]);
    profileContext.selectedId.set('1');
    profileContext.detail.set(detailFor(firstSummary));
    createFixture();

    const rows = fixture.nativeElement.querySelectorAll('.contribution-row') as NodeListOf<HTMLElement>;
    const percentages = Array.from(rows)
      .map((row) => row.querySelector('strong')?.textContent?.trim() + ': ' + row.querySelector('.mono')?.textContent?.trim());

    expect(percentages).toEqual([
      'About Me: 13.33%',
      'Education: 0%',
      'Languages: 15%',
      'Certificates: 0%',
      'Projects: 20%',
      'Skills: 0%',
    ]);
  });

  it('renders API completeness rounded to the nearest whole percent', () => {
    const stats = statsFor(firstSummary);
    stats.completeness.percentage = 13.33;
    dashboardService.getMemberStats.and.returnValue(of(stats));
    profileContext.summaries.set([firstSummary]);
    profileContext.selectedId.set('1');
    profileContext.detail.set(detailFor(firstSummary));
    createFixture();

    const metric = fixture.nativeElement.querySelector('.metric') as HTMLElement;
    expect(metric.textContent?.trim()).toBe('13%');

    const renderPercentage = (percentage: number): string => {
      fixture.componentInstance.stats.update((current) => current && ({
        ...current,
        completeness: { ...current.completeness, percentage },
      }));
      fixture.detectChanges();
      return metric.textContent?.trim() ?? '';
    };

    expect(renderPercentage(83.4)).toBe('83%');
    expect(renderPercentage(83.5)).toBe('84%');
    expect(renderPercentage(0)).toBe('0%');
    expect(renderPercentage(100)).toBe('100%');
    expect(fixture.componentInstance.formatPercentage(null)).toBe('—');
    expect(fixture.componentInstance.formatPercentage(undefined)).toBe('—');
    expect(fixture.componentInstance.formatPercentage(Number.NaN)).toBe('—');
    expect(fixture.componentInstance.formatPercentage(Number.POSITIVE_INFINITY)).toBe('—');
  });

  it('uses selected Profile detail for Preview state and formats an export in ICT', () => {
    profileContext.summaries.set([firstSummary]);
    profileContext.selectedId.set('1');
    profileContext.detail.set(detailFor(firstSummary, false));
    dashboardService.getMemberStats.and.returnValue(of(statsFor(firstSummary, '2026-08-18T06:42:00Z')));
    createFixture();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.status.required')?.textContent).toContain('Preview required');
    expect(element.querySelector('.context-band')?.textContent).toContain('Aug 18, 2026');
    expect(element.querySelector('.context-band')?.textContent).not.toContain('Never exported');

    profileContext.detail.set(detailFor(firstSummary, true));
    fixture.detectChanges();
    expect(element.querySelector('.status.valid')?.textContent).toContain('Preview valid');
  });

  it('ignores stats returned for a previous selection and keeps Dashboard navigation local', () => {
    const firstStats = new Subject<MemberDashboardStats>();
    const secondStats = new Subject<MemberDashboardStats>();
    dashboardService.getMemberStats.and.returnValues(firstStats, secondStats);
    profileContext.summaries.set([firstSummary, secondSummary]);
    profileContext.selectedId.set('1');
    profileContext.detail.set(detailFor(firstSummary));
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    createFixture();

    const element = fixture.nativeElement as HTMLElement;
    (element.querySelectorAll('.profile-summary')[1] as HTMLButtonElement).click();
    firstStats.next(statsFor(firstSummary, '2026-01-01T00:00:00Z'));
    fixture.detectChanges();

    expect(profileContext.selectedId()).toBe('2');
    expect(dashboardService.getMemberStats).toHaveBeenCalledTimes(2);
    expect(element.querySelector('.context-band')?.textContent).not.toContain('2026');
    expect(router.navigate).not.toHaveBeenCalled();

    secondStats.next(statsFor(secondSummary));
    fixture.detectChanges();
    expect(element.querySelector('.context-band')?.textContent).toContain('Frontend CV');
  });

  it('shows Dashboard API failure and retries the current selection', () => {
    const firstRequest = new Subject<MemberDashboardStats>();
    const retryRequest = new Subject<MemberDashboardStats>();
    dashboardService.getMemberStats.and.returnValues(firstRequest, retryRequest);
    profileContext.summaries.set([firstSummary]);
    profileContext.selectedId.set('1');
    profileContext.detail.set(detailFor(firstSummary));
    createFixture();

    firstRequest.error(new Error('unavailable'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.notice.error')?.textContent).toContain('Dashboard unavailable');

    (fixture.nativeElement.querySelector('.notice.error .btn') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(dashboardService.getMemberStats).toHaveBeenCalledTimes(2);
    retryRequest.next(statsFor(firstSummary));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.notice.error')).toBeNull();
    expect(fixture.nativeElement.querySelector('.metric')?.textContent).toContain('0%');
  });

  it('uses summaries for My Profiles without loading stats or detail for every entry', () => {
    profileContext.summaries.set([firstSummary, secondSummary]);
    profileContext.selectedId.set('1');
    profileContext.detail.set(detailFor(firstSummary));
    createFixture();

    expect(fixture.nativeElement.querySelectorAll('.profile-summary').length).toBe(2);
    expect(dashboardService.getMemberStats).toHaveBeenCalledTimes(1);
    expect(dashboardService.getMemberStats).toHaveBeenCalledWith('1');
    expect(profileContext.loadDetail).not.toHaveBeenCalled();
  });
});

describe('DashboardComponent Profile context boundary', () => {
  let profiles: { list: jasmine.Spy; listForMember: jasmine.Spy; get: jasmine.Spy };
  let dashboardService: { getMemberStats: jasmine.Spy };
  let context: ProfileContextService;
  let fixture: ComponentFixture<DashboardComponent>;

  const ownSummaries: ProfileSummary[] = [
    { id: 1, profileName: 'Own Backend CV', firstName: 'Own', lastName: 'User', jobTitle: 'Engineer', updatedAt: '2026-08-18T06:42:00Z' },
    { id: 2, profileName: 'Own Frontend CV', firstName: 'Own', lastName: 'User', jobTitle: 'Frontend Engineer', updatedAt: '2026-08-18T06:42:00Z' },
  ];
  const managedSummary: ProfileSummary = { ...ownSummaries[0], id: 99, profileName: 'Managed CV' };

  function detailFor(summary: ProfileSummary, hasPreviewed = false): ProfileDetail {
    return {
      ...summary,
      yearsOfExperience: 5,
      personality: null,
      technicalSummary: null,
      hasPreviewed,
      version: 1,
      createdAt: '2026-01-01',
      lastExportedAt: null,
      preferredFileNameFormatId: null,
    };
  }

  function statsFor(profile: ProfileSummary): MemberDashboardStats {
    return {
      selectedProfile: profile,
      completeness: { percentage: 80, completed: true, sections: [] },
      latestExportedAt: null,
    };
  }

  function createFixture(): void {
    fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    const sessionEnded = new Subject<void>();
    profiles = {
      list: jasmine.createSpy('list').and.returnValue(of(ownSummaries)),
      listForMember: jasmine.createSpy('listForMember').and.returnValue(of([managedSummary])),
      get: jasmine.createSpy('get').and.callFake((profileId: string) => {
        if (profileId === '99') return of(detailFor(managedSummary));
        const ownProfile = ownSummaries.find((summary) => String(summary.id) === profileId);
        return of(detailFor(ownProfile ?? ownSummaries[0], profileId === '1'));
      }),
    };
    dashboardService = {
      getMemberStats: jasmine.createSpy('getMemberStats').and.callFake((profileId: string) => {
        const profile = ownSummaries.find((summary) => String(summary.id) === profileId) ?? ownSummaries[0];
        return of(statsFor(profile));
      }),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { user: signal({ id: 10, email: 'manager@example.com', username: 'manager', role: 'MANAGER' }), sessionEnded$: () => sessionEnded.asObservable() } },
        { provide: DashboardService, useValue: dashboardService },
        { provide: ProfileService, useValue: profiles },
        ProfileContextService,
      ],
    }).compileComponents();
    context = TestBed.inject(ProfileContextService);
  });

  it('clears managed Member context before resolving the retained own Profile and uses its detail for Preview', () => {
    context.summaries.set(ownSummaries);
    context.beginSelection('1');
    context.loadManagedMember({ id: 'managed-member', username: 'managed-user' }, '99');

    expect(context.managedMember()?.id).toBe('managed-member');
    expect(context.managedDetail()?.id).toBe(99);

    createFixture();

    expect(context.managedMember()).toBeNull();
    expect(context.managedSummaries()).toEqual([]);
    expect(context.managedSelectedId()).toBeNull();
    expect(context.selectedId()).toBe('1');
    expect(profiles.get.calls.allArgs().map(([profileId]) => profileId)).toEqual(['99', '1']);
    expect(context.detail()).toEqual(detailFor(ownSummaries[0], true));
    expect(fixture.componentInstance.selectedDetail()).toEqual(detailFor(ownSummaries[0], true));
    expect(fixture.componentInstance.previewState()).toBe('valid');
    expect(fixture.nativeElement.querySelector('.status.valid')?.textContent).toContain('Preview valid');

    (fixture.nativeElement.querySelectorAll('.profile-summary')[1] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(context.selectedId()).toBe('2');
    expect(context.detail()?.id).toBe(2);
    expect(fixture.componentInstance.previewState()).toBe('required');
    expect(profiles.get.calls.allArgs().map(([profileId]) => profileId)).toEqual(['99', '1', '2']);
  });

  it('loads the first own Profile on direct Dashboard entry when no selection exists', () => {
    createFixture();

    expect(context.managedMember()).toBeNull();
    expect(context.selectedId()).toBe('1');
    expect(profiles.list).toHaveBeenCalledTimes(1);
    expect(profiles.get).toHaveBeenCalledOnceWith('1');
    expect(context.detail()?.id).toBe(1);
    expect(fixture.componentInstance.previewState()).toBe('valid');
  });
});
