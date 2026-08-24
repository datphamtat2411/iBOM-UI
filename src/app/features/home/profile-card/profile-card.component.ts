import { Component, Input } from '@angular/core';

export type ProfileCardTab = 'overview' | 'skills' | 'export';
export type ProfileCardTheme = 'orange' | 'blue' | 'green';

export interface ProfileCardData {
  readonly id: string;
  readonly profileCode: string;
  readonly initials: string;
  readonly name: string;
  readonly role: string;
  readonly organization: string;
  readonly status: string;
  readonly statusTone: 'ready' | 'draft';
  readonly experience: string;
  readonly completion: string;
  readonly filename: string;
  readonly primarySkill: string;
  readonly primarySkillExperience: string;
  readonly skills: readonly string[];
  readonly exportHeading: string;
  readonly exportDescription: string;
  readonly theme: ProfileCardTheme;
}

@Component({
  selector: 'app-profile-card',
  standalone: true,
  templateUrl: './profile-card.component.html',
  styleUrl: './profile-card.component.scss',
})
export class ProfileCardComponent {
  @Input({ required: true }) data!: ProfileCardData;
  @Input() variant: 'hero' | 'compact' = 'compact';

  readonly tabs: readonly ProfileCardTab[] = ['overview', 'skills', 'export'];
  activeTab: ProfileCardTab = 'overview';

  selectTab(tab: ProfileCardTab): void {
    this.activeTab = tab;
  }

  tabId(tab: ProfileCardTab): string {
    return `${this.data.id}-${tab}-tab`;
  }

  panelId(tab: ProfileCardTab): string {
    return `${this.data.id}-${tab}-panel`;
  }

  onPointerMove(event: PointerEvent): void {
    if (
      typeof window === 'undefined' ||
      window.matchMedia('(pointer: coarse), (prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const card = event.currentTarget as HTMLElement;
    const bounds = card.getBoundingClientRect();
    const x = (event.clientX - bounds.left - bounds.width / 2) / (bounds.width / 2);
    const y = (event.clientY - bounds.top - bounds.height / 2) / (bounds.height / 2);

    card.style.setProperty('--tilt-x', `${-y * 8}deg`);
    card.style.setProperty('--tilt-y', `${x * 8}deg`);
    card.style.setProperty('--tilt-lift', '-4px');
  }

  resetTilt(event: PointerEvent): void {
    const card = event.currentTarget as HTMLElement;
    card.style.removeProperty('--tilt-x');
    card.style.removeProperty('--tilt-y');
    card.style.removeProperty('--tilt-lift');
  }
}
