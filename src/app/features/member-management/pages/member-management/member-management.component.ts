import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { forkJoin, Observable, of, switchMap } from 'rxjs';

import { ApiErrorResponse } from '../../../../core/http/api.models';
import { MemberManagementService } from '../../services/member-management.service';
import {
  AdvancedSearchMode,
  AppliedMemberSearch,
  LanguageLevel,
  LanguageSearchPair,
  MatchingProfile,
  MemberPage,
  MemberSearchMode,
  MemberStatusFilter,
  MemberSummary,
  SearchChoice,
  SkillSearchPair,
} from '../../models/member-management.models';

interface DraftSkillCondition {
  skillId: number | string | null;
  seniorityId: number | string | null;
}

interface DraftLanguageCondition {
  languageId: number | string | null;
  level: LanguageLevel | null;
}

@Component({
  selector: 'app-member-management',
  standalone: true,
  templateUrl: './member-management.component.html',
  styleUrl: './member-management.component.scss',
})
export class MemberManagementComponent implements OnInit {
  private readonly memberService = inject(MemberManagementService);

  readonly pageSize = 10;
  readonly masterDataPageSize = 100;
  readonly statusOptions: MemberStatusFilter[] = ['ALL', 'ACTIVE', 'INACTIVE'];
  readonly searchModeOptions: ReadonlyArray<{ value: MemberSearchMode; label: string }> = [
    { value: 'BASE', label: 'Base list: username or email' },
    { value: 'SKILL', label: 'Skill + Seniority' },
    { value: 'LANGUAGE', label: 'Language + Level' },
  ];
  readonly languageLevels: ReadonlyArray<{ value: LanguageLevel; label: string }> = [
    { value: 'BEGINNER', label: 'Beginner' },
    { value: 'INTERMEDIATE', label: 'Intermediate' },
    { value: 'UPPER_INTERMEDIATE', label: 'Upper Intermediate' },
    { value: 'ADVANCED', label: 'Advanced' },
    { value: 'NATIVE', label: 'Native' },
  ];

  members: MemberSummary[] = [];
  currentPage = 0;
  totalPages = 0;
  totalElements = 0;
  searchTerm = '';
  searchDraft = '';
  statusFilter: MemberStatusFilter = 'ALL';
  statusDraft: MemberStatusFilter = 'ALL';
  searchModeDraft: MemberSearchMode = 'BASE';
  skillConditions: DraftSkillCondition[] = [];
  languageConditions: DraftLanguageCondition[] = [];
  appliedQuery: AppliedMemberSearch | null = null;
  skills: SearchChoice[] = [];
  languages: SearchChoice[] = [];
  seniorities: SearchChoice[] = [];
  loading = false;
  hasLoaded = false;
  loadErrorMessage = '';
  choicesLoading = false;
  choicesLoaded = false;
  choicesErrorMessage = '';
  validationMessage = '';
  pageMessage = '';

  private loadGeneration = 0;
  private choicesGeneration = 0;
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
    this.loadSearchChoices();
  }

  get filtersApplied(): boolean {
    return Boolean(this.searchTerm) || this.statusFilter !== 'ALL' || this.appliedQuery !== null;
  }

  get filtering(): boolean {
    return this.loading && this.filtersApplied;
  }

  get advancedModeSelected(): boolean {
    return this.searchModeDraft !== 'BASE';
  }

  get canResetSearch(): boolean {
    return this.filtersApplied || this.searchDraft.trim().length > 0 || this.statusDraft !== 'ALL' || this.searchModeDraft !== 'BASE';
  }

  get appliedSearchDescription(): string {
    const query = this.appliedQuery;
    if (!query) return '';

    if (query.mode === 'SKILL') {
      const pairs = query.pairs.map((pair) => {
        return `${this.choiceName(this.skills, pair.skillId)} + ${this.choiceName(this.seniorities, pair.seniorityId)}`;
      });
      const status = query.status === 'ALL' ? '' : ` · ${query.status}`;
      return `Skill + Seniority: ${pairs.join(' AND ')}${status}`;
    }

    const pairs = query.pairs.map((pair) => `${this.choiceName(this.languages, pair.languageId)} + ${this.languageLevelName(pair.level)}`);
    const status = query.status === 'ALL' ? '' : ` · ${query.status}`;
    return `Language + Level: ${pairs.join(' AND ')}${status}`;
  }

  loadMembers(page = this.currentPage, search = this.searchTerm, status = this.statusFilter): void {
    const requestedPage = Math.max(0, page);
    const requestedSearch = search.trim();
    const requestedStatus = this.validStatusFilter(status) ? status : 'ALL';
    const generation = ++this.loadGeneration;

    this.appliedQuery = null;
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
    if (this.loading) return;
    if (this.appliedQuery) {
      this.loadAppliedSearch(this.currentPage);
    } else {
      this.loadMembers(this.currentPage, this.searchTerm, this.statusFilter);
    }
  }

  setSearchDraft(value: string): void {
    this.searchDraft = value;
  }

  setStatusDraft(value: string): void {
    this.statusDraft = this.validStatusFilter(value) ? value : 'ALL';
  }

  setSearchMode(value: string): void {
    if (!this.validSearchMode(value)) return;

    this.searchModeDraft = value;
    this.validationMessage = '';
    if (value === 'SKILL' && !this.skillConditions.length) this.addSkillCondition();
    if (value === 'LANGUAGE' && !this.languageConditions.length) this.addLanguageCondition();
  }

  setSkillConditionValue(index: number, field: 'skillId' | 'seniorityId', value: string): void {
    const condition = this.skillConditions[index];
    if (!condition) return;

    condition[field] = value.trim() ? value : null;
    this.validationMessage = '';
  }

  setLanguageConditionValue(index: number, field: 'languageId' | 'level', value: string): void {
    const condition = this.languageConditions[index];
    if (!condition) return;

    if (field === 'languageId') {
      condition.languageId = value.trim() ? value : null;
    } else {
      condition.level = this.validLanguageLevel(value) ? value : null;
    }
    this.validationMessage = '';
  }

  addCondition(): void {
    if (this.searchModeDraft === 'SKILL') this.addSkillCondition();
    if (this.searchModeDraft === 'LANGUAGE') this.addLanguageCondition();
  }

  removeCondition(mode: AdvancedSearchMode, index: number): void {
    if (mode === 'SKILL') {
      this.skillConditions.splice(index, 1);
    } else {
      this.languageConditions.splice(index, 1);
    }
    this.validationMessage = '';
  }

  applySearch(): void {
    this.validationMessage = '';
    const requestedStatus = this.validStatusFilter(this.statusDraft) ? this.statusDraft : 'ALL';

    if (this.searchModeDraft === 'BASE') {
      this.searchTerm = this.searchDraft.trim();
      this.statusFilter = requestedStatus;
      this.loadMembers(0, this.searchTerm, this.statusFilter);
      return;
    }

    const validationMessage = this.validateDraftConditions(this.searchModeDraft);
    if (validationMessage) {
      this.validationMessage = validationMessage;
      return;
    }

    this.appliedQuery = this.createAppliedQuery(this.searchModeDraft, requestedStatus);
    this.searchTerm = '';
    this.statusFilter = requestedStatus;
    this.loadAppliedSearch(0);
  }

  applyFilters(): void {
    this.applySearch();
  }

  clearFilters(): void {
    this.searchDraft = '';
    this.statusDraft = 'ALL';
    this.searchModeDraft = 'BASE';
    this.skillConditions = [];
    this.languageConditions = [];
    this.validationMessage = '';
    this.appliedQuery = null;
    this.loadMembers(0, '', 'ALL');
  }

  loadSearchChoices(): void {
    const generation = ++this.choicesGeneration;
    this.choicesLoading = true;
    this.choicesLoaded = false;
    this.choicesErrorMessage = '';

    forkJoin({
      skills: this.loadAllSkills(),
      languages: this.loadAllLanguages(),
      seniorities: this.memberService.listSeniorities(),
    }).subscribe({
      next: ({ skills, languages, seniorities }) => {
        if (generation !== this.choicesGeneration) return;

        this.skills = skills;
        this.languages = languages;
        this.seniorities = seniorities;
        this.choicesLoading = false;
        this.choicesLoaded = true;
      },
      error: (error: unknown) => {
        if (generation !== this.choicesGeneration) return;

        this.choicesLoading = false;
        this.choicesErrorMessage = this.backendErrorMessage(error) ?? 'Unable to load search choices right now.';
      },
    });
  }

  retryChoices(): void {
    if (!this.choicesLoading) this.loadSearchChoices();
  }

  goToPage(page: number): void {
    if (this.loading || page < 0 || page >= this.totalPages || page === this.currentPage) return;
    if (this.appliedQuery) {
      this.loadAppliedSearch(page);
    } else {
      this.loadMembers(page, this.searchTerm, this.statusFilter);
    }
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

  showMemberActionBoundary(member: MemberSummary): void {
    this.pageMessage = `Managed Member Profile context is not available for ${member.username} from this workspace.`;
  }

  private loadAppliedSearch(page: number): void {
    const query = this.appliedQuery;
    if (!query) {
      this.loadMembers(page, this.searchTerm, this.statusFilter);
      return;
    }

    const requestedPage = Math.max(0, page);
    const generation = ++this.loadGeneration;
    const apiStatus = query.status === 'ALL' ? undefined : query.status;
    const request$ = query.mode === 'SKILL'
      ? this.memberService.searchBySkill(
        requestedPage,
        this.pageSize,
        query.pairs.map((pair) => pair.skillId),
        query.pairs.map((pair) => pair.seniorityId),
        apiStatus,
      )
      : this.memberService.searchByLanguage(
        requestedPage,
        this.pageSize,
        query.pairs.map((pair) => pair.languageId),
        query.pairs.map((pair) => pair.level),
        apiStatus,
      );

    this.currentPage = requestedPage;
    this.statusFilter = query.status;
    this.loading = true;
    this.hasLoaded = false;
    this.loadErrorMessage = '';
    this.pageMessage = '';
    this.members = [];
    this.totalPages = 0;
    this.totalElements = 0;

    request$.subscribe({
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
        this.loadErrorMessage = this.backendErrorMessage(error) ?? 'Unable to search Members right now.';
      },
    });
  }

  private loadAllSkills(page = 0, accumulated: SearchChoice[] = []): Observable<SearchChoice[]> {
    return this.memberService.listSkills(page, this.masterDataPageSize).pipe(
      switchMap((result) => {
        const choices = [...accumulated, ...result.content];
        return page + 1 < result.totalPages ? this.loadAllSkills(page + 1, choices) : of(choices);
      }),
    );
  }

  private loadAllLanguages(page = 0, accumulated: SearchChoice[] = []): Observable<SearchChoice[]> {
    return this.memberService.listLanguages(page, this.masterDataPageSize).pipe(
      switchMap((result) => {
        const choices = [...accumulated, ...result.content];
        return page + 1 < result.totalPages ? this.loadAllLanguages(page + 1, choices) : of(choices);
      }),
    );
  }

  private addSkillCondition(): void {
    this.skillConditions.push({ skillId: null, seniorityId: null });
  }

  private addLanguageCondition(): void {
    this.languageConditions.push({ languageId: null, level: null });
  }

  private validateDraftConditions(mode: AdvancedSearchMode): string | null {
    if (mode === 'SKILL') {
      if (!this.skillConditions.length) return 'Add at least one Skill + Seniority condition.';
      if (this.skillConditions.some((condition) => condition.skillId === null || condition.seniorityId === null)) {
        return 'Complete every Skill + Seniority condition before searching.';
      }
      const ids = this.skillConditions.map((condition) => String(condition.skillId));
      if (new Set(ids).size !== ids.length) return 'Each Skill can appear only once in a search.';
      return null;
    }

    if (!this.languageConditions.length) return 'Add at least one Language + Level condition.';
    if (this.languageConditions.some((condition) => condition.languageId === null || condition.level === null)) {
      return 'Complete every Language + Level condition before searching.';
    }
    const ids = this.languageConditions.map((condition) => String(condition.languageId));
    if (new Set(ids).size !== ids.length) return 'Each Language can appear only once in a search.';
    return null;
  }

  private createAppliedQuery(mode: AdvancedSearchMode, status: MemberStatusFilter): AppliedMemberSearch {
    if (mode === 'SKILL') {
      const pairs: SkillSearchPair[] = this.skillConditions.map((condition) => ({
        skillId: condition.skillId as number | string,
        seniorityId: condition.seniorityId as number | string,
      }));
      return { mode, pairs, status };
    }

    const pairs: LanguageSearchPair[] = this.languageConditions.map((condition) => ({
      languageId: condition.languageId as number | string,
      level: condition.level as LanguageLevel,
    }));
    return { mode, pairs, status };
  }

  private choiceName(choices: ReadonlyArray<SearchChoice>, id: number | string): string {
    return choices.find((choice) => String(choice.id) === String(id))?.name ?? String(id);
  }

  private languageLevelName(level: LanguageLevel): string {
    return this.languageLevels.find((option) => option.value === level)?.label ?? level;
  }

  private validStatusFilter(value: string): value is MemberStatusFilter {
    return this.statusOptions.includes(value as MemberStatusFilter);
  }

  private validSearchMode(value: string): value is MemberSearchMode {
    return this.searchModeOptions.some((option) => option.value === value);
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
