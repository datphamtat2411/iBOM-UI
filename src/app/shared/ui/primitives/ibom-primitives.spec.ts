import { Component } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { OverlayModule } from '@angular/cdk/overlay';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { IbomMotionPreferenceService } from '../motion/ibom-motion-preference.service';
import { IbomComboboxComponent } from './ibom-combobox.component';
import { IbomMenuComponent } from './ibom-menu.component';
import { IbomMenuItem, IbomSelectOption } from './ibom-option.types';
import {
  IbomPopoverComponent,
  IbomPopoverContentDirective,
} from './ibom-popover.component';
import { IbomSelectComponent } from './ibom-select.component';
import { IbomTooltipDirective } from './ibom-tooltip.directive';
import { IbomFloatingTriggerDirective } from './ibom-trigger.directive';

@Component({
  standalone: true,
  imports: [OverlayModule, IbomTooltipDirective],
  template: `<button type="button" ibomTooltip="Helpful context">Help</button>`,
})
class TooltipHostComponent {}

@Component({
  standalone: true,
  imports: [
    OverlayModule,
    IbomFloatingTriggerDirective,
    IbomPopoverComponent,
    IbomPopoverContentDirective,
  ],
  template: `
    <ibom-popover>
      <button type="button" ibomPopoverTrigger>Open</button>
      <div ibomPopoverContent><button type="button">Action</button></div>
    </ibom-popover>
  `,
})
class PopoverHostComponent {}

@Component({
  standalone: true,
  imports: [OverlayModule, IbomFloatingTriggerDirective, IbomMenuComponent],
  template: `
    <ibom-menu [items]="items" (itemSelected)="select($event)">
      <button type="button" ibomMenuTrigger>Actions</button>
    </ibom-menu>
  `,
})
class MenuHostComponent {
  items: IbomMenuItem<string>[] = [
    { value: 'new', label: 'New' },
    { value: 'disabled', label: 'Disabled', disabled: true },
    { value: 'delete', label: 'Delete', destructive: true },
  ];
  selected: unknown = null;

  select(value: unknown): void {
    this.selected = value;
  }
}

@Component({
  standalone: true,
  imports: [OverlayModule, IbomSelectComponent],
  template: `<ibom-select [options]="options" [(value)]="selected" [disabled]="disabled" placeholder="Choose one" />`,
})
class SelectHostComponent {
  options: IbomSelectOption<string>[] = [
    { value: 'one', label: 'One' },
    { value: 'disabled', label: 'Disabled', disabled: true },
    { value: 'three', label: 'Three' },
  ];
  selected: string | null = 'one';
  disabled = false;
}

@Component({
  standalone: true,
  imports: [OverlayModule, IbomComboboxComponent],
  template: `
    <ibom-combobox
      [options]="options"
      [(value)]="selected"
      [(searchText)]="searchText"
      [loading]="loading"
      noResultsText="Nothing found"
      placeholder="Search"
    />
  `,
})
class ComboboxHostComponent {
  options: IbomSelectOption<string>[] = [
    { value: 'alpha', label: 'Alpha' },
    { value: 'beta', label: 'Beta' },
    { value: 'disabled', label: 'Disabled', disabled: true },
  ];
  selected: string | null = null;
  searchText = '';
  loading = false;
}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, OverlayModule, IbomSelectComponent],
  template: `<form [formGroup]="form"><ibom-select [options]="options" formControlName="status" /></form>`,
})
class SelectFormsHostComponent {
  readonly form = new FormGroup({ status: new FormControl<string | null>(null) });
  readonly options: IbomSelectOption<string>[] = [
    { value: 'one', label: 'One' },
    { value: 'two', label: 'Two' },
  ];
}

function overlayElement<T extends HTMLElement = HTMLElement>(selector: string): T {
  return document.querySelector(selector) as T;
}

function dispatchKey(element: Element, key: string): void {
  element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key }));
}

describe('iBOM headless UI primitives', () => {
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-pane').forEach((element) => element.remove());
  });

  it('opens a tooltip from focus without moving focus into the passive surface', fakeAsync(() => {
    TestBed.configureTestingModule({ imports: [TooltipHostComponent] });
    const fixture = TestBed.createComponent(TooltipHostComponent);
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    trigger.focus();
    // A background Karma window can update activeElement without emitting focus events.
    trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    fixture.detectChanges();

    const tooltip = overlayElement<HTMLElement>('[role="tooltip"]');
    expect(tooltip.textContent).toContain('Helpful context');
    expect(trigger.getAttribute('aria-describedby')).toBe(tooltip.id);
    expect(document.activeElement).toBe(trigger);

    trigger.blur();
    trigger.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    tick();
    fixture.detectChanges();
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    fixture.destroy();
  }));

  it('delays tooltip hover and closes it when the pointer leaves', fakeAsync(() => {
    TestBed.configureTestingModule({ imports: [TooltipHostComponent] });
    const fixture = TestBed.createComponent(TooltipHostComponent);
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    trigger.dispatchEvent(new Event('mouseenter'));
    tick(349);
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    tick(1);
    fixture.detectChanges();
    expect(document.querySelector('[role="tooltip"]')).not.toBeNull();

    trigger.dispatchEvent(new Event('mouseleave'));
    tick();
    fixture.detectChanges();
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    fixture.destroy();
  }));

  it('opens, dismisses, and restores focus for a projected popover', async () => {
    await TestBed.configureTestingModule({ imports: [PopoverHostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(PopoverHostComponent);
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector('[ibomPopoverTrigger]') as HTMLButtonElement;

    trigger.click();
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(overlayElement('[role="dialog"]')).not.toBeNull();
    expect(document.activeElement?.textContent).toBe('Action');

    dispatchKey(overlayElement('[role="dialog"]'), 'Escape');
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);

    trigger.click();
    fixture.detectChanges();
    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(overlayElement('[role="dialog"]')).toBeNull();
    fixture.destroy();
  });

  it('skips disabled menu items and activates the focused item', async () => {
    await TestBed.configureTestingModule({ imports: [MenuHostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(MenuHostComponent);
    const host = fixture.componentInstance;
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector('[ibomMenuTrigger]') as HTMLButtonElement;

    trigger.click();
    fixture.detectChanges();
    const panel = overlayElement('[role="menu"]');
    const items = panel.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
    expect(trigger.getAttribute('aria-controls')).toBe(panel.id);
    expect(document.activeElement).toBe(items[0]);

    dispatchKey(items[0], 'ArrowDown');
    fixture.detectChanges();
    expect(document.activeElement).toBe(items[2]);
    expect(items[1].getAttribute('aria-disabled')).toBe('true');

    dispatchKey(items[2], 'Enter');
    fixture.detectChanges();
    expect(host.selected).toBe('delete');
    expect(document.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    fixture.destroy();
  });

  it('dismisses a menu from outside interaction', async () => {
    await TestBed.configureTestingModule({ imports: [MenuHostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(MenuHostComponent);
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector('[ibomMenuTrigger]') as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();

    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(document.querySelector('[role="menu"]')).toBeNull();
    fixture.destroy();
  });

  it('navigates and selects typed options while preserving select semantics', async () => {
    await TestBed.configureTestingModule({ imports: [SelectHostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(SelectHostComponent);
    const host = fixture.componentInstance;
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector('[role="combobox"]') as HTMLButtonElement;

    expect(trigger.textContent).toContain('One');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    trigger.click();
    fixture.detectChanges();
    const listbox = overlayElement('[role="listbox"]');
    const options = listbox.querySelectorAll<HTMLButtonElement>('[role="option"]');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(options[0].getAttribute('aria-selected')).toBe('true');

    dispatchKey(options[0], 'ArrowDown');
    fixture.detectChanges();
    expect(document.activeElement).toBe(options[2]);
    dispatchKey(options[2], 'Enter');
    fixture.detectChanges();
    expect(host.selected).toBe('three');
    expect(trigger.textContent).toContain('Three');
    expect(document.activeElement).toBe(trigger);

    trigger.click();
    fixture.detectChanges();
    dispatchKey(overlayElement('[role="listbox"]'), 'Escape');
    fixture.detectChanges();
    expect(host.selected).toBe('three');
    expect(document.activeElement).toBe(trigger);
    fixture.destroy();
  });

  it('does not open a disabled select', async () => {
    await TestBed.configureTestingModule({ imports: [SelectHostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(SelectHostComponent);
    const host = fixture.componentInstance;
    fixture.detectChanges();
    host.selected = 'one';
    host.disabled = true;
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector('[role="combobox"]') as HTMLButtonElement;

    expect(trigger.disabled).toBeTrue();
    trigger.click();
    fixture.detectChanges();
    expect(document.querySelector('[role="listbox"]')).toBeNull();
    fixture.destroy();
  });

  it('connects select value changes to Angular forms', async () => {
    await TestBed.configureTestingModule({ imports: [SelectFormsHostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(SelectFormsHostComponent);
    const host = fixture.componentInstance;
    fixture.detectChanges();
    host.form.setValue({ status: 'two' });
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector('[role="combobox"]') as HTMLButtonElement;
    expect(trigger.textContent).toContain('Two');

    trigger.click();
    fixture.detectChanges();
    const option = overlayElement<HTMLElement>('[role="option"]');
    option.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(host.form.controls.status.value).toBe('one');
    fixture.destroy();
  });

  it('filters combobox options, keeps query separate from value, and exposes active descendant state', async () => {
    await TestBed.configureTestingModule({ imports: [ComboboxHostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(ComboboxHostComponent);
    const host = fixture.componentInstance;
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('[role="combobox"]') as HTMLInputElement;

    input.focus();
    expect(document.activeElement).toBe(input);
    input.dispatchEvent(new FocusEvent('focus'));
    fixture.detectChanges();
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(input.getAttribute('aria-controls')).toBe(overlayElement('[role="listbox"]').id);

    input.value = 'be';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(host.searchText).toBe('be');
    const visibleOption = overlayElement<HTMLElement>('.ibom-combobox-panel [role="option"]');
    expect(visibleOption.textContent).toContain('Beta');
    expect(input.getAttribute('aria-activedescendant')).toBe(visibleOption.id);

    dispatchKey(input, 'Enter');
    fixture.detectChanges();
    expect(host.selected).toBe('beta');
    expect(host.searchText).toBe('');
    expect(input.value).toBe('Beta');
    expect(input.getAttribute('aria-expanded')).toBe('false');

    input.focus();
    fixture.detectChanges();
    input.value = 'missing';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(overlayElement('.ibom-combobox-panel .ibom-combobox__empty').textContent).toContain('Nothing found');
    dispatchKey(input, 'Escape');
    fixture.detectChanges();
    expect(host.selected).toBe('beta');
    expect(input.value).toBe('Beta');
    fixture.destroy();
  });

  it('renders the generic async-ready combobox loading state', async () => {
    await TestBed.configureTestingModule({ imports: [ComboboxHostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(ComboboxHostComponent);
    const host = fixture.componentInstance;
    fixture.detectChanges();
    host.loading = true;
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('[role="combobox"]') as HTMLInputElement;
    input.focus();
    expect(document.activeElement).toBe(input);
    input.dispatchEvent(new FocusEvent('focus'));
    fixture.detectChanges();
    expect(document.querySelector('.ibom-combobox-panel .ibom-combobox__loading')).not.toBeNull();
    fixture.destroy();
    expect(document.querySelector('.ibom-combobox-panel')).toBeNull();
  });

  it('keeps a floating surface usable when reduced motion is enabled', async () => {
    await TestBed.configureTestingModule({
      imports: [SelectHostComponent],
      providers: [{
        provide: IbomMotionPreferenceService,
        useValue: { isReducedMotion: () => true },
      }],
    }).compileComponents();
    const fixture = TestBed.createComponent(SelectHostComponent);
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector('[role="combobox"]') as HTMLButtonElement;

    trigger.click();
    fixture.detectChanges();
    expect(document.querySelector('.ibom-select-panel')).not.toBeNull();
    dispatchKey(overlayElement('[role="listbox"]'), 'Escape');
    fixture.detectChanges();
    expect(document.querySelector('.ibom-select-panel')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    fixture.destroy();
  });
});
