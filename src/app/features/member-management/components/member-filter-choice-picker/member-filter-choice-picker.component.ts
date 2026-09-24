import { Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, inject } from '@angular/core';

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
export class MemberFilterChoicePickerComponent implements OnInit, OnChanges, OnDestroy {
  private readonly memberService = inject(MemberManagementService);
  private readonly masterDataService = inject(MasterDataService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  @Input({ required: true }) kind!: MemberFilterChoiceKind;
  @Input() selectedIds: ReadonlyArray<MemberId> = [];
  @Input() selectedChoice: SearchChoice | null = null;
  @Input() disabled = false;
  @Output() readonly choiceSelected = new EventEmitter<SearchChoice>();

  choices: SearchChoice[] = [];
  categories: SkillCategory[] = [];
  searchDraft = '';
  categoryId = '';
  page = 0;
  totalPages = 0;
  totalElements = 0;
  highlightedIndex = -1;
  dropdownOpen = false;
  loading = false;
  categoriesLoading = false;
  errorMessage = '';
  categoryErrorMessage = '';

  private selectedIdSet = new Set<string>();
  private requestGeneration = 0;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.selectedIdSet = new Set(this.selectedIds.map((id) => String(id)));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedIds']) {
      this.selectedIdSet = new Set((this.selectedIds ?? []).map((id) => String(id)));
    }
  }

  ngOnDestroy(): void {
    this.clearSearchTimer();
  }

  get kindLabel(): string {
    return this.kind === 'SKILL' ? 'Skills' : 'Languages';
  }

  get placeholder(): string {
    return this.kind === 'SKILL' ? 'Select a Skill...' : 'Select a Language...';
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

  get activeOptionId(): string | null {
    const option = this.choices[this.highlightedIndex];
    return option && !this.isSelected(option) ? this.optionId(option) : null;
  }

  toggleDropdown(): void {
    if (this.disabled) return;
    if (this.dropdownOpen) this.closeDropdown();
    else this.openDropdown();
  }

  openDropdown(): void {
    if (this.disabled || this.dropdownOpen) return;
    this.dropdownOpen = true;
    this.highlightedIndex = -1;
    if (this.kind === 'SKILL' && !this.categories.length && !this.categoriesLoading) this.loadCategories();
    this.loadChoices(this.page);
  }

  closeDropdown(): void {
    this.dropdownOpen = false;
    this.highlightedIndex = -1;
    this.clearSearchTimer();
  }

  setSearchDraft(value: string): void {
    this.searchDraft = value;
    this.highlightedIndex = -1;
    this.clearSearchTimer();
    if (!this.dropdownOpen) return;
    this.loading = true;
    this.errorMessage = '';
    this.searchTimer = setTimeout(() => {
      this.searchTimer = null;
      this.loadChoices(0);
    }, 250);
  }

  setCategoryFilter(value: string): void {
    this.categoryId = value;
    this.highlightedIndex = -1;
    this.loadChoices(0);
  }

  selectChoice(choice: SearchChoice): void {
    if (this.isSelected(choice) || this.disabled) return;
    this.selectedIdSet.add(String(choice.id));
    this.selectedIds = [...this.selectedIds, choice.id];
    this.selectedChoice = choice;
    this.closeDropdown();
    this.searchDraft = '';
    this.choiceSelected.emit(choice);
  }

  isSelected(choice: SearchChoice): boolean {
    return this.selectedIdSet.has(String(choice.id));
  }

  categoryLabel(choice: SearchChoice): string {
    return choice.categoryName?.trim() || choice.categoryCode?.trim() || 'Category unavailable';
  }

  optionId(choice: SearchChoice): string {
    return `${this.kind.toLowerCase()}-filter-option-${String(choice.id).replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  }

  retryChoices(): void {
    if (!this.loading) this.loadChoices(this.page);
  }

  retryCategories(): void {
    if (this.kind === 'SKILL' && !this.categoriesLoading) this.loadCategories();
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

  triggerKeydown(event: KeyboardEvent): void {
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && !this.dropdownOpen) {
      event.preventDefault();
      this.openDropdown();
    }
  }

  searchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeDropdown();
      this.focusTrigger();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.highlightNext(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (event.key === 'Enter' && this.highlightedIndex >= 0) {
      event.preventDefault();
      const choice = this.choices[this.highlightedIndex];
      if (choice && !this.isSelected(choice)) this.selectChoice(choice);
    }
  }

  @HostListener('document:click', ['$event'])
  closeOnOutsideClick(event: MouseEvent): void {
    if (this.dropdownOpen && !this.elementRef.nativeElement.contains(event.target as Node)) this.closeDropdown();
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
        if (generation !== this.requestGeneration || !this.dropdownOpen) return;
        this.choices = result.content;
        this.page = result.page;
        this.totalPages = result.totalPages;
        this.totalElements = result.totalElements;
        this.loading = false;
        this.highlightedIndex = -1;
      },
      error: () => {
        if (generation !== this.requestGeneration || !this.dropdownOpen) return;
        this.loading = false;
        this.errorMessage = `Unable to load ${this.kindLabel} right now.`;
      },
    });
  }

  private loadCategories(): void {
    this.categoriesLoading = true;
    this.categoryErrorMessage = '';
    this.masterDataService.listSkillCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        this.categoriesLoading = false;
      },
      error: () => {
        this.categoriesLoading = false;
        this.categoryErrorMessage = 'Unable to load Skill Categories right now.';
      },
    });
  }

  private highlightNext(direction: 1 | -1): void {
    if (!this.choices.length) return;
    let next = this.highlightedIndex;
    for (let count = 0; count < this.choices.length; count++) {
      next = (next + direction + this.choices.length) % this.choices.length;
      if (!this.isSelected(this.choices[next])) {
        this.highlightedIndex = next;
        return;
      }
    }
    this.highlightedIndex = -1;
  }

  private focusTrigger(): void {
    const trigger = this.elementRef.nativeElement.querySelector('.combobox-trigger') as HTMLButtonElement | null;
    trigger?.focus();
  }

  private clearSearchTimer(): void {
    if (this.searchTimer !== null) clearTimeout(this.searchTimer);
    this.searchTimer = null;
  }
}
