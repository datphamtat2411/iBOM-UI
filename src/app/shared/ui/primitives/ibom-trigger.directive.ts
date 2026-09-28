import { Directive, ElementRef, EventEmitter, HostBinding, HostListener, Input, Output, inject } from '@angular/core';

@Directive({
  selector: '[ibomPopoverTrigger], [ibomMenuTrigger]',
  standalone: true,
  exportAs: 'ibomFloatingTrigger',
})
export class IbomFloatingTriggerDirective {
  @Input('ibomPopoverTriggerDisabled') ibomPopoverTriggerDisabled = false;
  @Input('ibomMenuTriggerDisabled') ibomMenuTriggerDisabled = false;

  @Output() readonly activated = new EventEmitter<void>();
  @Output() readonly keyboardActivated = new EventEmitter<'first' | 'last'>();

  @HostBinding('attr.aria-expanded') expanded = 'false';
  @HostBinding('attr.aria-controls') controls: string | null = null;
  @HostBinding('attr.aria-haspopup') popupRole: 'dialog' | 'menu' = 'dialog';
  @HostBinding('attr.aria-disabled') get ariaDisabled(): string | null {
    return this.disabled ? 'true' : null;
  }

  private ownerDisabled = false;
  private readonly element = inject(ElementRef<HTMLElement>);

  get elementRef(): ElementRef<HTMLElement> {
    return this.element;
  }

  get disabled(): boolean {
    const nativeElement = this.element.nativeElement as HTMLButtonElement;
    return this.ownerDisabled
      || this.ibomPopoverTriggerDisabled
      || this.ibomMenuTriggerDisabled
      || nativeElement.disabled === true;
  }

  configure(popupRole: 'dialog' | 'menu', controls: string): void {
    this.popupRole = popupRole;
    this.controls = controls;
  }

  setOwnerDisabled(disabled: boolean): void {
    this.ownerDisabled = disabled;
  }

  setExpanded(expanded: boolean): void {
    this.expanded = expanded ? 'true' : 'false';
  }

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {
    if (this.disabled) {
      event.preventDefault();
      return;
    }
    this.activated.emit();
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (this.disabled) return;

    if (this.isMenuTrigger() && event.key === 'ArrowDown') {
      event.preventDefault();
      this.keyboardActivated.emit('first');
      return;
    }

    if (this.isMenuTrigger() && event.key === 'ArrowUp') {
      event.preventDefault();
      this.keyboardActivated.emit('last');
      return;
    }

    if (event.key !== 'Enter' && event.key !== ' ') return;

    event.preventDefault();
    this.activated.emit();
  }

  private isMenuTrigger(): boolean {
    return this.element.nativeElement.hasAttribute('ibomMenuTrigger');
  }
}
