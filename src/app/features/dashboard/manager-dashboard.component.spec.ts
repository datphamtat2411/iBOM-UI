import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { Chart } from 'chart.js';

import { ManagerDashboardStats } from './models/dashboard.models';
import { DashboardService } from './services/dashboard.service';
import { ManagerDashboardComponent } from './manager-dashboard.component';

describe('ManagerDashboardComponent', () => {
  let fixture: ComponentFixture<ManagerDashboardComponent>;
  let component: ManagerDashboardComponent;
  let dashboard: { getManagerStats: jasmine.Spy };
  let response$: Subject<ManagerDashboardStats>;

  const stats: ManagerDashboardStats = {
    totalProfiles: 10,
    completedProfiles: 6,
    primarySkillDistribution: {
      items: [
        { skillId: 1, skillName: 'Java', profileCount: 4 },
        { skillId: 2, skillName: 'Angular', profileCount: 2 },
      ],
      otherProfileCount: 3,
    },
    skillCategoryDistribution: {
      items: [
        { categoryId: 1, categoryCode: 'BACKEND', categoryName: 'Backend', profileCount: 3, percentage: 11 },
        { categoryId: null, categoryCode: null, categoryName: 'Uncategorized', profileCount: 2, percentage: 89 },
      ],
      otherProfileCount: 1,
    },
  };

  beforeEach(async () => {
    response$ = new Subject<ManagerDashboardStats>();
    dashboard = { getManagerStats: jasmine.createSpy('getManagerStats').and.returnValue(response$) };
    await TestBed.configureTestingModule({
      imports: [ManagerDashboardComponent],
      providers: [{ provide: DashboardService, useValue: dashboard }],
    }).compileComponents();

    fixture = TestBed.createComponent(ManagerDashboardComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => fixture.destroy());

  it('shows initial loading, surfaces a full API failure, and recovers on retry', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.state-panel')?.textContent).toContain('Loading Manager Dashboard');

    response$.error(new HttpErrorResponse({ status: 503, error: { message: 'Analytics unavailable' } }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.notice.error')?.textContent).toContain('Analytics unavailable');
    expect(fixture.nativeElement.querySelector('.retry-button')).not.toBeNull();

    dashboard.getManagerStats.and.returnValue(of(stats));
    (fixture.nativeElement.querySelector('.notice.error .btn') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(dashboard.getManagerStats).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.querySelector('#completed-profiles-title')?.textContent).toContain('Completed Profiles');
  });

  it('renders Completed Profiles safely when the eligible total is zero', () => {
    fixture.detectChanges();
    response$.next({ ...stats, totalProfiles: 0, completedProfiles: 0 });
    response$.complete();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(fixture.nativeElement.querySelector('.completion-count')?.textContent).toContain('0 / 0');
    expect(fixture.nativeElement.querySelector('.completion-percentage')?.textContent).toContain('0%');
    expect(text).toContain('0% of eligible Profiles');
    expect(text).not.toContain('NaN');
    expect(fixture.nativeElement.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('0');
  });

  it('keeps backend Main Skill ordering and includes the Others count', () => {
    fixture.detectChanges();
    response$.next(stats);
    response$.complete();
    fixture.detectChanges();

    const rows = Array.from(fixture.nativeElement.querySelectorAll('.analytics-panel:first-child .distribution-row')) as HTMLElement[];
    expect(rows.map((row) => row.querySelector('.distribution-label')?.textContent?.trim())).toEqual(['Java', 'Angular', 'Others']);
    expect(rows[2].textContent).toContain('3 Profiles');
  });

  it('renders Uncategorized and backend category percentages, deriving Others from category contributions', () => {
    fixture.detectChanges();
    response$.next(stats);
    response$.complete();
    fixture.detectChanges();

    const categoryRows = Array.from(fixture.nativeElement.querySelectorAll('.category-breakdown .distribution-row')) as HTMLElement[];
    expect(categoryRows[0].textContent).toContain('11%');
    expect(categoryRows[1].textContent).toContain('Uncategorized');
    expect(categoryRows[1].textContent).toContain('89%');
    expect(component.otherCategoryPercentage).toBeCloseTo(16.67, 2);
    expect(categoryRows[2].textContent).toContain('17%');
    expect(categoryRows[2].textContent).not.toContain('10%');
  });

  it('formats zero and malformed percentages safely as whole numbers', () => {
    expect(component.formatPercentage(0)).toBe('0%');
    expect(component.formatPercentage(Number.NaN)).toBe('0%');
    expect(component.formatPercentage(Number.POSITIVE_INFINITY)).toBe('0%');
  });

  it('shows the canonical empty-state message for both skill distributions', () => {
    fixture.detectChanges();
    response$.next({
      ...stats,
      primarySkillDistribution: { items: [], otherProfileCount: 0 },
      skillCategoryDistribution: { items: [], otherProfileCount: 0 },
    });
    response$.complete();
    fixture.detectChanges();

    const emptyStates = Array.from(fixture.nativeElement.querySelectorAll('.analytics-panel .empty-state')) as HTMLElement[];
    expect(emptyStates.length).toBe(2);
    expect(emptyStates.map((state) => state.textContent?.trim())).toEqual([
      'No skill data available.',
      'No skill data available.',
    ]);
  });

  it('prevents duplicate refreshes, retains data after refresh failure, and timestamps only successful responses', () => {
    fixture.detectChanges();
    response$.next(stats);
    response$.complete();
    fixture.detectChanges();
    const loadedAt = component.dataLoadedAt;

    const refresh$ = new Subject<ManagerDashboardStats>();
    dashboard.getManagerStats.and.returnValue(refresh$);
    component.refreshStats();
    component.refreshStats();
    expect(dashboard.getManagerStats).toHaveBeenCalledTimes(2);

    refresh$.error(new HttpErrorResponse({ status: 503, error: { message: 'Refresh unavailable' } }));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Refresh unavailable');
    expect(fixture.nativeElement.textContent).toContain('6 / 10');
    expect(component.dataLoadedAt).toBe(loadedAt);

    const refreshed = { ...stats, completedProfiles: 7 };
    dashboard.getManagerStats.and.returnValue(of(refreshed));
    component.refreshStats();
    fixture.detectChanges();
    expect(component.dataLoadedAt).not.toBe(loadedAt);
    expect(fixture.nativeElement.textContent).toContain('7 / 10');
  });

  it('keeps chart values accessible and updates and destroys chart instances safely', () => {
    fixture.detectChanges();
    response$.next(stats);
    response$.complete();
    fixture.detectChanges();

    const primaryChart = (component as unknown as { primarySkillChart: Chart<'bar'> | null }).primarySkillChart;
    const categoryChart = (component as unknown as { skillCategoryChart: Chart<'doughnut'> | null }).skillCategoryChart;
    expect(primaryChart).not.toBeNull();
    expect(categoryChart).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.primary-skills-chart')?.getAttribute('aria-label')).toContain('Java');
    expect(fixture.nativeElement.querySelector('.skill-categories-chart')?.getAttribute('aria-label')).toContain('Uncategorized');

    const update = spyOn(primaryChart!, 'update').and.callThrough();
    const destroy = spyOn(primaryChart!, 'destroy').and.callThrough();
    component.stats = { ...stats, completedProfiles: 7 };
    (component as unknown as { chartsNeedUpdate: boolean }).chartsNeedUpdate = true;
    fixture.detectChanges();
    expect(update).toHaveBeenCalled();

    fixture.destroy();
    expect(destroy).toHaveBeenCalled();
  });
});
