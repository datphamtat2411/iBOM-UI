import { DestroyRef, ElementRef, Injectable, inject } from '@angular/core';
import { ConnectedPosition, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { filter, map, merge } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export type IbomOverlayPlacement =
  | 'bottom-start'
  | 'bottom-end'
  | 'top-start'
  | 'top-end'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right';

export type IbomOverlayDismissReason = 'escape' | 'outside';

export interface IbomOverlayConfig {
  placement?: IbomOverlayPlacement;
  panelClass?: string | string[];
  matchOriginWidth?: boolean;
  minWidth?: number | string;
  maxWidth?: number | string;
  viewportMargin?: number;
}

@Injectable({ providedIn: 'root' })
export class IbomOverlayService {
  private readonly overlay = inject(Overlay);

  create(origin: ElementRef<HTMLElement>, config: IbomOverlayConfig = {}): OverlayRef {
    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(origin)
      .withPositions(this.positions(config.placement ?? 'bottom-start'))
      .withFlexibleDimensions(false)
      .withPush(true)
      .withViewportMargin(config.viewportMargin ?? 8);
    const originWidth = config.matchOriginWidth
      ? origin.nativeElement.getBoundingClientRect().width
      : 0;
    const panelClass = [
      'ibom-overlay-pane',
      ...(Array.isArray(config.panelClass)
        ? config.panelClass
        : config.panelClass
          ? [config.panelClass]
          : []),
    ];

    return this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      panelClass,
      minWidth: config.minWidth ?? (originWidth > 0 ? originWidth : undefined),
      maxWidth: config.maxWidth,
      disposeOnNavigation: true,
    });
  }

  watchDismissal(
    overlayRef: OverlayRef,
    origin: ElementRef<HTMLElement>,
    destroyRef: DestroyRef,
    dismiss: (reason: IbomOverlayDismissReason) => void,
  ): void {
    merge(
      overlayRef.keydownEvents().pipe(
        filter((event) => event.key === 'Escape'),
        map((): IbomOverlayDismissReason => 'escape'),
      ),
      overlayRef.outsidePointerEvents().pipe(
        filter((event) => !origin.nativeElement.contains(event.target as Node)),
        map((): IbomOverlayDismissReason => 'outside'),
      ),
    )
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(dismiss);
  }

  private positions(placement: IbomOverlayPlacement): ConnectedPosition[] {
    if (placement === 'top' || placement === 'bottom' || placement === 'left' || placement === 'right') {
      return this.tooltipPositions(placement);
    }

    const belowStart: ConnectedPosition = {
      originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4,
    };
    const belowEnd: ConnectedPosition = {
      originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 4,
    };
    const aboveStart: ConnectedPosition = {
      originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4,
    };
    const aboveEnd: ConnectedPosition = {
      originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -4,
    };

    switch (placement) {
      case 'bottom-end':
        return [belowEnd, belowStart, aboveEnd, aboveStart];
      case 'top-start':
        return [aboveStart, aboveEnd, belowStart, belowEnd];
      case 'top-end':
        return [aboveEnd, aboveStart, belowEnd, belowStart];
      case 'bottom-start':
      default:
        return [belowStart, belowEnd, aboveStart, aboveEnd];
    }
  }

  private tooltipPositions(placement: 'top' | 'bottom' | 'left' | 'right'): ConnectedPosition[] {
    const top: ConnectedPosition = {
      originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom', offsetY: -8,
    };
    const bottom: ConnectedPosition = {
      originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: 8,
    };
    const left: ConnectedPosition = {
      originX: 'start', originY: 'center', overlayX: 'end', overlayY: 'center', offsetX: -8,
    };
    const right: ConnectedPosition = {
      originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center', offsetX: 8,
    };

    switch (placement) {
      case 'bottom':
        return [bottom, top, right, left];
      case 'left':
        return [left, right, bottom, top];
      case 'right':
        return [right, left, bottom, top];
      case 'top':
      default:
        return [top, bottom, right, left];
    }
  }
}
