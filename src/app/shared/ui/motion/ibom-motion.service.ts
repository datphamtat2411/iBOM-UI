import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { gsap } from 'gsap';

import { IbomMotionPreferenceService } from './ibom-motion-preference.service';

export type IbomMotionDuration = 'none' | 'fast' | 'normal' | 'deliberate';
export type IbomMotionEase = 'standard' | 'enter' | 'exit';

export interface IbomMotionState {
  opacity?: number;
  x?: number;
  y?: number;
  scale?: number;
}

export interface IbomMotionOptions {
  duration?: IbomMotionDuration;
  ease?: IbomMotionEase;
  onComplete?: () => void;
}

interface MotionDefaults {
  duration: IbomMotionDuration;
  ease: IbomMotionEase;
}

const DURATION_TOKENS: Record<IbomMotionDuration, string> = {
  none: '--ibom-motion-none',
  fast: '--ibom-motion-fast',
  normal: '--ibom-motion-normal',
  deliberate: '--ibom-motion-deliberate',
};

const FALLBACK_DURATION_MS: Record<IbomMotionDuration, number> = {
  none: 0,
  fast: 140,
  normal: 180,
  deliberate: 220,
};

const FALLBACK_DISTANCE_PX = 6;
const FALLBACK_SCALE = 0.98;

const GSAP_EASES: Record<IbomMotionEase, string> = {
  standard: 'power2.out',
  enter: 'power2.out',
  exit: 'power1.in',
};

@Injectable({ providedIn: 'root' })
export class IbomMotionService {
  private readonly document = inject(DOCUMENT);
  private readonly preference = inject(IbomMotionPreferenceService);

  createScope(destroyRef: DestroyRef, scope?: Element): IbomMotionController {
    return new IbomMotionController(this.preference, this.document, destroyRef, scope);
  }
}

export class IbomMotionController {
  private readonly context: gsap.Context;
  private destroyed = false;

  constructor(
    private readonly preference: IbomMotionPreferenceService,
    private readonly document: Document,
    destroyRef: DestroyRef,
    scope?: Element,
  ) {
    this.context = gsap.context(() => undefined, scope);
    destroyRef.onDestroy(() => this.destroy());
  }

  fadeIn(target: gsap.TweenTarget, options: IbomMotionOptions = {}): gsap.core.Tween {
    return this.to(target, { opacity: 1 }, options, { duration: 'normal', ease: 'enter' });
  }

  fadeOut(target: gsap.TweenTarget, options: IbomMotionOptions = {}): gsap.core.Tween {
    return this.to(target, { opacity: 0 }, options, { duration: 'fast', ease: 'exit' });
  }

  enter(target: gsap.TweenTarget, options: IbomMotionOptions = {}): gsap.core.Tween {
    const distance = this.readNumberToken('--ibom-motion-distance-sm', FALLBACK_DISTANCE_PX);
    return this.fromTo(
      target,
      { opacity: 0, y: distance },
      { opacity: 1, y: 0 },
      options,
      { duration: 'normal', ease: 'enter' },
    );
  }

  exit(target: gsap.TweenTarget, options: IbomMotionOptions = {}): gsap.core.Tween {
    const distance = this.readNumberToken('--ibom-motion-distance-sm', FALLBACK_DISTANCE_PX);
    return this.to(
      target,
      { opacity: 0, y: distance },
      options,
      { duration: 'fast', ease: 'exit' },
    );
  }

  surfaceEnter(target: gsap.TweenTarget, options: IbomMotionOptions = {}): gsap.core.Tween {
    const distance = this.readNumberToken('--ibom-motion-distance-sm', FALLBACK_DISTANCE_PX);
    const scale = this.readNumberToken('--ibom-motion-scale-enter', FALLBACK_SCALE);
    return this.fromTo(
      target,
      { opacity: 0, y: distance, scale },
      { opacity: 1, y: 0, scale: 1 },
      options,
      { duration: 'deliberate', ease: 'enter' },
    );
  }

  transition(
    target: gsap.TweenTarget,
    from: IbomMotionState,
    to: IbomMotionState,
    options: IbomMotionOptions = {},
  ): gsap.core.Tween {
    return this.fromTo(target, from, to, options, { duration: 'normal', ease: 'standard' });
  }

  private to(
    target: gsap.TweenTarget,
    state: IbomMotionState,
    options: IbomMotionOptions,
    defaults: MotionDefaults,
  ): gsap.core.Tween {
    return this.run(() => {
      if (this.preference.isReducedMotion()) {
        const tween = gsap.set(target, state);
        options.onComplete?.();
        return tween;
      }

      return gsap.to(target, this.withDefaults(state, options, defaults));
    });
  }

  private fromTo(
    target: gsap.TweenTarget,
    from: IbomMotionState,
    to: IbomMotionState,
    options: IbomMotionOptions,
    defaults: MotionDefaults,
  ): gsap.core.Tween {
    return this.run(() => {
      if (this.preference.isReducedMotion()) {
        const tween = gsap.set(target, to);
        options.onComplete?.();
        return tween;
      }

      return gsap.fromTo(target, { ...from }, this.withDefaults(to, options, defaults));
    });
  }

  private withDefaults(
    state: IbomMotionState,
    options: IbomMotionOptions,
    defaults: MotionDefaults,
  ): gsap.TweenVars {
    return {
      ...state,
      duration: this.resolveDuration(options.duration ?? defaults.duration),
      ease: GSAP_EASES[options.ease ?? defaults.ease],
      ...(options.onComplete ? { onComplete: options.onComplete } : {}),
    };
  }

  private resolveDuration(duration: IbomMotionDuration): number {
    if (this.preference.isReducedMotion()) return 0;

    const fallback = FALLBACK_DURATION_MS[duration] / 1000;
    const value = this.readToken(DURATION_TOKENS[duration]);
    if (!value) return fallback;

    if (value.endsWith('ms')) {
      const milliseconds = Number.parseFloat(value);
      return Number.isFinite(milliseconds) ? milliseconds / 1000 : fallback;
    }

    if (value.endsWith('s')) {
      const seconds = Number.parseFloat(value);
      return Number.isFinite(seconds) ? seconds : fallback;
    }

    return fallback;
  }

  private readNumberToken(name: string, fallback: number): number {
    const value = Number.parseFloat(this.readToken(name));
    return Number.isFinite(value) ? value : fallback;
  }

  private readToken(name: string): string {
    const view = this.document.defaultView;
    const root = this.document.documentElement;
    if (!view || !root || typeof view.getComputedStyle !== 'function') return '';

    return view.getComputedStyle(root).getPropertyValue(name).trim();
  }

  private run(create: () => gsap.core.Tween): gsap.core.Tween {
    if (this.destroyed) {
      throw new Error('Cannot animate with a destroyed iBOM motion scope.');
    }

    return this.context.add(create);
  }

  private destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.context.revert();
  }
}
