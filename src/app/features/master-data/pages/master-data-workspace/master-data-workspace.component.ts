import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-master-data-workspace',
  standalone: true,
  templateUrl: './master-data-workspace.component.html',
  styleUrl: './master-data-workspace.component.scss',
})
export class MasterDataWorkspaceComponent {
  readonly resource = inject(ActivatedRoute).snapshot.data['resource'] as string;
}
