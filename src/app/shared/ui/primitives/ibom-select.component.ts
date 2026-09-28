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
  QueryList,
  SimpleChanges,
  ViewChild,
  ViewChildren,
  ViewContainerRef,
  forwardRef,
  inject,
} from '@angular/core';
import { FocusMonitor } from '@angular/cdk/a11y';
import { ComponentPortal } from '@angular/cdk/portal';
import { OverlayModule, OverlayRef } from '@angular/cdk/overlay';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  IbomOverlayPlacement,
  IbomOverlayService,
} from '../overlay/ibom-overlay.service';
import { IbomOverlayMotionDirective } from '../overlay/ibom-overlay-motion.directive';
import { IbomSelectOption } from './ibom-option.types';
import { createIbomPrimitiveId, isSameIbomValue } from './ibom-primitive-utils';

@Component({
  selector: 'ibom-select-panel',
  standalone: true,
  imports: [IbomOverlayMotionDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      #panel
      class="ibom-select-panel ibom-listbox"
      [id]="listboxId"
      role="listbox"
      tabindex="-1"
      [attr.aria-activedescendant]="activeOptionId()"
      ibomOverlayMotion
      (keydown)="onKeydown($event)"
    >
      @for (option of options; track $index) {
        <button
          #optionElement
          class="ibom-option"
          [class.is-active]="$index === activeIndex"
          [class.is-selected]="isSelected(option)"
          type="button"
          role="option"
          [id]="optionId($index)"
          [attr.aria-selected]="isSelected(option) ? 'true' : 'false'"
          [attr.aria-disabled]="option.disabled ? 'true' : null"
          [disabled]="option.disabled"
          (focus)="onOptionFocus($index)"
          (click)="onOptionClick($index)"
        >{{ option.label }}</button>
      }
    </div>
  `,
})
export class IbomSelectPanelComponent<T = unknown> implements AfterViewInit {
  @Input() options: readonly IbomSelectOption<T>[] = [];
  @Input() selectedValue: T | null = null;
  @Input() activeIndex = -1;
  @Input() listboxId = '';

  @Output() readonly activeIndexChange = new EventEmitter<number>();
  @Output() readonly optionSelected = new EventEmitter<IbomSelectOption<T>>();
  @Output() readonly closed = new EventEmitter<void>();

  @ViewChild('panel', { read: ElementRef })
  private panelRef!: ElementRef<HTMLElement>;
  @ViewChildren('optionElement', { read: ElementRef })
  private optionElements!: QueryList<ElementRef<HTMLButtonElement>>;

  private readonly focusMonitor = inject(FocusMonitor);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private initialized = false;

  ngAfterViewInit(): void {
    this.initialized = true;
  }

  update(
    options: readonly IbomSelectOption<T>[],
    selectedValue: T | null,
    activeIndex: number,
  ): void {
    this.options = options;
    this.selectedValue = selectedValue;
    this.activeIndex = this.normalizeIndex(activeIndex);
  }

  focusActiveOption(): void {
    if (!this.initialized) return;
    const element = this.optionElements.get(this.activeIndex)?.nativeElement;
    if (element) {
      this.focusMonitor.focusVia(element, 'keyboard');
      return;
    }
    this.focusMonitor.focusVia(this.panelRef, 'program');
  }

  isSelected(option: IbomSelectOption<T>): boolean {
    return isSameIbomValue(option.value, this.selectedValue);
  }

  activeOptionId(): string | null {
    return this.activeIndex >= 0 ? this.optionId(this.activeIndex) : null;
  }

  optionId(index: number): string {
    return `${this.listboxId}-option-${index}`;
  }

  onOptionFocus(index: number): void {
    if (this.options[index]?.disabled) return;
    this.setActiveIndex(index);
  }

  onOptionClick(index: number): void {
    const option = this.options[index];
    if (!option || option.disabled) return;
    this.optionSelected.emit(option);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closed.emit();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.moveActive(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.moveActive(-1);
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      this.setActiveIndex(this.firstEnabledIndex());
      this.focusActiveOption();
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      this.setActiveIndex(this.lastEnabledIndex());
      this.focusActiveOption();
      return;
    }
    if (event.key !== 'Enter' && event.key !== ' ') return;

    event.preventDefault();
    if (this.activeIndex >= 0) this.onOptionClick(this.activeIndex);
  }

  private setActiveIndex(index: number): void {
    const nextIndex = this.normalizeIndex(index);
    if (nextIndex === -1) return;
    this.activeIndex = nextIndex;
    this.activeIndexChange.emit(nextIndex);
    this.changeDetectorRef.markForCheck();
  }

  private moveActive(direction: 1 | -1): void {
    if (!this.options.length) return;
    const start = this.activeIndex < 0 ? (direction === 1 ? -1 : this.options.length) : this.activeIndex;
    for (let offset = 1; offset <= this.options.length; offset += 1) {
      const index = (start + direction * offset + this.options.length) % this.options.length;
      if (this.options[index] && !this.options[index].disabled) {
        this.setActiveIndex(index);
        this.focusActiveOption();
        return;
      }
    }
  }

  private normalizeIndex(index: number): number {
    if (index >= 0 && index < this.options.length && !this.options[index].disabled) return index;
    return this.firstEnabledIndex();
  }

  private firstEnabledIndex(): number {
    return this.options.findIndex((option) => !option.disabled);
  }

  private lastEnabledIndex(): number {
    for (let index = this.options.length - 1; index >= 0; index -= 1) {
      if (!this.options[index].disabled) return index;
    }
    return -1;
  }
}

@Component({
  selector: 'ibom-select',
  standalone: true,
  imports: [OverlayModule, IbomSelectPanelComponent],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => IbomSelectComponent),
    multi: true,
  }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ibom-select">
      <button
        #trigger
        class="ibom-field__control ibom-select__trigger"
        type="button"
        role="combobox"
        [id]="triggerId"
        [disabled]="isDisabled"
        [attr.aria-haspopup]="'listbox'"
        [attr.aria-expanded]="isOpen ? 'true' : 'false'"
        [attr.aria-controls]="listboxId"
        [attr.aria-label]="ariaLabel || null"
        [attr.aria-labelledby]="ariaLabelledby || null"
        [attr.aria-required]="required ? 'true' : null"
        [attr.aria-invalid]="invalid ? 'true' : null"
        [attr.aria-disabled]="isDisabled ? 'true' : null"
        (click)="toggle()"
        (keydown)="onTriggerKeydown($event)"
      >
        <span [class.ibom-select__placeholder]="!selectedOption()">{{ displayLabel() }}</span>
        <span class="ibom-select__indicator" aria-hidden="true">v</span>
      </button>
    </div>
  `,
  host: {
    class: 'ibom-select-host',
    '[attr.data-open]': 'isOpen ? "true" : null',
  },
})
export class IbomSelectComponent<T = unknown>
  implements ControlValueAccessor, OnChanges, OnDestroy {
  @Input() options: readonly IbomSelectOption<T>[] = [];
  @Input() value: T | null = null;
  @Input() placeholder = 'Select an option';
  @Input() placement: IbomOverlayPlacement = 'bottom-start';
  @Input() ariaLabel = '';
  @Input() ariaLabelledby = '';
  @Input() required = false;
  @Input() invalid = false;
  @Output() readonly valueChange = new EventEmitter<T | null>();

  readonly triggerId = createIbomPrimitiveId('ibom-select-trigger');
  readonly listboxId = createIbomPrimitiveId('ibom-select-listbox');
  isOpen = false;

  @ViewChild('trigger', { read: ElementRef })
  private triggerRef!: ElementRef<HTMLButtonElement>;

  private readonly overlay = inject(IbomOverlayService);
  private readonly focusMonitor = inject(FocusMonitor);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private overlayRef: OverlayRef | null = null;
  private panelRef: ComponentRef<IbomSelectPanelComponent<T>> | null = null;
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
    this.updatePanel();
  }

  selectedOption(): IbomSelectOption<T> | undefined {
    return this.options.find((option) => isSameIbomValue(option.value, this.value));
  }

  displayLabel(): string {
    return this.selectedOption()?.label ?? this.placeholder;
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  open(initial: 'first' | 'last' = 'first'): void {
    if (this.isOpen || this.isDisabled) return;

    this.isOpen = true;
    this.activeIndex = initial === 'last' ? this.lastEnabledIndex() : this.initialIndex();
    const overlayRef = this.overlay.create(this.triggerRef, {
      placement: this.placement,
      panelClass: 'ibom-select-overlay',
      matchOriginWidth: true,
    });
    this.overlayRef = overlayRef;
    this.panelRef = overlayRef.attach(
      new ComponentPortal(IbomSelectPanelComponent, this.viewContainerRef),
    ) as ComponentRef<IbomSelectPanelComponent<T>>;
    this.configurePanel();
    this.overlay.watchDismissal(overlayRef, this.triggerRef, this.destroyRef, () => this.close());
    overlayRef.detachments()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.handleExternalDetach(overlayRef));
    this.changeDetectorRef.markForCheck();
    this.panelRef.changeDetectorRef.detectChanges();
    this.panelRef.instance.focusActiveOption();
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

    if (restoreFocus && this.triggerRef?.nativeElement.isConnected !== false) {
      this.focusMonitor.focusVia(this.triggerRef, 'program');
    }
  }

  onTriggerKeydown(event: KeyboardEvent): void {
    if (this.isDisabled) return;
    if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

    event.preventDefault();
    this.open(event.key === 'ArrowUp' ? 'last' : 'first');
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

  private configurePanel(): void {
    if (!this.panelRef) return;
    this.panelRef.instance.listboxId = this.listboxId;
    this.panelRef.instance.update(this.options, this.value, this.activeIndex);
    this.activeIndex = this.panelRef.instance.activeIndex;
    this.panelRef.instance.activeIndexChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((index) => {
        this.activeIndex = index;
      });
    this.panelRef.instance.optionSelected
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((option) => this.selectOption(option));
    this.panelRef.instance.closed
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.close());
  }

  private updatePanel(): void {
    if (!this.panelRef) return;
    this.panelRef.instance.update(this.options, this.value, this.activeIndex);
    this.activeIndex = this.panelRef.instance.activeIndex;
    this.panelRef.changeDetectorRef.detectChanges();
  }

  private selectOption(option: IbomSelectOption<T>): void {
    if (option.disabled) return;
    this.value = option.value;
    this.valueChange.emit(this.value);
    this.onChange(this.value);
    this.close();
  }

  private initialIndex(): number {
    const selectedIndex = this.options.findIndex(
      (option) => !option.disabled && isSameIbomValue(option.value, this.value),
    );
    if (selectedIndex >= 0) return selectedIndex;
    return this.options.findIndex((option) => !option.disabled);
  }

  private lastEnabledIndex(): number {
    for (let index = this.options.length - 1; index >= 0; index -= 1) {
      if (!this.options[index].disabled) return index;
    }
    return -1;
  }

  private handleExternalDetach(overlayRef: OverlayRef): void {
    if (this.overlayRef !== overlayRef) return;
    this.overlayRef = null;
    this.panelRef = null;
    this.isOpen = false;
    this.changeDetectorRef.markForCheck();
  }
}
