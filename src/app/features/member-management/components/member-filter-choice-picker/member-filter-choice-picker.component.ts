import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject } from '@angular/core';

import { MasterDataService } from '../../../master-data/services/master-data.service';
import { SkillCategory } from '../../../master-data/models/master-data.models';
import { MemberManagementService } from '../../services/member-management.service';
import { MemberId, SearchChoice } from '../../models/member-management.models';

export type MemberFilterChoiceKind = 'SKILL' | 'LANGUAGE';

@Component({
  selector: 'app-member-filter-choice-picker',
  standalone: true,
  templateUrl: './member-filter-choice-picker.component.html',
  styleUrl: './member-filter-choice-picker.component.scss',
})
export class MemberFilterChoicePickerComponent implements OnInit, OnChanges {
  private readonly memberService = inject(MemberManagementService);
  private readonly masterDataService = inject(MasterDataService);

  @Input({ required: true }) kind!: MemberFilterChoiceKind;
  @Input() selectedIds: ReadonlyArray<MemberId> = [];
  @Input() disabled = false;
  @Output() readonly choiceSelected = new EventEmitter<SearchChoice>();

  choices: SearchChoice[] = [];
  categories: SkillCategory[] = [];
  searchDraft = '';
  categoryId = '';
  page = 0;
  totalPages = 0;
  totalElements = 0;
  loading = false;
  errorMessage = '';
  categoryErrorMessage = '';

  private selectedIdSet = new Set<string>();
  private requestGeneration = 0;

  ngOnInit(): void {
    this.selectedIdSet = new Set(this.selectedIds.map((id) => String(id)));
    if (this.kind === 'SKILL') this.loadCategories();
    this.loadChoices(0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedIds']) {
      this.selectedIdSet = new Set((this.selectedIds ?? []).map((id) => String(id)));
    }
  }

  get kindLabel(): string {
    return this.kind === 'SKILL' ? 'Skills' : 'Languages';
  }

  get searchLabel(): string {
    return this.kind === 'SKILL' ? 'Search Skills' : 'Search Languages';
  }

  get emptyMessage(): string {
    return this.kind === 'SKILL' ? 'No Skills match this search.' : 'No Languages match this search.';
  }

  get canGoPrevious(): boolean {
    return !this.loading && this.page > 0;
  }

  get canGoNext(): boolean {
    return !this.loading && this.page + 1 < this.totalPages;
  }

  setSearchDraft(value: string): void {
    this.searchDraft = value;
    this.loadChoices(0);
  }

  setCategoryFilter(value: string): void {
    this.categoryId = value;
    this.loadChoices(0);
  }

  selectChoice(choice: SearchChoice): void {
    if (this.isSelected(choice) || this.disabled) return;
    this.selectedIdSet.add(String(choice.id));
    this.selectedIds = [...this.selectedIds, choice.id];
    this.choiceSelected.emit(choice);
  }

  isSelected(choice: SearchChoice): boolean {
    return this.selectedIdSet.has(String(choice.id));
  }

  categoryLabel(choice: SearchChoice): string {
    return choice.categoryName?.trim() || choice.categoryCode?.trim() || 'Category unavailable';
  }

  retryChoices(): void {
    if (!this.loading) this.loadChoices(this.page);
  }

  retryCategories(): void {
    if (this.kind === 'SKILL') this.loadCategories();
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages || page === this.page || this.loading) return;
    this.loadChoices(page);
  }

  previousPage(): void {
    this.goToPage(this.page - 1);
  }

  nextPage(): void {
    this.goToPage(this.page + 1);
  }

  private loadChoices(page: number): void {
    const generation = ++this.requestGeneration;
    this.loading = true;
    this.errorMessage = '';
    const search = this.searchDraft.trim();
    const request$ = this.kind === 'SKILL'
      ? this.memberService.listSkills(page, 10, search, this.categoryId || undefined)
      : this.memberService.listLanguages(page, 10, search);

    request$.subscribe({
      next: (result) => {
        if (generation !== this.requestGeneration) return;
        this.choices = result.content;
        this.page = result.page;
        this.totalPages = result.totalPages;
        this.totalElements = result.totalElements;
        this.loading = false;
      },
      error: () => {
        if (generation !== this.requestGeneration) return;
        this.loading = false;
        this.errorMessage = `Unable to load ${this.kindLabel} right now.`;
      },
    });
  }

  private loadCategories(): void {
    this.categoryErrorMessage = '';
    this.masterDataService.listSkillCategories().subscribe({
      next: (categories) => { this.categories = categories; },
      error: () => { this.categoryErrorMessage = 'Unable to load Skill Categories right now.'; },
    });
  }
}
