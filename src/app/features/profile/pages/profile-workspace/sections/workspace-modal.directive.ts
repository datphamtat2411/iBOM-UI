import { AfterViewInit, Directive, ElementRef, EventEmitter, HostListener, OnDestroy, Output, inject } from '@angular/core';

@Directive({
  selector: 'dialog[workspaceModal]',
  standalone: true,
})
export class WorkspaceModalDirective implements AfterViewInit, OnDestroy {
  private static openCount = 0;
  private static previousOverflow = '';
  private readonly dialog = inject<ElementRef<HTMLDialogElement>>(ElementRef).nativeElement;

  @Output() readonly dismissRequested = new EventEmitter<void>();

  ngAfterViewInit(): void {
    if (!WorkspaceModalDirective.openCount) {
      WorkspaceModalDirective.previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    WorkspaceModalDirective.openCount++;
    this.dialog.showModal();
    this.dialog.focus();
  }

  ngOnDestroy(): void {
    if (!this.dialog.open) return;
    this.dialog.close();
    WorkspaceModalDirective.openCount--;
    if (!WorkspaceModalDirective.openCount) document.body.style.overflow = WorkspaceModalDirective.previousOverflow;
  }

  @HostListener('cancel', ['$event'])
  onCancel(event: Event): void {
    event.preventDefault();
    this.dismissRequested.emit();
  }

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {
    if (event.target === this.dialog) this.dismissRequested.emit();
  }
}
