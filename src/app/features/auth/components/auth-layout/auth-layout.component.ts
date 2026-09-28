import { Component, Input, ViewEncapsulation } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class AuthLayoutComponent {
  @Input() eyebrow = '';
  @Input() heading = '';
  @Input() description = '';
  @Input() headingId = 'auth-heading';
  @Input() brandPanelDataId: string | null = null;
}
