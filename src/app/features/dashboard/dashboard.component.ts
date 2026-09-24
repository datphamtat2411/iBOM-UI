import { Component, inject } from '@angular/core';

import { AuthService } from '../../core/auth/auth.service';
import { ProfileContextService } from '../profile/services/profile-context.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  readonly user = inject(AuthService).user;

  constructor() {
    inject(ProfileContextService).loadSummariesAndResolveSelection();
  }
}
