import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ComponentRef,
  DestroyRef,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  ViewContainerRef,
  forwardRef,
  inject,
} from '@angular/core';
import { ComponentPortal } from '@angular/cdk/portal';
import { OverlayModule, OverlayRef } from '@angular/cdk/overlay';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { IbomLoadingIndicatorComponent } from '../loading/loading-indicator.component';
import { IbomOverlayMotionDirective } from '../overlay/ibom-overlay-motion.directive';
import {
  IbomOverlayPlacement,
  IbomOverlayService,
} from '../overlay/ibom-overlay.service';
import {
  IbomComboboxOption,
  IbomOptionFilter,
} from './ibom-option.types';
import { createIbomPrimitiveId, isSameIbomValue } from './ibom-primitive-utils';

@Component({
  selector: 'ibom-combobox-panel',
  standalone: true,
  imports: [IbomOverlayMotionDirective, IbomLoadingIndicatorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="ibom-combobox-panel ibom-listbox"
      [id]="listboxId"
      role="listbox"
      ibomOverlayMotion
    >
      @if (loading) {
        <div class="ibom-combobox__loading" role="status" aria-live="polite">
          <ibom-loading-indicator [label]="loadingLabel" [announce]="false" />
        </div>
      } @else if (!options.length) {
        <div class="ibom-combobox__empty" role="status">{{ noResultsText }}</div>
      } @else {
        @for (option of options; track $index) {
          <button
            class="ibom-option"
            [class.is-active]="$index === activeIndex"
            [class.is-selected]="isSelected(option)"
            type="button"
            role="option"
            [id]="optionId($index)"
            tabindex="-1"
            [attr.aria-selected]="isSelected(option) ? 'true' : 'false'"
            [attr.aria-disabled]="option.disabled ? 'true' : null"
            (mousedown)="$event.preventDefault()"
            (click)="onOptionClick($index)"
          >{{ option.label }}</button>
        }
      }
    </div>
  `,
})
export class IbomComboboxPanelComponent<T = unknown> {
  @Input() options: readonly IbomComboboxOption<T>[] = [];
  @Input() selectedValue: T | null = null;
  @Input() activeIndex = -1;
  @Input() listboxId = '';
  @Input() loading = false;
  @Input() loadingLabel = 'Loading...';
  @Input() noResultsText = 'No results';

  @Output() readonly optionSelected = new EventEmitter<IbomComboboxOption<T>>();

  update(config: {
    options: readonly IbomComboboxOption<T>[];
    selectedValue: T | null;
    activeIndex: number;
    loading: boolean;
    loadingLabel: string;
    noResultsText: string;
    listboxId: string;
  }): void {
    this.options = config.options;
    this.selectedValue = config.selectedValue;
    this.activeIndex = config.activeIndex;
    this.loading = config.loading;
    this.loadingLabel = config.loadingLabel;
    this.noResultsText = config.noResultsText;
    this.listboxId = config.listboxId;
  }

  isSelected(option: IbomComboboxOption<T>): boolean {
    return isSameIbomValue(option.value, this.selectedValue);
  }

  optionId(index: number): string {
    return `${this.listboxId}-option-${index}`;
  }

  onOptionClick(index: number): void {
    const option = this.options[index];
    if (!option || option.disabled) return;
    this.optionSelected.emit(option);
  }
}

@Component({
  selector: 'ibom-combobox',
  standalone: true,
  imports: [OverlayModule, IbomComboboxPanelComponent],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => IbomComboboxComponent),
    multi: true,
  }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ibom-combobox">
      <input
        #input
        class="ibom-field__control ibom-combobox__input"
        type="text"
        autocomplete="off"
        role="combobox"
        [id]="inputId"
        [value]="displayText()"
        [placeholder]="placeholder"
        [disabled]="isDisabled"
        [attr.aria-autocomplete]="'list'"
        [attr.aria-expanded]="isOpen ? 'true' : 'false'"
        [attr.aria-controls]="listboxId"
        [attr.aria-activedescendant]="activeOptionId()"
        [attr.aria-label]="ariaLabel || null"
        [attr.aria-labelledby]="ariaLabelledby || null"
        [attr.aria-required]="required ? 'true' : null"
        [attr.aria-invalid]="invalid ? 'true' : null"
        [attr.aria-disabled]="isDisabled ? 'true' : null"
        (focus)="onInputFocus()"
        (input)="onInput($event)"
        (keydown)="onInputKeydown($event)"
      />
    </div>
  `,
  host: {
    class: 'ibom-combobox-host',
    '[attr.data-open]': 'isOpen ? "true" : null',
  },
})
export class IbomComboboxComponent<T = unknown>
  implements ControlValueAccessor, OnChanges, OnDestroy {
  @Input() options: readonly IbomComboboxOption<T>[] = [];
  @Input() value: T | null = null;
  @Input() searchText = '';
  @Input() placeholder = 'Search or select an option';
  @Input() placement: IbomOverlayPlacement = 'bottom-start';
  @Input() optionFilter: IbomOptionFilter<T> | null = null;
  @Input() localFilter = true;
  @Input() loading = false;
  @Input() loadingLabel = 'Loading...';
  @Input() noResultsText = 'No results';
  @Input() ariaLabel = '';
  @Input() ariaLabelledby = '';
  @Input() required = false;
  @Input() invalid = false;
  @Output() readonly valueChange = new EventEmitter<T | null>();
  @Output() readonly searchTextChange = new EventEmitter<string>();

  readonly inputId = createIbomPrimitiveId('ibom-combobox-input');
  readonly listboxId = createIbomPrimitiveId('ibom-combobox-listbox');
  isOpen = false;

  @ViewChild('input', { read: ElementRef })
  private inputRef!: ElementRef<HTMLInputElement>;

  private readonly overlay = inject(IbomOverlayService);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private overlayRef: OverlayRef | null = null;
  private panelRef: ComponentRef<IbomComboboxPanelComponent<T>> | null = null;
  private visibleOptions: readonly IbomComboboxOption<T>[] = [];
  private activeIndex = -1;
  private inputDisabled = false;
  private formDisabled = false;
  private onChange: (value: T | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  @Input()
  set disabled(value: boolean) {
    this.inputDisabled = value;
  }

  get disabled(): boolean {
    return this.isDisabled;
  }

  get isDisabled(): boolean {
    return this.inputDisabled || this.formDisabled;
  }

  ngOnChanges(_changes: SimpleChanges): void {
    this.updateVisibleOptions();
    this.updatePanel();
  }

  selectedOption(): IbomComboboxOption<T> | undefined {
    return this.options.find((option) => isSameIbomValue(option.value, this.value));
  }

  displayText(): string {
    return this.isOpen ? this.searchText : this.selectedOption()?.label ?? this.searchText;
  }

  activeOptionId(): string | null {
    return this.isOpen && this.activeIndex >= 0 ? `${this.listboxId}-option-${this.activeIndex}` : null;
  }

  onInputFocus(): void {
    if (!this.isDisabled && !this.isOpen) this.open();
  }

  onInput(event: Event): void {
    if (this.isDisabled) return;
    this.searchText = (event.target as HTMLInputElement).value;
    this.searchTextChange.emit(this.searchText);
    if (!this.isOpen) this.open();
    this.updateVisibleOptions();
    this.activeIndex = this.firstEnabledIndex();
    this.updatePanel();
  }

  onInputKeydown(event: KeyboardEvent): void {
    if (this.isDisabled) return;
    if (event.key === 'Escape') {
      if (!this.isOpen) return;
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key === 'Tab') {
      if (this.isOpen) this.close(false);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!this.isOpen) this.open();
      else this.moveActive(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!this.isOpen) this.open();
      else this.moveActive(-1);
      return;
    }
    if (event.key === 'Home') {
      if (!this.isOpen) return;
      event.preventDefault();
      this.activeIndex = this.firstEnabledIndex();
      this.updatePanel();
      return;
    }
    if (event.key === 'End') {
      if (!this.isOpen) return;
      event.preventDefault();
      this.activeIndex = this.lastEnabledIndex();
      this.updatePanel();
      return;
    }
    if (event.key === 'Enter' && this.isOpen) {
      event.preventDefault();
      this.selectActiveOption();
    }
  }

  open(): void {
    if (this.isOpen || this.isDisabled) return;

    this.updateVisibleOptions();
    this.activeIndex = this.firstEnabledIndex();
    this.isOpen = true;
    const overlayRef = this.overlay.create(this.inputRef, {
      placement: this.placement,
      panelClass: 'ibom-combobox-overlay',
      matchOriginWidth: true,
    });
    this.overlayRef = overlayRef;
    this.panelRef = overlayRef.attach(
      new ComponentPortal(IbomComboboxPanelComponent, this.viewContainerRef),
    ) as ComponentRef<IbomComboboxPanelComponent<T>>;
    this.configurePanel();
    this.overlay.watchDismissal(overlayRef, this.inputRef, this.destroyRef, () => this.close());
    overlayRef.detachments()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.handleExternalDetach(overlayRef));
    this.changeDetectorRef.markForCheck();
    this.panelRef.changeDetectorRef.detectChanges();
  }

  close(restoreFocus = true): void {
    if (!this.isOpen) return;

    const overlayRef = this.overlayRef;
    this.overlayRef = null;
    this.panelRef = null;
    this.isOpen = false;
    overlayRef?.dispose();
    this.onTouched();
    this.changeDetectorRef.markForCheck();

    if (restoreFocus && this.inputRef?.nativeElement.isConnected !== false) this.inputRef.nativeElement.focus();
  }

  writeValue(value: T | null): void {
    this.value = value;
    this.changeDetectorRef.markForCheck();
    this.updatePanel();
  }

  registerOnChange(fn: (value: T | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled = isDisabled;
    this.changeDetectorRef.markForCheck();
  }

  ngOnDestroy(): void {
    this.close(false);
  }

  private updateVisibleOptions(): void {
    const query = this.searchText.trim();
    if (!this.localFilter) {
      this.visibleOptions = [...this.options];
      return;
    }
    this.visibleOptions = this.options.filter((option) => this.optionFilter
      ? this.optionFilter(option, this.searchText)
      : option.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
    if (this.activeIndex >= this.visibleOptions.length || this.visibleOptions[this.activeIndex]?.disabled) {
      this.activeIndex = this.firstEnabledIndex();
    }
  }

  private updatePanel(): void {
    if (!this.panelRef) return;
    this.panelRef.setInput('options', this.visibleOptions);
    this.panelRef.setInput('selectedValue', this.value);
    this.panelRef.setInput('activeIndex', this.activeIndex);
    this.panelRef.setInput('loading', this.loading);
    this.panelRef.setInput('loadingLabel', this.loadingLabel);
    this.panelRef.setInput('noResultsText', this.noResultsText);
    this.panelRef.setInput('listboxId', this.listboxId);
    this.panelRef.changeDetectorRef.detectChanges();
  }

  private moveActive(direction: 1 | -1): void {
    if (!this.visibleOptions.length) return;
    const start = this.activeIndex < 0 ? (direction === 1 ? -1 : this.visibleOptions.length) : this.activeIndex;
    for (let offset = 1; offset <= this.visibleOptions.length; offset += 1) {
      const index = (start + direction * offset + this.visibleOptions.length) % this.visibleOptions.length;
      if (!this.visibleOptions[index].disabled) {
        this.activeIndex = index;
        this.updatePanel();
        return;
      }
    }
  }

  private selectActiveOption(): void {
    const option = this.visibleOptions[this.activeIndex];
    if (!option || option.disabled) return;
    this.value = option.value;
    this.valueChange.emit(this.value);
    this.onChange(this.value);
    this.searchText = '';
    this.searchTextChange.emit('');
    this.close();
  }

  private selectOption(option: IbomComboboxOption<T>): void {
    if (option.disabled) return;
    this.value = option.value;
    this.valueChange.emit(this.value);
    this.onChange(this.value);
    this.searchText = '';
    this.searchTextChange.emit('');
    this.close();
  }

  private firstEnabledIndex(): number {
    return this.visibleOptions.findIndex((option) => !option.disabled);
  }

  private lastEnabledIndex(): number {
    for (let index = this.visibleOptions.length - 1; index >= 0; index -= 1) {
      if (!this.visibleOptions[index].disabled) return index;
    }
    return -1;
  }

  private configurePanel(): void {
    if (!this.panelRef) return;
    this.panelRef.instance.optionSelected
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((option) => this.selectOption(option));
    this.updatePanel();
  }

  private handleExternalDetach(overlayRef: OverlayRef): void {
    if (this.overlayRef !== overlayRef) return;
    this.overlayRef = null;
    this.panelRef = null;
    this.isOpen = false;
    this.changeDetectorRef.markForCheck();
  }
}
