import { HttpErrorResponse } from '@angular/common/http';
import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';

import { ApiErrorResponse } from '../../core/http/api.models';
import {
  ManagerDashboardStats,
  PrimarySkillItem,
  SkillCategoryItem,
} from './models/dashboard.models';
import { DashboardService } from './services/dashboard.service';

Chart.register(ArcElement, BarController, BarElement, CategoryScale, DoughnutController, LinearScale, Tooltip, Legend);

interface DistributionRow {
  label: string;
  profileCount: number;
}

interface CategoryRow extends DistributionRow {
  percentage: number;
}

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  templateUrl: './manager-dashboard.component.html',
  styleUrl: './manager-dashboard.component.scss',
})
export class ManagerDashboardComponent implements OnInit, AfterViewChecked, OnDestroy {
  private readonly dashboardService = inject(DashboardService);
  private readonly countFormatter = new Intl.NumberFormat('en-US');
  private readonly percentageFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
  private readonly timestampFormatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  });

  @ViewChild('primarySkillsCanvas') private primarySkillsCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('skillCategoriesCanvas') private skillCategoriesCanvas?: ElementRef<HTMLCanvasElement>;

  stats: ManagerDashboardStats | null = null;
  loading = false;
  hasLoaded = false;
  loadErrorMessage = '';
  dataLoadedAt: Date | null = null;

  private chartsNeedUpdate = false;
  private primarySkillChart: Chart<'bar'> | null = null;
  private skillCategoryChart: Chart<'doughnut'> | null = null;

  ngOnInit(): void {
    this.loadStats();
  }

  ngAfterViewChecked(): void {
    if (!this.chartsNeedUpdate) return;
    this.chartsNeedUpdate = false;
    this.updateCharts();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  loadStats(): void {
    if (this.loading) return;

    this.loading = true;
    this.loadErrorMessage = '';

    this.dashboardService.getManagerStats().subscribe({
      next: (stats) => {
        this.stats = stats;
        this.hasLoaded = true;
        this.loading = false;
        this.dataLoadedAt = new Date();
        this.chartsNeedUpdate = true;
      },
      error: (error: unknown) => {
        this.loading = false;
        this.loadErrorMessage = this.backendErrorMessage(error) ?? 'Unable to load Manager Dashboard analytics right now. Please try again.';
      },
    });
  }

  retryStats(): void {
    this.loadStats();
  }

  refreshStats(): void {
    this.loadStats();
  }

  get completedProfilesCount(): number {
    return this.safeNumber(this.stats?.completedProfiles);
  }

  get totalProfilesCount(): number {
    return this.safeNumber(this.stats?.totalProfiles);
  }

  get completedPercentage(): number {
    const total = this.totalProfilesCount;
    if (total <= 0) return 0;

    const completed = this.completedProfilesCount;
    return Math.min(100, Math.max(0, (completed / total) * 100));
  }

  get primarySkillRows(): DistributionRow[] {
    const distribution = this.stats?.primarySkillDistribution;
    if (!distribution) return [];

    const rows = distribution.items.map((item) => this.primarySkillRow(item));
    const otherProfileCount = this.safeNumber(distribution.otherProfileCount);
    if (otherProfileCount > 0) rows.push({ label: 'Others', profileCount: otherProfileCount });
    return rows;
  }

  get skillCategoryRows(): CategoryRow[] {
    const distribution = this.stats?.skillCategoryDistribution;
    if (!distribution) return [];

    const rows = distribution.items.map((item) => this.skillCategoryRow(item));
    const otherProfileCount = this.safeNumber(distribution.otherProfileCount);
    if (otherProfileCount > 0) {
      rows.push({ label: 'Others', profileCount: otherProfileCount, percentage: this.otherCategoryPercentage });
    }
    return rows;
  }

  get otherCategoryPercentage(): number {
    const distribution = this.stats?.skillCategoryDistribution;
    if (!distribution) return 0;

    const returnedCategoryCount = distribution.items.reduce(
      (total, item) => total + this.safeNumber(item.profileCount),
      0,
    );
    const otherProfileCount = this.safeNumber(distribution.otherProfileCount);
    const totalCategoryContributions = returnedCategoryCount + otherProfileCount;
    return totalCategoryContributions > 0 ? (otherProfileCount / totalCategoryContributions) * 100 : 0;
  }

  get hasPrimarySkillData(): boolean {
    return this.primarySkillRows.length > 0;
  }

  get hasSkillCategoryData(): boolean {
    return this.skillCategoryRows.length > 0;
  }

  get primarySkillChartAriaLabel(): string {
    if (!this.hasPrimarySkillData) return 'Main Skills chart has no data.';
    return `Main Skills chart: ${this.primarySkillRows.map((row) => `${row.label}, ${this.formatCount(row.profileCount)} Profiles`).join('; ')}.`;
  }

  get skillCategoryChartAriaLabel(): string {
    if (!this.hasSkillCategoryData) return 'Skill Distribution chart has no data.';
    return `Skill Distribution chart: ${this.skillCategoryRows.map((row) => `${row.label}, ${this.formatCount(row.profileCount)} Profiles, ${this.formatPercentage(row.percentage)}`).join('; ')}.`;
  }

  get dataLoadedLabel(): string {
    return this.dataLoadedAt ? this.timestampFormatter.format(this.dataLoadedAt) : 'Not loaded';
  }

  formatCount(value: number): string {
    return this.countFormatter.format(this.safeNumber(value));
  }

  formatPercentage(value: number): string {
    return `${this.percentageFormatter.format(this.safeNumber(value))}%`;
  }

  categoryLabel(item: SkillCategoryItem): string {
    return item.categoryName?.trim() || 'Uncategorized';
  }

  private primarySkillRow(item: PrimarySkillItem): DistributionRow {
    return { label: item.skillName, profileCount: this.safeNumber(item.profileCount) };
  }

  private skillCategoryRow(item: SkillCategoryItem): CategoryRow {
    return {
      label: this.categoryLabel(item),
      profileCount: this.safeNumber(item.profileCount),
      percentage: this.safeNumber(item.percentage),
    };
  }

  private updateCharts(): void {
    this.updatePrimarySkillChart();
    this.updateSkillCategoryChart();
  }

  private updatePrimarySkillChart(): void {
    const canvas = this.primarySkillsCanvas?.nativeElement;
    const rows = this.primarySkillRows;
    if (!canvas || !rows.length) {
      this.destroyPrimarySkillChart();
      return;
    }

    if (!this.primarySkillChart || this.primarySkillChart.canvas !== canvas) {
      this.destroyPrimarySkillChart();
      try {
        this.primarySkillChart = new Chart(canvas, {
          type: 'bar',
          data: {
            labels: rows.map((row) => row.label),
            datasets: [{
              data: rows.map((row) => row.profileCount),
              backgroundColor: '#1e4785',
              borderColor: '#17191d',
              borderWidth: 1,
              borderRadius: 2,
              barThickness: 22,
            }],
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
              legend: { display: false },
            },
            scales: {
              x: {
                beginAtZero: true,
                ticks: { precision: 0, color: '#6b675f' },
                grid: { color: '#ece8de' },
              },
              y: {
                ticks: { color: '#17191d' },
                grid: { display: false },
              },
            },
          },
        });
      } catch {
        this.primarySkillChart = null;
      }
      return;
    }

    this.primarySkillChart.data.labels = rows.map((row) => row.label);
    this.primarySkillChart.data.datasets[0].data = rows.map((row) => row.profileCount);
    this.primarySkillChart.update();
  }

  private updateSkillCategoryChart(): void {
    const canvas = this.skillCategoriesCanvas?.nativeElement;
    const rows = this.skillCategoryRows;
    if (!canvas || !rows.length) {
      this.destroySkillCategoryChart();
      return;
    }

    if (!this.skillCategoryChart || this.skillCategoryChart.canvas !== canvas) {
      this.destroySkillCategoryChart();
      try {
        this.skillCategoryChart = new Chart(canvas, {
          type: 'doughnut',
          data: {
            labels: rows.map((row) => row.label),
            datasets: [{
              data: rows.map((row) => row.profileCount),
              backgroundColor: ['#1e4785', '#d85a18', '#2a7347', '#8b6f47', '#6b675f', '#a62d25', '#5e7094', '#c58b63'],
              borderColor: '#f9f7f1',
              borderWidth: 3,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            cutout: '62%',
            plugins: {
              legend: { display: false },
            },
          },
        });
      } catch {
        this.skillCategoryChart = null;
      }
      return;
    }

    this.skillCategoryChart.data.labels = rows.map((row) => row.label);
    this.skillCategoryChart.data.datasets[0].data = rows.map((row) => row.profileCount);
    this.skillCategoryChart.update();
  }

  private destroyCharts(): void {
    this.destroyPrimarySkillChart();
    this.destroySkillCategoryChart();
  }

  private destroyPrimarySkillChart(): void {
    this.primarySkillChart?.destroy();
    this.primarySkillChart = null;
  }

  private destroySkillCategoryChart(): void {
    this.skillCategoryChart?.destroy();
    this.skillCategoryChart = null;
  }

  private backendErrorMessage(error: unknown): string | null {
    if (!(error instanceof HttpErrorResponse) || !error.error || typeof error.error !== 'object') return null;
    const message = (error.error as ApiErrorResponse).message;
    return typeof message === 'string' && message.trim() ? message.trim() : null;
  }

  private safeNumber(value: number | null | undefined): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }
}
