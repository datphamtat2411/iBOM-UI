import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  ViewChild,
} from '@angular/core';

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
export class ProfileCardComponent implements AfterViewInit, OnDestroy {
  @Input({ required: true }) data!: ProfileCardData;
  @Input() variant: 'hero' | 'compact' = 'compact';
  @ViewChild('profileCard', { static: true })
  private profileCard?: ElementRef<HTMLElement>;

  readonly tabs: readonly ProfileCardTab[] = ['overview', 'skills', 'export'];
  activeTab: ProfileCardTab = 'overview';

  private tiltFrame?: number;
  private pendingTilt?: {
    readonly card: HTMLElement;
    readonly clientX: number;
    readonly clientY: number;
  };

  constructor(private readonly ngZone: NgZone) {}

  ngAfterViewInit(): void {
    if (
      typeof window === 'undefined' ||
      window.matchMedia('(pointer: coarse)').matches
    ) {
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      const card = this.profileCard?.nativeElement;
      card?.addEventListener('pointermove', this.onPointerMove);
      card?.addEventListener('pointerleave', this.resetTilt);
    });
  }

  selectTab(tab: ProfileCardTab): void {
    this.activeTab = tab;
  }

  tabId(tab: ProfileCardTab): string {
    return `${this.data.id}-${tab}-tab`;
  }

  panelId(tab: ProfileCardTab): string {
    return `${this.data.id}-${tab}-panel`;
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    const card = event.currentTarget as HTMLElement;

    this.pendingTilt = {
      card,
      clientX: event.clientX,
      clientY: event.clientY,
    };

    if (this.tiltFrame !== undefined) {
      return;
    }

    this.tiltFrame = window.requestAnimationFrame(() => {
      this.tiltFrame = undefined;

      const tilt = this.pendingTilt;
      this.pendingTilt = undefined;
      if (!tilt) {
        return;
      }

      const bounds = tilt.card.getBoundingClientRect();
      const x = (tilt.clientX - bounds.left - bounds.width / 2) / (bounds.width / 2);
      const y = (tilt.clientY - bounds.top - bounds.height / 2) / (bounds.height / 2);
      const intensity = this.variant === 'hero' ? 2.5 : 6;

      tilt.card.style.setProperty('--tilt-x', `${-y * intensity}deg`);
      tilt.card.style.setProperty('--tilt-y', `${x * intensity}deg`);
      tilt.card.style.setProperty('--tilt-lift', this.variant === 'hero' ? '-1px' : '-3px');
    });
  };

  private readonly resetTilt = (): void => {
    this.cancelTiltFrame();

    const card = this.profileCard?.nativeElement;
    if (!card) {
      return;
    }

    card.style.removeProperty('--tilt-x');
    card.style.removeProperty('--tilt-y');
    card.style.removeProperty('--tilt-lift');
  };

  ngOnDestroy(): void {
    const card = this.profileCard?.nativeElement;
    card?.removeEventListener('pointermove', this.onPointerMove);
    card?.removeEventListener('pointerleave', this.resetTilt);
    this.cancelTiltFrame();
  }

  private cancelTiltFrame(): void {
    this.pendingTilt = undefined;

    if (typeof window !== 'undefined' && this.tiltFrame !== undefined) {
      window.cancelAnimationFrame(this.tiltFrame);
      this.tiltFrame = undefined;
    }
  }
}
