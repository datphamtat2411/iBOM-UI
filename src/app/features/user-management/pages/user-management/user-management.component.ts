import { Component, OnInit, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { ApiErrorResponse } from '../../../../core/http/api.models';
import { NotificationService } from '../../../../core/notifications/notification.service';
import {
  AppliedUserFilter,
  UserFilterDraft,
  UserPage,
  UserRole,
  UserStatus,
  UserSummary,
} from '../../models/user-management.models';
import { UserManagementService } from '../../services/user-management.service';
import { AccountStatusConfirmationComponent, UserStatusChangedEvent } from '../../components/account-status-confirmation/account-status-confirmation.component';
import { ManagedUserCreationComponent } from '../../components/managed-user-creation/managed-user-creation.component';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [ManagedUserCreationComponent, AccountStatusConfirmationComponent],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss',
})
export class UserManagementComponent implements OnInit {
  private readonly userService = inject(UserManagementService);
  private readonly notifications = inject(NotificationService);

  readonly pageSize = 10;
  readonly roleOptions: ReadonlyArray<{ value: UserRole; label: string }> = [
    { value: 'MEMBER', label: 'Member' },
    { value: 'MANAGER', label: 'Manager' },
    { value: 'ADMIN', label: 'Admin' },
  ];

  filterDraft: UserFilterDraft = this.emptyFilterDraft();
  appliedFilter: AppliedUserFilter | null = null;
  users: UserSummary[] = [];
  currentPage = 0;
  totalPages = 0;
  totalElements = 0;
  loading = false;
  hasLoaded = false;
  loadErrorMessage = '';
  pageMessage = '';
  private loadGeneration = 0;

  ngOnInit(): void {
    this.loadUsers(0);
  }

  get searchDraft(): string {
    return this.filterDraft.search;
  }

  set searchDraft(value: string) {
    this.setSearchDraft(value);
  }

  get roleDraft(): UserRole[] {
    return this.filterDraft.roles;
  }

  get filtersApplied(): boolean {
    return this.appliedFilter !== null;
  }

  get filtering(): boolean {
    return this.loading && this.filtersApplied;
  }

  get canResetFilters(): boolean {
    return this.filtersApplied || this.hasDraftFilters();
  }

  get appliedSearchDescription(): string {
    const filter = this.appliedFilter;
    if (!filter) return '';

    const parts: string[] = [];
    if (filter.search) parts.push(`Username/email: ${filter.search}`);
    if (filter.roles.length) parts.push(`Roles: ${filter.roles.join(', ')}`);
    return parts.join(' · ') || 'All Users';
  }

  loadUsers(page = this.currentPage): void {
    const requestedPage = Math.max(0, page);
    const generation = ++this.loadGeneration;
    const filter = this.appliedFilter;
    this.currentPage = requestedPage;
    this.loading = true;
    this.hasLoaded = false;
    this.loadErrorMessage = '';
    this.pageMessage = '';
    this.users = [];
    this.totalPages = 0;
    this.totalElements = 0;

    this.userService.list(requestedPage, this.pageSize, filter?.search ?? '', filter?.roles ?? []).subscribe({
      next: (result: UserPage) => {
        if (generation !== this.loadGeneration) return;
        this.setResult(result, requestedPage);
      },
      error: (error: unknown) => {
        if (generation !== this.loadGeneration) return;
        this.loading = false;
        this.loadErrorMessage = this.backendErrorMessage(error) ?? 'Unable to load Users right now.';
      },
    });
  }

  retryUsers(): void {
    if (!this.loading) this.loadUsers(this.currentPage);
  }

  setSearchDraft(value: string): void {
    this.filterDraft = { ...this.filterDraft, search: value };
  }

  toggleRole(role: UserRole, selected: boolean): void {
    if (selected && !this.filterDraft.roles.includes(role)) {
      this.filterDraft = { ...this.filterDraft, roles: [...this.filterDraft.roles, role] };
    } else if (!selected) {
      this.filterDraft = { ...this.filterDraft, roles: this.filterDraft.roles.filter((item) => item !== role) };
    }
  }

  applyFilters(): void {
    const draft = this.cloneDraft(this.filterDraft);
    this.appliedFilter = this.hasUserFilter(draft) ? draft : null;
    this.loadUsers(0);
  }

  clearFilters(): void {
    this.filterDraft = this.emptyFilterDraft();
    this.appliedFilter = null;
    this.loadUsers(0);
  }

  goToPage(page: number): void {
    if (this.loading || page < 0 || page >= this.totalPages || page === this.currentPage) return;
    this.loadUsers(page);
  }

  previousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  statusClass(status: UserStatus): string {
    return status === 'ACTIVE' ? 'active' : 'inactive';
  }

  handleUserCreated(): void {
    this.notifications.showSuccess('User created successfully.');
    this.loadUsers(this.currentPage);
  }

  handleStatusChanged(event: UserStatusChangedEvent): void {
    this.notifications.showSuccess(`${event.user.username} ${event.requestedStatus === 'ACTIVE' ? 'activated' : 'deactivated'} successfully.`);
    this.loadUsers(this.currentPage);
  }

  private setResult(result: UserPage, requestedPage: number): void {
    this.users = result.content;
    this.currentPage = result.page;
    this.totalPages = result.totalPages;
    this.totalElements = result.totalElements;
    this.loading = false;
    this.hasLoaded = true;
    if (result.page !== requestedPage) {
      this.pageMessage = `The requested page was unavailable. Showing page ${result.page + 1} instead.`;
    }
  }

  private cloneDraft(draft: UserFilterDraft): AppliedUserFilter {
    return { search: draft.search.trim(), roles: [...draft.roles] };
  }

  private emptyFilterDraft(): UserFilterDraft {
    return { search: '', roles: [] };
  }

  private hasDraftFilters(): boolean {
    return this.hasUserFilter(this.filterDraft);
  }

  private hasUserFilter(filter: { search: string; roles: ReadonlyArray<UserRole> }): boolean {
    return filter.search.trim().length > 0 || filter.roles.length > 0;
  }

  private backendErrorMessage(error: unknown): string | null {
    if (!(error instanceof HttpErrorResponse) || !error.error || typeof error.error !== 'object') return null;
    const message = (error.error as ApiErrorResponse).message;
    return typeof message === 'string' && message.trim() ? message.trim() : null;
  }

}
