import { AfterViewInit, Directive, ElementRef, OnDestroy, inject } from '@angular/core';

@Directive({
  selector: '.master-combobox-popup, .category-filter-options, .proficiency-options',
  standalone: true,
})
export class MasterComboboxPopupDirective implements AfterViewInit, OnDestroy {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly reposition = (): void => this.positionPopup();

  ngAfterViewInit(): void {
    document.addEventListener('scroll', this.reposition, true);
    window.addEventListener('resize', this.reposition);
    this.positionPopup();
  }

  ngOnDestroy(): void {
    document.removeEventListener('scroll', this.reposition, true);
    window.removeEventListener('resize', this.reposition);
  }

  private positionPopup(): void {
    const trigger = this.element.parentElement?.querySelector<HTMLElement>('input, button');
    if (!trigger) return;

    const triggerBounds = trigger.getBoundingClientRect();
    const viewportPadding = 8;
    const gap = 5;
    const preferredMaxHeight = Number.parseFloat(getComputedStyle(this.element).maxHeight) || 290;
    const spaceBelow = Math.max(0, window.innerHeight - viewportPadding - triggerBounds.bottom - gap);
    const maxHeight = Math.min(preferredMaxHeight, spaceBelow);

    this.element.style.left = `${triggerBounds.left}px`;
    this.element.style.width = `${triggerBounds.width}px`;
    this.element.style.maxHeight = `${maxHeight}px`;
    this.element.style.top = `${triggerBounds.bottom + gap}px`;
  }
}
