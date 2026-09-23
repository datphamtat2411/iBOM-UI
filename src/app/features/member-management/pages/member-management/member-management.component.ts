import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';

import { ApiErrorResponse } from '../../../../core/http/api.models';
import { MemberManagementService } from '../../services/member-management.service';
import { MemberPage, MemberStatus, MemberStatusFilter, MemberSummary } from '../../models/member-management.models';

@Component({
  selector: 'app-member-management',
  standalone: true,
  templateUrl: './member-management.component.html',
  styleUrl: './member-management.component.scss',
})
export class MemberManagementComponent implements OnInit {
  private readonly memberService = inject(MemberManagementService);

  readonly pageSize = 10;
  readonly statusOptions: MemberStatusFilter[] = ['ALL', 'ACTIVE', 'INACTIVE'];

  members: MemberSummary[] = [];
  currentPage = 0;
  totalPages = 0;
  totalElements = 0;
  searchTerm = '';
  searchDraft = '';
  statusFilter: MemberStatusFilter = 'ALL';
  statusDraft: MemberStatusFilter = 'ALL';
  loading = false;
  hasLoaded = false;
  loadErrorMessage = '';
  pageMessage = '';

  private loadGeneration = 0;
  private readonly timestampFormatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  });

  ngOnInit(): void {
    this.loadMembers(0);
  }

  get filtersApplied(): boolean {
    return Boolean(this.searchTerm) || this.statusFilter !== 'ALL';
  }

  get filtering(): boolean {
    return this.loading && this.filtersApplied;
  }

  loadMembers(page = this.currentPage, search = this.searchTerm, status = this.statusFilter): void {
    const requestedPage = Math.max(0, page);
    const requestedSearch = search.trim();
    const requestedStatus = this.validStatusFilter(status) ? status : 'ALL';
    const generation = ++this.loadGeneration;

    this.currentPage = requestedPage;
    this.searchTerm = requestedSearch;
    this.statusFilter = requestedStatus;
    this.loading = true;
    this.hasLoaded = false;
    this.loadErrorMessage = '';
    this.pageMessage = '';
    this.members = [];
    this.totalPages = 0;
    this.totalElements = 0;

    const apiStatus = requestedStatus === 'ALL' ? undefined : requestedStatus;
    this.memberService.list(requestedPage, this.pageSize, requestedSearch, apiStatus).subscribe({
      next: (result: MemberPage) => {
        if (generation !== this.loadGeneration) return;

        this.members = result.content;
        this.currentPage = result.page;
        this.totalPages = result.totalPages;
        this.totalElements = result.totalElements;
        this.loading = false;
        this.hasLoaded = true;
        if (result.page !== requestedPage) {
          this.pageMessage = `The requested page was unavailable. Showing page ${result.page + 1} instead.`;
        }
      },
      error: (error: unknown) => {
        if (generation !== this.loadGeneration) return;

        this.loading = false;
        this.loadErrorMessage = this.backendErrorMessage(error) ?? 'Unable to load Members right now.';
      },
    });
  }

  retryMembers(): void {
    if (!this.loading) this.loadMembers(this.currentPage, this.searchTerm, this.statusFilter);
  }

  setSearchDraft(value: string): void {
    this.searchDraft = value;
  }

  setStatusDraft(value: string): void {
    this.statusDraft = this.validStatusFilter(value) ? value : 'ALL';
  }

  applyFilters(): void {
    this.searchTerm = this.searchDraft.trim();
    this.statusFilter = this.statusDraft;
    this.loadMembers(0, this.searchTerm, this.statusFilter);
  }

  clearFilters(): void {
    this.searchDraft = '';
    this.statusDraft = 'ALL';
    this.loadMembers(0, '', 'ALL');
  }

  goToPage(page: number): void {
    if (this.loading || page < 0 || page >= this.totalPages || page === this.currentPage) return;
    this.loadMembers(page, this.searchTerm, this.statusFilter);
  }

  previousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  formatTimestamp(value: string | null | undefined): string {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : this.timestampFormatter.format(date);
  }

  showMemberActionBoundary(member: MemberSummary): void {
    this.pageMessage = `Managed Member Profile context is not available for ${member.username} from this workspace.`;
  }

  private validStatusFilter(value: string): value is MemberStatusFilter {
    return this.statusOptions.includes(value as MemberStatusFilter);
  }

  private backendErrorMessage(error: unknown): string | null {
    if (!(error instanceof HttpErrorResponse) || !error.error || typeof error.error !== 'object') return null;
    const message = (error.error as ApiErrorResponse).message;
    return typeof message === 'string' && message.trim() ? message.trim() : null;
  }
}
