import {
  AfterContentInit,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ComponentRef,
  ContentChild,
  DestroyRef,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  QueryList,
  SimpleChanges,
  ViewChildren,
  ViewChild,
  ViewContainerRef,
  inject,
} from '@angular/core';
import { FocusMonitor } from '@angular/cdk/a11y';
import { ComponentPortal } from '@angular/cdk/portal';
import { OverlayModule, OverlayRef } from '@angular/cdk/overlay';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  IbomOverlayPlacement,
  IbomOverlayService,
} from '../overlay/ibom-overlay.service';
import { IbomOverlayMotionDirective } from '../overlay/ibom-overlay-motion.directive';
import { IbomMenuItem } from './ibom-option.types';
import { createIbomPrimitiveId } from './ibom-primitive-utils';
import { IbomFloatingTriggerDirective } from './ibom-trigger.directive';

@Component({
  selector: 'ibom-menu-panel',
  standalone: true,
  imports: [IbomOverlayMotionDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      #panel
      class="ibom-menu-panel"
      [id]="menuId"
      role="menu"
      tabindex="-1"
      ibomOverlayMotion
      (keydown)="onKeydown($event)"
    >
      @for (item of items; track $index) {
        <button
          #itemElement
          class="ibom-menu-item"
          [class.is-active]="$index === activeIndex"
          [class.is-selected]="item.selected"
          [class.is-destructive]="item.destructive"
          type="button"
          role="menuitem"
          [attr.aria-disabled]="item.disabled ? 'true' : null"
          [attr.aria-current]="item.selected ? 'true' : null"
          [disabled]="item.disabled"
          (focus)="onItemFocus($index)"
          (click)="onItemClick($index)"
        >{{ item.label }}</button>
      }
    </div>
  `,
})
export class IbomMenuPanelComponent<T = unknown> implements AfterViewInit {
  @Input() items: readonly IbomMenuItem<T>[] = [];
  @Input() menuId = '';
  @Input() activeIndex = -1;

  @Output() readonly activeIndexChange = new EventEmitter<number>();
  @Output() readonly itemSelected = new EventEmitter<IbomMenuItem<T>>();
  @Output() readonly closed = new EventEmitter<void>();

  @ViewChildren('itemElement', { read: ElementRef })
  private itemElements!: QueryList<ElementRef<HTMLButtonElement>>;
  @ViewChild('panel', { read: ElementRef })
  private panelRef!: ElementRef<HTMLElement>;

  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly focusMonitor = inject(FocusMonitor);
  private initialized = false;

  ngAfterViewInit(): void {
    this.initialized = true;
  }

  update(items: readonly IbomMenuItem<T>[], activeIndex: number): void {
    this.items = items;
    this.activeIndex = this.normalizeIndex(activeIndex);
  }

  focusActiveItem(): void {
    if (!this.initialized) return;
    const element = this.itemElements.get(this.activeIndex)?.nativeElement;
    if (element) {
      this.focusMonitor.focusVia(element, 'keyboard');
      return;
    }
    this.focusMonitor.focusVia(this.panelElement(), 'program');
  }

  onItemFocus(index: number): void {
    if (this.items[index]?.disabled) return;
    this.setActiveIndex(index);
  }

  onItemClick(index: number): void {
    const item = this.items[index];
    if (!item || item.disabled) return;
    this.itemSelected.emit(item);
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
      this.focusActiveItem();
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      this.setActiveIndex(this.lastEnabledIndex());
      this.focusActiveItem();
      return;
    }
    if (event.key !== 'Enter' && event.key !== ' ') return;

    event.preventDefault();
    if (this.activeIndex >= 0) this.onItemClick(this.activeIndex);
  }

  private setActiveIndex(index: number): void {
    const nextIndex = this.normalizeIndex(index);
    if (nextIndex === -1) return;
    this.activeIndex = nextIndex;
    this.activeIndexChange.emit(nextIndex);
    this.changeDetectorRef.markForCheck();
  }

  private moveActive(direction: 1 | -1): void {
    if (!this.items.length) return;
    const start = this.activeIndex < 0 ? (direction === 1 ? -1 : this.items.length) : this.activeIndex;
    for (let offset = 1; offset <= this.items.length; offset += 1) {
      const index = (start + direction * offset + this.items.length) % this.items.length;
      if (this.items[index] && !this.items[index].disabled) {
        this.setActiveIndex(index);
        this.focusActiveItem();
        return;
      }
    }
  }

  private normalizeIndex(index: number): number {
    if (index >= 0 && index < this.items.length && !this.items[index].disabled) return index;
    return this.firstEnabledIndex();
  }

  private firstEnabledIndex(): number {
    return this.items.findIndex((item) => !item.disabled);
  }

  private lastEnabledIndex(): number {
    for (let index = this.items.length - 1; index >= 0; index -= 1) {
      if (!this.items[index].disabled) return index;
    }
    return -1;
  }

  private panelElement(): HTMLElement {
    return this.panelRef.nativeElement;
  }
}

@Component({
  selector: 'ibom-menu',
  standalone: true,
  imports: [OverlayModule, IbomFloatingTriggerDirective, IbomMenuPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content select="[ibomMenuTrigger]"></ng-content>`,
  host: {
    class: 'ibom-menu-host',
    '[attr.data-open]': 'isOpen ? "true" : null',
  },
})
export class IbomMenuComponent<T = unknown> implements AfterContentInit, OnChanges, OnDestroy {
  @Input() items: readonly IbomMenuItem<T>[] = [];
  @Input() disabled = false;
  @Input() placement: IbomOverlayPlacement = 'bottom-start';
  @Output() readonly itemSelected = new EventEmitter<T>();
  @Output() readonly opened = new EventEmitter<void>();
  @Output() readonly closed = new EventEmitter<void>();

  readonly menuId = createIbomPrimitiveId('ibom-menu');
  isOpen = false;

  @ContentChild(IbomFloatingTriggerDirective)
  private trigger?: IbomFloatingTriggerDirective;

  private readonly overlay = inject(IbomOverlayService);
  private readonly focusMonitor = inject(FocusMonitor);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private overlayRef: OverlayRef | null = null;
  private panelRef: ComponentRef<IbomMenuPanelComponent<T>> | null = null;
  private activeIndex = -1;
  private triggerConfigured = false;

  ngAfterContentInit(): void {
    this.configureTrigger();
  }

  ngOnChanges(_changes: SimpleChanges): void {
    this.configureTrigger();
    this.updatePanel();
  }

  open(initial: 'first' | 'last' = 'first'): void {
    if (this.isOpen || this.disabled || !this.trigger || this.trigger.disabled) return;

    this.isOpen = true;
    this.activeIndex = initial === 'last' ? this.lastEnabledIndex() : this.initialIndex();
    this.trigger.setExpanded(true);
    const overlayRef = this.overlay.create(this.trigger.elementRef, {
      placement: this.placement,
      panelClass: 'ibom-menu-overlay',
    });
    this.overlayRef = overlayRef;
    this.panelRef = overlayRef.attach(
      new ComponentPortal(IbomMenuPanelComponent, this.viewContainerRef),
    ) as ComponentRef<IbomMenuPanelComponent<T>>;
    this.configurePanel();
    this.overlay.watchDismissal(overlayRef, this.trigger.elementRef, this.destroyRef, () => this.close());
    overlayRef.detachments()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.handleExternalDetach(overlayRef));
    this.opened.emit();
    this.changeDetectorRef.markForCheck();
    this.panelRef.changeDetectorRef.detectChanges();
    this.panelRef.instance.focusActiveItem();
  }

  close(restoreFocus = true): void {
    if (!this.isOpen) return;

    const overlayRef = this.overlayRef;
    const trigger = this.trigger;
    this.overlayRef = null;
    this.panelRef = null;
    this.isOpen = false;
    trigger?.setExpanded(false);
    overlayRef?.dispose();
    this.closed.emit();
    this.changeDetectorRef.markForCheck();

    if (restoreFocus && trigger && trigger.elementRef.nativeElement.isConnected !== false) {
      this.focusMonitor.focusVia(trigger.elementRef, 'program');
    }
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  ngOnDestroy(): void {
    this.close(false);
  }

  private configureTrigger(): void {
    if (!this.trigger || this.triggerConfigured) {
      this.trigger?.setOwnerDisabled(this.disabled);
      return;
    }

    this.trigger.configure('menu', this.menuId);
    this.trigger.setOwnerDisabled(this.disabled);
    this.trigger.activated
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.toggle());
    this.trigger.keyboardActivated
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((initial) => this.open(initial));
    this.triggerConfigured = true;
  }

  private configurePanel(): void {
    if (!this.panelRef) return;
    this.panelRef.instance.menuId = this.menuId;
    this.panelRef.instance.update(this.items, this.activeIndex);
    this.panelRef.instance.activeIndexChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((index) => {
        this.activeIndex = index;
      });
    this.panelRef.instance.itemSelected
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((item) => {
        this.itemSelected.emit(item.value);
        this.close();
      });
    this.panelRef.instance.closed
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.close());
  }

  private updatePanel(): void {
    if (!this.panelRef) return;
    this.panelRef.instance.update(this.items, this.activeIndex);
    this.activeIndex = this.panelRef.instance.activeIndex;
    this.panelRef.changeDetectorRef.detectChanges();
  }

  private initialIndex(): number {
    const selectedIndex = this.items.findIndex((item) => item.selected && !item.disabled);
    if (selectedIndex >= 0) return selectedIndex;
    return this.items.findIndex((item) => !item.disabled);
  }

  private lastEnabledIndex(): number {
    for (let index = this.items.length - 1; index >= 0; index -= 1) {
      if (!this.items[index].disabled) return index;
    }
    return -1;
  }

  private handleExternalDetach(overlayRef: OverlayRef): void {
    if (this.overlayRef !== overlayRef) return;
    this.overlayRef = null;
    this.panelRef = null;
    this.isOpen = false;
    this.trigger?.setExpanded(false);
    this.changeDetectorRef.markForCheck();
  }
}
