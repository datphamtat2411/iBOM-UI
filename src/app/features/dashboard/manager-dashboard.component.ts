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

interface ChartTheme {
  text: string;
  muted: string;
  canvas: string;
  border: string;
  borderSubtle: string;
  information: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  focus: string;
  fontSans: string;
  fontMono: string;
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
  private readonly percentageFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
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

  get primaryChartHeight(): number {
    const rowCount = this.primarySkillRows.length;
    return Math.min(420, Math.max(200, rowCount * 42 + 52));
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

  distributionColor(index: number): string {
    const theme = this.chartTheme();
    const palette = this.chartPalette(theme);
    return palette[index % palette.length];
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
        const theme = this.chartTheme();
        this.primarySkillChart = new Chart(canvas, {
          type: 'bar',
          data: {
            labels: rows.map((row) => row.label),
            datasets: [{
              data: rows.map((row) => row.profileCount),
              backgroundColor: theme.information,
              borderColor: theme.text,
              borderWidth: 1,
              borderRadius: 4,
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
              tooltip: this.chartTooltip(theme),
            },
            scales: {
              x: {
                beginAtZero: true,
                ticks: { precision: 0, color: theme.muted, font: { family: theme.fontMono } },
                grid: { color: theme.borderSubtle },
              },
              y: {
                ticks: { color: theme.text, font: { family: theme.fontSans } },
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
        const theme = this.chartTheme();
        const palette = this.chartPalette(theme);
        this.skillCategoryChart = new Chart(canvas, {
          type: 'doughnut',
          data: {
            labels: rows.map((row) => row.label),
            datasets: [{
              data: rows.map((row) => row.profileCount),
              backgroundColor: palette,
              borderColor: theme.canvas,
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
              tooltip: this.chartTooltip(theme),
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

  private chartTheme(): ChartTheme {
    return {
      text: this.readCssToken('--ibom-color-text', '#17191d'),
      muted: this.readCssToken('--ibom-color-text-muted', '#6b675f'),
      canvas: this.readCssToken('--ibom-color-canvas', '#f9f7f1'),
      border: this.readCssToken('--ibom-color-border', '#d8d2c4'),
      borderSubtle: this.readCssToken('--ibom-color-border-subtle', '#e8e3d9'),
      information: this.readCssToken('--ibom-color-information', '#1e4785'),
      accent: this.readCssToken('--ibom-color-accent', '#d85a18'),
      success: this.readCssToken('--ibom-color-success', '#2a7347'),
      warning: this.readCssToken('--ibom-color-warning', '#8b5d08'),
      error: this.readCssToken('--ibom-color-error', '#b42318'),
      focus: this.readCssToken('--ibom-color-focus', '#b94b13'),
      fontSans: this.readCssToken('--ibom-font-sans', 'system-ui, sans-serif'),
      fontMono: this.readCssToken('--ibom-font-mono', 'ui-monospace, monospace'),
    };
  }

  private chartPalette(theme: ChartTheme): string[] {
    return [theme.information, theme.accent, theme.success, theme.warning, theme.muted, theme.error, theme.focus, theme.border];
  }

  private chartTooltip(theme: ChartTheme): object {
    return {
      backgroundColor: theme.text,
      titleColor: theme.canvas,
      bodyColor: theme.canvas,
      borderColor: theme.border,
      borderWidth: 1,
      titleFont: { family: theme.fontSans, weight: 600 },
      bodyFont: { family: theme.fontSans },
      padding: 10,
      displayColors: true,
    };
  }

  private readCssToken(name: string, fallback: string, seen = new Set<string>()): string {
    if (seen.has(name) || typeof document === 'undefined') return fallback;
    seen.add(name);

    const styles = document.defaultView?.getComputedStyle(document.documentElement);
    const value = styles?.getPropertyValue(name).trim();
    if (!value) return fallback;

    const alias = value.match(/^var\((--[\w-]+)(?:,\s*(.+))?\)$/);
    if (alias) return this.readCssToken(alias[1], alias[2]?.trim() || fallback, seen);
    return value;
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
