import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';

import { ApiErrorResponse } from '../../../../core/http/api.models';
import { MemberFilterChoicePickerComponent } from '../../components/member-filter-choice-picker/member-filter-choice-picker.component';
import { MemberManagementService } from '../../services/member-management.service';
import {
  AppliedMemberFilter,
  LanguageLevel,
  MatchingProfile,
  MemberFilterDraft,
  MemberId,
  MemberPage,
  MemberSearchRequest,
  MemberStatusFilter,
  MemberSummary,
  SearchChoice,
} from '../../models/member-management.models';

@Component({
  selector: 'app-member-management',
  standalone: true,
  imports: [MemberFilterChoicePickerComponent],
  templateUrl: './member-management.component.html',
  styleUrl: './member-management.component.scss',
})
export class MemberManagementComponent implements OnInit {
  private readonly memberService = inject(MemberManagementService);
  private readonly router = inject(Router);

  readonly pageSize = 10;
  readonly statusOptions: MemberStatusFilter[] = ['ALL', 'ACTIVE', 'INACTIVE'];
  readonly languageLevels: ReadonlyArray<{ value: LanguageLevel; label: string }> = [
    { value: 'BEGINNER', label: 'Beginner' },
    { value: 'INTERMEDIATE', label: 'Intermediate' },
    { value: 'UPPER_INTERMEDIATE', label: 'Upper Intermediate' },
    { value: 'ADVANCED', label: 'Advanced' },
    { value: 'NATIVE', label: 'Native' },
  ];

  filterDraft: MemberFilterDraft = this.emptyFilterDraft();
  appliedFilter: AppliedMemberFilter | null = null;
  members: MemberSummary[] = [];
  currentPage = 0;
  totalPages = 0;
  totalElements = 0;
  loading = false;
  hasLoaded = false;
  loadErrorMessage = '';
  seniorities: SearchChoice[] = [];
  senioritiesLoading = false;
  senioritiesErrorMessage = '';
  validationMessage = '';
  pageMessage = '';

  readonly skillChoices = new Map<string, SearchChoice>();
  readonly languageChoices = new Map<string, SearchChoice>();
  private loadGeneration = 0;
  private seniorityGeneration = 0;
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
    this.loadSeniorities();
  }

  get searchDraft(): string {
    return this.filterDraft.search;
  }

  set searchDraft(value: string) {
    this.setSearchDraft(value);
  }

  get statusDraft(): MemberStatusFilter {
    return this.filterDraft.status;
  }

  set statusDraft(value: MemberStatusFilter) {
    this.setStatusDraft(value);
  }

  get languageConditions() {
    return this.filterDraft.languages;
  }

  get skillConditions() {
    return this.filterDraft.skills;
  }

  get selectedLanguageIds(): MemberId[] {
    return this.filterDraft.languages.map((condition) => condition.languageId);
  }

  get selectedSkillIds(): MemberId[] {
    return this.filterDraft.skills.map((condition) => condition.skillId);
  }

  get searchTerm(): string {
    return this.appliedFilter?.search ?? '';
  }

  get statusFilter(): MemberStatusFilter {
    return this.appliedFilter?.status ?? 'ALL';
  }

  get filtersApplied(): boolean {
    return this.appliedFilter !== null || this.hasDraftFilters();
  }

  get filtering(): boolean {
    return this.loading && this.filtersApplied;
  }

  get canResetFilters(): boolean {
    return this.filtersApplied;
  }

  get appliedSearchDescription(): string {
    const filter = this.appliedFilter;
    if (!filter) return '';

    const parts: string[] = [];
    if (filter.search) parts.push(`Username/email: ${filter.search}`);
    if (filter.status !== 'ALL') parts.push(filter.status);
    if (filter.languages.length) {
      parts.push(`Languages: ${filter.languages.map((condition) => `${this.choiceName(this.languageChoices, condition.languageId)} + ${this.languageLevelName(condition.level)}`).join(' AND ')}`);
    }
    if (filter.skills.length) {
      parts.push(`Skills: ${filter.skills.map((condition) => `${this.choiceName(this.skillChoices, condition.skillId)} + ${this.seniorityName(condition.seniorityId)}`).join(' AND ')}`);
    }
    return parts.join(' · ') || 'All Members';
  }

  loadMembers(page = this.currentPage): void {
    const requestedPage = Math.max(0, page);
    const generation = ++this.loadGeneration;
    this.currentPage = requestedPage;
    this.loading = true;
    this.hasLoaded = false;
    this.loadErrorMessage = '';
    this.pageMessage = '';
    this.members = [];
    this.totalPages = 0;
    this.totalElements = 0;

    this.memberService.list(requestedPage, this.pageSize, '', undefined).subscribe({
      next: (result: MemberPage) => {
        if (generation !== this.loadGeneration) return;
        this.setResult(result, requestedPage);
      },
      error: (error: unknown) => {
        if (generation !== this.loadGeneration) return;
        this.loading = false;
        this.loadErrorMessage = this.backendErrorMessage(error) ?? 'Unable to load Members right now.';
      },
    });
  }

  retryMembers(): void {
    if (this.loading) return;
    if (this.appliedFilter) this.loadAppliedSearch(this.currentPage);
    else this.loadMembers(this.currentPage);
  }

  setSearchDraft(value: string): void {
    this.filterDraft = { ...this.filterDraft, search: value };
  }

  setStatusDraft(value: string): void {
    this.filterDraft = { ...this.filterDraft, status: this.validStatusFilter(value) ? value : 'ALL' };
  }

  selectLanguage(choice: SearchChoice): void {
    if (this.filterDraft.languages.some((condition) => this.sameId(condition.languageId, choice.id))) return;
    this.languageChoices.set(String(choice.id), choice);
    this.filterDraft = {
      ...this.filterDraft,
      languages: [...this.filterDraft.languages, { languageId: choice.id, level: null }],
    };
  }

  selectSkill(choice: SearchChoice): void {
    if (this.filterDraft.skills.some((condition) => this.sameId(condition.skillId, choice.id))) return;
    this.skillChoices.set(String(choice.id), choice);
    this.filterDraft = {
      ...this.filterDraft,
      skills: [...this.filterDraft.skills, { skillId: choice.id, seniorityId: null }],
    };
  }

  setLanguageLevel(index: number, value: string): void {
    const condition = this.filterDraft.languages[index];
    if (!condition) return;
    this.filterDraft = {
      ...this.filterDraft,
      languages: this.filterDraft.languages.map((item, itemIndex) => itemIndex === index
        ? { ...item, level: this.validLanguageLevel(value) ? value : null }
        : item),
    };
  }

  setSkillSeniority(index: number, value: string): void {
    const condition = this.filterDraft.skills[index];
    if (!condition) return;
    this.filterDraft = {
      ...this.filterDraft,
      skills: this.filterDraft.skills.map((item, itemIndex) => itemIndex === index
        ? { ...item, seniorityId: value.trim() ? value : null }
        : item),
    };
  }

  removeLanguageCondition(index: number): void {
    this.filterDraft = {
      ...this.filterDraft,
      languages: this.filterDraft.languages.filter((_, itemIndex) => itemIndex !== index),
    };
  }

  removeSkillCondition(index: number): void {
    this.filterDraft = {
      ...this.filterDraft,
      skills: this.filterDraft.skills.filter((_, itemIndex) => itemIndex !== index),
    };
  }

  applyFilters(): void {
    this.validationMessage = '';
    this.appliedFilter = this.cloneDraft(this.filterDraft);
    this.loadAppliedSearch(0);
  }

  clearFilters(): void {
    this.filterDraft = this.emptyFilterDraft();
    this.appliedFilter = null;
    this.skillChoices.clear();
    this.languageChoices.clear();
    this.validationMessage = '';
    this.loadMembers(0);
  }

  loadSeniorities(): void {
    const generation = ++this.seniorityGeneration;
    this.senioritiesLoading = true;
    this.senioritiesErrorMessage = '';
    this.memberService.listSeniorities().subscribe({
      next: (seniorities) => {
        if (generation !== this.seniorityGeneration) return;
        this.seniorities = seniorities;
        this.senioritiesLoading = false;
      },
      error: (error: unknown) => {
        if (generation !== this.seniorityGeneration) return;
        this.senioritiesLoading = false;
        this.senioritiesErrorMessage = this.backendErrorMessage(error) ?? 'Unable to load Seniority choices right now.';
      },
    });
  }

  retrySeniorities(): void {
    if (!this.senioritiesLoading) this.loadSeniorities();
  }

  goToPage(page: number): void {
    if (this.loading || page < 0 || page >= this.totalPages || page === this.currentPage) return;
    if (this.appliedFilter) this.loadAppliedSearch(page);
    else this.loadMembers(page);
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

  matchingProfiles(member: MemberSummary): MatchingProfile[] {
    return member.matchingProfiles ?? [];
  }

  matchingProfileName(profile: MatchingProfile): string {
    return profile.name ?? profile.profileName ?? 'Unnamed Profile';
  }

  matchingProfileUpdatedAt(profile: MatchingProfile): string | null | undefined {
    return profile.updatedAt ?? profile.lastUpdatedAt;
  }

  openMember(member: MemberSummary): void {
    void this.router.navigate(['/members', member.id, 'profiles'], {
      state: {
        managedMember: {
          id: String(member.id),
          username: member.username,
          email: member.email,
        },
      },
    });
  }

  choiceName(choices: ReadonlyMap<string, SearchChoice>, id: MemberId): string {
    return choices.get(String(id))?.name ?? String(id);
  }

  seniorityName(id: MemberId | null): string {
    if (id === null) return 'Any Seniority';
    return this.seniorities.find((choice) => this.sameId(choice.id, id))?.name ?? String(id);
  }

  languageLevelName(level: LanguageLevel | null): string {
    if (level === null) return 'Any Level';
    return this.languageLevels.find((option) => option.value === level)?.label ?? level;
  }

  private loadAppliedSearch(page: number): void {
    const filter = this.appliedFilter;
    if (!filter) {
      this.loadMembers(page);
      return;
    }

    const requestedPage = Math.max(0, page);
    const generation = ++this.loadGeneration;
    this.currentPage = requestedPage;
    this.loading = true;
    this.hasLoaded = false;
    this.loadErrorMessage = '';
    this.pageMessage = '';
    this.members = [];
    this.totalPages = 0;
    this.totalElements = 0;

    this.memberService.searchMembers(this.toSearchRequest(filter, requestedPage)).subscribe({
      next: (result: MemberPage) => {
        if (generation !== this.loadGeneration) return;
        this.setResult(result, requestedPage);
      },
      error: (error: unknown) => {
        if (generation !== this.loadGeneration) return;
        this.loading = false;
        this.loadErrorMessage = this.backendErrorMessage(error) ?? 'Unable to search Members right now.';
      },
    });
  }

  private setResult(result: MemberPage, requestedPage: number): void {
    this.members = result.content;
    this.currentPage = result.page;
    this.totalPages = result.totalPages;
    this.totalElements = result.totalElements;
    this.loading = false;
    this.hasLoaded = true;
    if (result.page !== requestedPage) {
      this.pageMessage = `The requested page was unavailable. Showing page ${result.page + 1} instead.`;
    }
  }

  private toSearchRequest(filter: AppliedMemberFilter, page: number): MemberSearchRequest {
    return {
      search: filter.search,
      status: filter.status === 'ALL' ? null : filter.status,
      languages: filter.languages.map((condition) => ({ languageId: condition.languageId, level: condition.level })),
      skills: filter.skills.map((condition) => ({ skillId: condition.skillId, seniorityId: condition.seniorityId })),
      page,
      size: this.pageSize,
    };
  }

  private cloneDraft(draft: MemberFilterDraft): AppliedMemberFilter {
    return {
      search: draft.search.trim(),
      status: draft.status,
      languages: draft.languages.map((condition) => ({ ...condition })),
      skills: draft.skills.map((condition) => ({ ...condition })),
    };
  }

  private emptyFilterDraft(): MemberFilterDraft {
    return { search: '', status: 'ALL', languages: [], skills: [] };
  }

  private hasDraftFilters(): boolean {
    return this.filterDraft.search.trim().length > 0
      || this.filterDraft.status !== 'ALL'
      || this.filterDraft.languages.length > 0
      || this.filterDraft.skills.length > 0;
  }

  private sameId(left: MemberId, right: MemberId): boolean {
    return String(left) === String(right);
  }

  private validStatusFilter(value: string): value is MemberStatusFilter {
    return this.statusOptions.includes(value as MemberStatusFilter);
  }

  private validLanguageLevel(value: string): value is LanguageLevel {
    return this.languageLevels.some((option) => option.value === value);
  }

  private backendErrorMessage(error: unknown): string | null {
    if (!(error instanceof HttpErrorResponse) || !error.error || typeof error.error !== 'object') return null;
    const message = (error.error as ApiErrorResponse).message;
    return typeof message === 'string' && message.trim() ? message.trim() : null;
  }
}
