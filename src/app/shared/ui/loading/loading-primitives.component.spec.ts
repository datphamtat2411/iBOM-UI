import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IbomLoadingButtonComponent } from './loading-button.component';
import { IbomLoadingIndicatorComponent } from './loading-indicator.component';
import { IbomSkeletonComponent } from './skeleton.component';

@Component({
  standalone: true,
  imports: [IbomLoadingButtonComponent, IbomLoadingIndicatorComponent, IbomSkeletonComponent],
  template: `
    <ibom-skeleton variant="circle" [width]="32" [height]="32" />
    <ibom-loading-indicator label="Searching..." />
    <button class="ibom-button" ibomLoadingButton [loading]="loading" loadingLabel="Saving..." (click)="incrementClicks()">Save</button>
  `,
})
class LoadingPrimitivesHostComponent {
  loading = false;
  clicks = 0;

  incrementClicks(): void {
    this.clicks += 1;
  }
}

describe('iBOM loading primitives', () => {
  let fixture: ComponentFixture<LoadingPrimitivesHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingPrimitivesHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoadingPrimitivesHostComponent);
    fixture.detectChanges();
  });

  it('keeps skeleton placeholders hidden and applies configured dimensions', () => {
    const skeleton = fixture.nativeElement.querySelector('ibom-skeleton') as HTMLElement;

    expect(skeleton.classList).toContain('ibom-skeleton--circle');
    expect(skeleton.getAttribute('aria-hidden')).toBe('true');
    expect(skeleton.style.width).toBe('32px');
    expect(skeleton.style.height).toBe('32px');
  });

  it('announces inline loading text through a polite status', () => {
    const indicator = fixture.nativeElement.querySelector('ibom-loading-indicator') as HTMLElement;

    expect(indicator.getAttribute('role')).toBe('status');
    expect(indicator.getAttribute('aria-live')).toBe('polite');
    expect(indicator.textContent).toContain('Searching...');
  });

  it('exposes busy and disabled button state while preserving the label space', () => {
    const component = fixture.componentInstance;
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    component.loading = true;
    fixture.detectChanges();

    expect(button.disabled).toBeTrue();
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.querySelector('.ibom-loading-button__indicator')).not.toBeNull();
    expect(button.textContent).toContain('Save');
    button.click();
    expect(component.clicks).toBe(0);

    component.loading = false;
    fixture.detectChanges();
    expect(button.disabled).toBeFalse();
    expect(button.getAttribute('aria-busy')).toBeNull();
    expect(button.querySelector('.ibom-loading-button__indicator')).toBeNull();
  });
});
