import { Component, Input } from '@angular/core';

@Component({
  selector: 'ibom-loading-indicator',
  standalone: true,
  template: `
    <span class="ibom-loading-indicator__spinner" aria-hidden="true"></span>
    <span class="ibom-loading-indicator__label">{{ label }}</span>
  `,
  host: {
    class: 'ibom-loading ibom-loading-indicator',
    '[attr.role]': 'announce && !decorative ? "status" : null',
    '[attr.aria-live]': 'announce && !decorative ? "polite" : null',
    '[attr.aria-atomic]': 'announce && !decorative ? "true" : null',
    '[attr.aria-hidden]': 'decorative ? "true" : null',
  },
})
export class IbomLoadingIndicatorComponent {
  @Input() label = 'Loading...';
  @Input() announce = true;
  @Input() decorative = false;
}
