import { AfterViewInit, DestroyRef, Directive, ElementRef, inject } from '@angular/core';

import { IbomMotionService } from '../motion/ibom-motion.service';

@Directive({
  selector: '[ibomOverlayMotion]',
  standalone: true,
  host: { class: 'ibom-motion-surface-enter' },
})
export class IbomOverlayMotionDirective implements AfterViewInit {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly motion = inject(IbomMotionService).createScope(
    inject(DestroyRef),
    this.elementRef.nativeElement,
  );

  ngAfterViewInit(): void {
    this.motion.surfaceEnter(this.elementRef.nativeElement);
  }
}
