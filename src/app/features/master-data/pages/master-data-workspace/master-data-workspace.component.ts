import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { SkillManagementComponent } from '../skill-management/skill-management.component';

@Component({
  selector: 'app-master-data-workspace',
  standalone: true,
  imports: [SkillManagementComponent],
  templateUrl: './master-data-workspace.component.html',
  styleUrl: './master-data-workspace.component.scss',
})
export class MasterDataWorkspaceComponent {
  readonly resource = inject(ActivatedRoute).snapshot.data['resource'] as string;
  readonly isSkillsResource = this.resource === 'Skills';
}
