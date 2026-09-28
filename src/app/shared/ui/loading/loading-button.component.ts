import { Component, Input } from '@angular/core';

import { IbomLoadingIndicatorComponent } from './loading-indicator.component';

@Component({
  selector: 'button[ibomLoadingButton]',
  standalone: true,
  imports: [IbomLoadingIndicatorComponent],
  template: `
    <span class="ibom-loading-button__label"><ng-content /></span>
    @if (loading) {
      <ibom-loading-indicator
        class="ibom-loading-button__indicator"
        [label]="loadingLabel"
        [announce]="false"
        [decorative]="true"
      />
    }
  `,
  host: {
    class: 'ibom-loading-button',
    '[class.is-loading]': 'loading',
    '[attr.aria-busy]': 'loading ? "true" : null',
    '[disabled]': 'loading || disabled',
  },
})
export class IbomLoadingButtonComponent {
  @Input() loading = false;
  @Input() loadingLabel = 'Loading...';
  @Input() disabled = false;
}
