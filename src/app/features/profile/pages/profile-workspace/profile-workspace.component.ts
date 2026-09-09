import { Component, effect, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ProfileContextService } from '../../services/profile-context.service';

@Component({
  selector: 'app-profile-workspace',
  standalone: true,
  templateUrl: './profile-workspace.component.html',
  styleUrl: './profile-workspace.component.scss',
})
export class ProfileWorkspaceComponent {
  readonly context = inject(ProfileContextService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly sections = [
    ['about', 'About Me'],
    ['education', 'Education'],
    ['languages', 'Languages'],
    ['certificates', 'Certificates'],
    ['projects', 'Projects'],
    ['skills', 'Skills'],
  ] as const;
  activeSection = 'about';

  constructor() {
    this.context.loadSummaries();
    this.route.paramMap.subscribe((params) => {
      const profileId = params.get('profileId');
      if (profileId) {
        this.context.loadDetail(profileId);
      } else {
        this.context.beginSelection(null);
      }
    });
    effect(() => {
      const summaries = this.context.summaries();
      if (!this.context.summariesLoading() && !this.context.summariesError() && !this.context.selectedId() && summaries.length) {
        void this.router.navigate(['/profiles', summaries[0].id]);
      }
    });
  }

  selectProfile(profileId: number | string): void {
    void this.router.navigate(['/profiles', profileId]);
  }

  scrollToSection(sectionId: string): void {
    this.activeSection = sectionId;
    document.getElementById(`workspace-section-${sectionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  profileName(): string {
    return this.context.detail()?.profileName ?? this.selectedSummary()?.profileName ?? 'Profile Workspace';
  }

  selectedSummary() {
    return this.context.summaries().find((summary) => String(summary.id) === this.context.selectedId()) ?? null;
  }
}
