import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, OnDestroy, PLATFORM_ID, inject, signal } from '@angular/core';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

@Injectable({ providedIn: 'root' })
export class IbomMotionPreferenceService implements OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly reducedMotionSignal = signal(false);
  private readonly mediaQueryList: MediaQueryList | null;
  private readonly onMediaQueryChange = (event: MediaQueryListEvent): void => {
    this.reducedMotionSignal.set(event.matches);
  };

  readonly reducedMotion = this.reducedMotionSignal.asReadonly();

  constructor() {
    const view = this.document.defaultView;

    if (!isPlatformBrowser(this.platformId) || !view || typeof view.matchMedia !== 'function') {
      this.mediaQueryList = null;
      return;
    }

    const mediaQueryList = view.matchMedia(REDUCED_MOTION_QUERY);
    this.mediaQueryList = mediaQueryList;
    this.reducedMotionSignal.set(mediaQueryList.matches);

    if (typeof mediaQueryList.addEventListener === 'function') {
      mediaQueryList.addEventListener('change', this.onMediaQueryChange);
    } else if (typeof mediaQueryList.addListener === 'function') {
      mediaQueryList.addListener(this.onMediaQueryChange);
    }
  }

  isReducedMotion(): boolean {
    return this.reducedMotion();
  }

  ngOnDestroy(): void {
    if (!this.mediaQueryList) return;

    if (typeof this.mediaQueryList.removeEventListener === 'function') {
      this.mediaQueryList.removeEventListener('change', this.onMediaQueryChange);
    } else if (typeof this.mediaQueryList.removeListener === 'function') {
      this.mediaQueryList.removeListener(this.onMediaQueryChange);
    }
  }
}
