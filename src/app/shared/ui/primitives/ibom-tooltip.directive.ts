import {
  ChangeDetectionStrategy,
  Component,
  ComponentRef,
  DestroyRef,
  Directive,
  ElementRef,
  HostBinding,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Renderer2,
  SimpleChanges,
  ViewContainerRef,
  inject,
} from '@angular/core';
import { ComponentPortal } from '@angular/cdk/portal';
import { OverlayRef } from '@angular/cdk/overlay';

import { IbomOverlayMotionDirective } from '../overlay/ibom-overlay-motion.directive';
import { IbomOverlayService } from '../overlay/ibom-overlay.service';
import { createIbomPrimitiveId } from './ibom-primitive-utils';

@Component({
  selector: 'ibom-tooltip-panel',
  standalone: true,
  imports: [IbomOverlayMotionDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ibom-tooltip" [id]="tooltipId" role="tooltip" ibomOverlayMotion>{{ text }}</div>
  `,
})
export class IbomTooltipPanelComponent {
  @Input() text = '';
  @Input() tooltipId = '';
}

@Directive({
  selector: '[ibomTooltip]',
  standalone: true,
})
export class IbomTooltipDirective implements OnChanges, OnDestroy {
  @Input('ibomTooltip') text = '';
  @Input() ibomTooltipDisabled = false;
  @Input() ibomTooltipShowDelay = 350;
  @Input() ibomTooltipHideDelay = 0;

  @HostBinding('attr.aria-disabled') get ariaDisabled(): string | null {
    return this.ibomTooltipDisabled ? 'true' : null;
  }

  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);
  private readonly overlay = inject(IbomOverlayService);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly tooltipId = createIbomPrimitiveId('ibom-tooltip');
  private readonly originalDescribedBy: string | null;
  private overlayRef: OverlayRef | null = null;
  private panelRef: ComponentRef<IbomTooltipPanelComponent> | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private hovered = false;
  private focused = false;
  private isOpen = false;

  constructor() {
    this.originalDescribedBy = this.elementRef.nativeElement.getAttribute('aria-describedby');
  }

  ngOnChanges(_changes: SimpleChanges): void {
    if (!this.isOpen) return;
    if (this.isDisabled() || !this.text.trim()) {
      this.close();
      return;
    }
    if (this.panelRef) {
      this.panelRef.instance.text = this.text;
      this.panelRef.changeDetectorRef.detectChanges();
    }
  }

  @HostListener('mouseenter')
  onMouseEnter(): void {
    this.hovered = true;
    this.scheduleOpen(this.ibomTooltipShowDelay);
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.hovered = false;
    if (!this.focused) this.scheduleClose(this.ibomTooltipHideDelay);
  }

  @HostListener('focusin')
  onFocusIn(): void {
    this.focused = true;
    this.scheduleOpen(0);
  }

  @HostListener('focusout', ['$event'])
  onFocusOut(event: FocusEvent): void {
    if (event.relatedTarget && this.elementRef.nativeElement.contains(event.relatedTarget as Node)) return;
    this.focused = false;
    if (!this.hovered) this.scheduleClose(this.ibomTooltipHideDelay);
  }

  @HostListener('keydown.escape')
  onEscape(): void {
    this.close();
  }

  ngOnDestroy(): void {
    this.clearTimer();
    this.close();
  }

  private open(): void {
    if (this.isOpen || this.isDisabled() || !this.text.trim()) return;

    this.isOpen = true;
    this.setDescribedBy(true);
    const overlayRef = this.overlay.create(this.elementRef, {
      placement: 'top',
      panelClass: 'ibom-tooltip-overlay',
    });
    this.overlayRef = overlayRef;
    const panelRef = overlayRef.attach(new ComponentPortal(IbomTooltipPanelComponent, this.viewContainerRef));
    this.panelRef = panelRef;
    panelRef.instance.text = this.text;
    panelRef.instance.tooltipId = this.tooltipId;
    panelRef.changeDetectorRef.detectChanges();
    this.overlay.watchDismissal(overlayRef, this.elementRef, this.destroyRef, () => this.close());
    overlayRef.detachments().subscribe(() => {
      if (this.overlayRef !== overlayRef) return;
      this.overlayRef = null;
      this.panelRef = null;
      this.isOpen = false;
      this.setDescribedBy(false);
    });
  }

  private close(): void {
    if (!this.isOpen && !this.overlayRef) return;

    this.isOpen = false;
    this.setDescribedBy(false);
    this.overlayRef?.dispose();
    this.overlayRef = null;
    this.panelRef = null;
  }

  private scheduleOpen(delay: number): void {
    this.clearTimer();
    if (delay <= 0) {
      this.open();
      return;
    }
    this.timer = setTimeout(() => {
      this.timer = null;
      this.open();
    }, delay);
  }

  private scheduleClose(delay: number): void {
    this.clearTimer();
    if (delay <= 0) {
      this.close();
      return;
    }
    this.timer = setTimeout(() => {
      this.timer = null;
      if (!this.hovered && !this.focused) this.close();
    }, delay);
  }

  private clearTimer(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }

  private setDescribedBy(open: boolean): void {
    if (!open) {
      if (this.originalDescribedBy) {
        this.renderer.setAttribute(this.elementRef.nativeElement, 'aria-describedby', this.originalDescribedBy);
      } else {
        this.renderer.removeAttribute(this.elementRef.nativeElement, 'aria-describedby');
      }
      return;
    }

    const ids = [this.originalDescribedBy, this.tooltipId].filter(Boolean).join(' ');
    this.renderer.setAttribute(this.elementRef.nativeElement, 'aria-describedby', ids);
  }

  private isDisabled(): boolean {
    const element = this.elementRef.nativeElement as HTMLButtonElement;
    return this.ibomTooltipDisabled || element.disabled === true;
  }
}
