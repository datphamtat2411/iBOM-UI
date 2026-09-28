import { Component, Input } from '@angular/core';

export type IbomSkeletonVariant = 'text' | 'block' | 'circle';

@Component({
  selector: 'ibom-skeleton',
  standalone: true,
  template: '',
  host: {
    class: 'ibom-skeleton',
    '[class.ibom-skeleton--text]': "variant === 'text'",
    '[class.ibom-skeleton--block]': "variant === 'block'",
    '[class.ibom-skeleton--circle]': "variant === 'circle'",
    '[style.width]': 'dimension(width)',
    '[style.height]': 'dimension(height)',
    'aria-hidden': 'true',
    role: 'presentation',
  },
})
export class IbomSkeletonComponent {
  @Input() variant: IbomSkeletonVariant = 'text';
  @Input() width: string | number | null = null;
  @Input() height: string | number | null = null;

  dimension(value: string | number | null): string | null {
    return value === null || value === '' ? null : typeof value === 'number' ? `${value}px` : value;
  }
}
