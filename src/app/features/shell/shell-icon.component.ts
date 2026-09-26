import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type ShellIconName =
  | 'account'
  | 'check'
  | 'chevron'
  | 'close'
  | 'collapse'
  | 'dashboard'
  | 'expand'
  | 'manager-dashboard'
  | 'master-data'
  | 'menu'
  | 'members'
  | 'profile'
  | 'users';

@Component({
  selector: 'app-shell-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      class="shell-icon"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      focusable="false"
      [attr.aria-hidden]="label ? null : 'true'"
      [attr.aria-label]="label || null"
    >
      @switch (name) {
        @case ('account') {
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5.5 19c.8-3.1 3-4.7 6.5-4.7s5.7 1.6 6.5 4.7" />
        }
        @case ('check') {
          <path d="m5 12.5 4.2 4.2L19 7" />
        }
        @case ('chevron') {
          <path d="m6.5 9 5.5 5.5L17.5 9" />
        }
        @case ('close') {
          <path d="m6 6 12 12M18 6 6 18" />
        }
        @case ('collapse') {
          <path d="m14.5 6-6 6 6 6" />
          <path d="M8.5 12h10" />
        }
        @case ('dashboard') {
          <rect x="4" y="4" width="6" height="6" rx="1" />
          <rect x="14" y="4" width="6" height="6" rx="1" />
          <rect x="4" y="14" width="6" height="6" rx="1" />
          <rect x="14" y="14" width="6" height="6" rx="1" />
        }
        @case ('expand') {
          <path d="m9.5 6 6 6-6 6" />
          <path d="M15.5 12h-10" />
        }
        @case ('manager-dashboard') {
          <path d="M4 19.5h16" />
          <path d="m5.5 16 4-4 3 2.5 6-6" />
          <path d="M15.5 8.5h3v3" />
        }
        @case ('master-data') {
          <ellipse cx="12" cy="5.5" rx="7" ry="2.5" />
          <path d="M5 5.5v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6" />
          <path d="M5 11.5v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6" />
        }
        @case ('menu') {
          <path d="M4 7h16M4 12h16M4 17h16" />
        }
        @case ('members') {
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 19c.7-3.3 2.5-5 5.5-5s4.8 1.7 5.5 5" />
          <path d="M16 6.5a3 3 0 0 1 0 5.8M16 14c2.4.3 3.9 2 4.5 5" />
        }
        @case ('profile') {
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5.5 19c.8-3.1 3-4.7 6.5-4.7s5.7 1.6 6.5 4.7" />
          <path d="M4 4h2M18 4h2" />
        }
        @case ('users') {
          <circle cx="9" cy="8" r="3" />
          <circle cx="16.5" cy="9" r="2.3" />
          <path d="M3.5 19c.7-3.3 2.5-5 5.5-5s4.8 1.7 5.5 5" />
          <path d="M15 14.5c2.5.1 4.3 1.6 5 4.5" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex: 0 0 auto;
      line-height: 0;
    }

    .shell-icon {
      display: block;
      width: 1.25rem;
      height: 1.25rem;
    }
  `,
})
export class ShellIconComponent {
  @Input({ required: true }) name!: ShellIconName;
  @Input() label = '';
}
