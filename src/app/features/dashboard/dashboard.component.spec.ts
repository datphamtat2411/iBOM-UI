import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { MemberDashboardStats } from './models/dashboard.models';
import { DashboardService } from './services/dashboard.service';
import { ProfileDetail, ProfileSummary } from '../profile/models/profile.models';
import { ProfileContextService } from '../profile/services/profile-context.service';
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

  it('renders API completeness with up to two decimal places', () => {
    const stats = statsFor(firstSummary);
    stats.completeness.percentage = 13.33;
    dashboardService.getMemberStats.and.returnValue(of(stats));
    profileContext.summaries.set([firstSummary]);
    profileContext.selectedId.set('1');
    profileContext.detail.set(detailFor(firstSummary));
    createFixture();

    expect(fixture.nativeElement.querySelector('.metric')?.textContent).toContain('13.33%');
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
