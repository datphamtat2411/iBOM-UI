import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { gsap } from 'gsap';

import { IbomMotionPreferenceService } from './ibom-motion-preference.service';
import { IbomMotionService } from './ibom-motion.service';

@Component({
  standalone: true,
  template: '',
})
class MotionHostComponent {
  readonly motion = inject(IbomMotionService).createScope(inject(DestroyRef));
}

describe('IbomMotionService', () => {
  let fixture: ComponentFixture<MotionHostComponent>;
  let reducedMotion: ReturnType<typeof signal<boolean>>;

  beforeEach(async () => {
    reducedMotion = signal(false);
    const preference = {
      reducedMotion: reducedMotion.asReadonly(),
      isReducedMotion: () => reducedMotion(),
    } as unknown as IbomMotionPreferenceService;

    await TestBed.configureTestingModule({
      imports: [MotionHostComponent],
      providers: [
        IbomMotionService,
        { provide: IbomMotionPreferenceService, useValue: preference },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('uses the shared normal duration by default', () => {
    fixture = TestBed.createComponent(MotionHostComponent);
    const element = document.createElement('div');
    const tween = fixture.componentInstance.motion.fadeIn(element);

    expect(tween.duration()).toBeCloseTo(0.18, 3);

    tween.kill();
  });

  it('sets the final state immediately when reduced motion is active', () => {
    reducedMotion.set(true);
    fixture = TestBed.createComponent(MotionHostComponent);
    const element = document.createElement('div');

    const tween = fixture.componentInstance.motion.surfaceEnter(element);

    expect(tween.duration()).toBe(0);
    expect(gsap.getProperty(element, 'opacity')).toBe(1);
    expect(gsap.getProperty(element, 'y')).toBe(0);
    expect(gsap.getProperty(element, 'scale')).toBe(1);
  });

  it('reverts and kills animations when the Angular owner is destroyed', () => {
    fixture = TestBed.createComponent(MotionHostComponent);
    const element = document.createElement('div');
    element.style.opacity = '0';

    const tween = fixture.componentInstance.motion.fadeIn(element, { duration: 'deliberate' });
    fixture.destroy();

    expect(tween.isActive()).toBeFalse();
    expect(element.style.opacity).toBe('0');
  });
});
