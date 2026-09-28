import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { IbomMotionPreferenceService } from './ibom-motion-preference.service';

describe('IbomMotionPreferenceService', () => {
  it('reads and tracks the reduced-motion media preference', () => {
    let listener: ((event: MediaQueryListEvent) => void) | undefined;
    const mediaQueryList = {
      matches: false,
      addEventListener: jasmine.createSpy('addEventListener').and.callFake(
        (_type: string, callback: (event: MediaQueryListEvent) => void) => {
          listener = callback;
        },
      ),
      removeEventListener: jasmine.createSpy('removeEventListener'),
    } as unknown as MediaQueryList;
    const matchMedia = spyOn(window, 'matchMedia').and.returnValue(mediaQueryList);

    TestBed.configureTestingModule({
      providers: [
        IbomMotionPreferenceService,
      ],
    });
    const service = TestBed.inject(IbomMotionPreferenceService);

    expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    expect(service.isReducedMotion()).toBeFalse();

    listener?.({ matches: true } as MediaQueryListEvent);

    expect(service.reducedMotion()).toBeTrue();
  });

  it('falls back safely when a browser media query API is unavailable', () => {
    TestBed.configureTestingModule({
      providers: [
        IbomMotionPreferenceService,
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });

    const service = TestBed.inject(IbomMotionPreferenceService);

    expect(service.isReducedMotion()).toBeFalse();
  });

  it('removes its media-query listener during destruction', () => {
    const mediaQueryList = {
      matches: true,
      addEventListener: jasmine.createSpy('addEventListener'),
      removeEventListener: jasmine.createSpy('removeEventListener'),
    } as unknown as MediaQueryList;
    spyOn(window, 'matchMedia').and.returnValue(mediaQueryList);

    TestBed.configureTestingModule({
      providers: [
        IbomMotionPreferenceService,
      ],
    });
    const service = TestBed.inject(IbomMotionPreferenceService);

    service.ngOnDestroy();

    expect(mediaQueryList.removeEventListener).toHaveBeenCalledWith(
      'change',
      jasmine.any(Function),
    );
  });
});
