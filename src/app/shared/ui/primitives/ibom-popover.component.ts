import {
  AfterContentInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  DestroyRef,
  Directive,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
  inject,
} from '@angular/core';
import { FocusMonitor } from '@angular/cdk/a11y';
import { TemplatePortal } from '@angular/cdk/portal';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  IbomOverlayPlacement,
  IbomOverlayService,
} from '../overlay/ibom-overlay.service';
import { IbomOverlayMotionDirective } from '../overlay/ibom-overlay-motion.directive';
import { IbomFloatingTriggerDirective } from './ibom-trigger.directive';
import { createIbomPrimitiveId } from './ibom-primitive-utils';

@Directive({
  selector: '[ibomPopoverContent]',
  standalone: true,
})
export class IbomPopoverContentDirective {}

@Component({
  selector: 'ibom-popover',
  standalone: true,
  imports: [IbomFloatingTriggerDirective, IbomPopoverContentDirective, IbomOverlayMotionDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content select="[ibomPopoverTrigger]"></ng-content>
    <ng-template #contentTemplate>
      <section
        class="ibom-popover"
        [id]="surfaceId"
        role="dialog"
        aria-modal="false"
        tabindex="-1"
        ibomOverlayMotion
      >
        <ng-content select="[ibomPopoverContent]"></ng-content>
      </section>
    </ng-template>
  `,
  host: {
    class: 'ibom-popover-host',
    '[attr.data-open]': 'isOpen ? "true" : null',
  },
})
export class IbomPopoverComponent implements AfterContentInit, OnChanges, OnDestroy {
  @Input() disabled = false;
  @Input() placement: IbomOverlayPlacement = 'bottom-start';
  @Output() readonly opened = new EventEmitter<void>();
  @Output() readonly closed = new EventEmitter<void>();

  readonly surfaceId = createIbomPrimitiveId('ibom-popover');
  isOpen = false;

  @ContentChild(IbomFloatingTriggerDirective)
  private trigger?: IbomFloatingTriggerDirective;
  @ViewChild('contentTemplate', { read: TemplateRef })
  private contentTemplate?: TemplateRef<unknown>;

  private readonly overlay = inject(IbomOverlayService);
  private readonly focusMonitor = inject(FocusMonitor);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private overlayRef: import('@angular/cdk/overlay').OverlayRef | null = null;
  private triggerConfigured = false;

  ngAfterContentInit(): void {
    this.configureTrigger();
  }

  ngOnChanges(_changes: SimpleChanges): void {
    this.configureTrigger();
  }

  open(): void {
    if (this.isOpen || this.disabled || !this.trigger || this.trigger.disabled || !this.contentTemplate) return;

    this.isOpen = true;
    this.trigger.setExpanded(true);
    const overlayRef = this.overlay.create(this.trigger.elementRef, {
      placement: this.placement,
      panelClass: 'ibom-popover-overlay',
    });
    this.overlayRef = overlayRef;
    overlayRef.attach(new TemplatePortal(this.contentTemplate, this.viewContainerRef));
    this.overlay.watchDismissal(overlayRef, this.trigger.elementRef, this.destroyRef, () => this.close());
    overlayRef.detachments()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.handleExternalDetach(overlayRef));
    this.opened.emit();
    this.changeDetectorRef.markForCheck();
    this.focusContent(overlayRef);
  }

  close(restoreFocus = true): void {
    if (!this.isOpen) return;

    const overlayRef = this.overlayRef;
    const trigger = this.trigger;
    this.overlayRef = null;
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

    this.trigger.configure('dialog', this.surfaceId);
    this.trigger.setOwnerDisabled(this.disabled);
    this.trigger.activated
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.toggle());
    this.triggerConfigured = true;
  }

  private focusContent(overlayRef: import('@angular/cdk/overlay').OverlayRef): void {
    const focusTarget = overlayRef.overlayElement.querySelector<HTMLElement>(
      '[autofocus], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    ) ?? overlayRef.overlayElement.querySelector<HTMLElement>(`#${this.surfaceId}`);
    if (focusTarget) this.focusMonitor.focusVia(focusTarget, 'program');
  }

  private handleExternalDetach(overlayRef: import('@angular/cdk/overlay').OverlayRef): void {
    if (this.overlayRef !== overlayRef) return;
    this.overlayRef = null;
    this.isOpen = false;
    this.trigger?.setExpanded(false);
    this.changeDetectorRef.markForCheck();
  }
}
