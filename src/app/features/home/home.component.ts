import {
  AfterViewInit,
  Component,
  ElementRef,
  Inject,
  NgZone,
  OnDestroy,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { computed, HostListener, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import {
  ProfileCardComponent,
  ProfileCardData,
} from './profile-card/profile-card.component';
import { AuthService } from '../../core/auth/auth.service';

gsap.registerPlugin(ScrollTrigger);

const SOURCE_PROFILE: ProfileCardData = {
  id: 'source-profile',
  profileCode: 'CV-2024-1256',
  initials: 'NMA',
  name: 'Nguyen Minh Anh',
  role: 'Senior Software Engineer',
  organization: 'FPT Software / HCM Campus',
  status: 'ACTIVE PROFILE',
  statusTone: 'ready',
  experience: '5.5 Years',
  completion: '100% READY',
  filename: 'AnhNM_Dev_2026.pdf',
  primarySkill: 'Java 17 / Spring Boot 3',
  primarySkillExperience: '5.5 YRS',
  skills: ['Angular 17', 'MySQL', 'Docker'],
  exportHeading: 'Preview-before-export available',
  exportDescription: 'This demo profile is prepared for standardized PDF and DOCX output.',
  theme: 'orange',
};

const PROFILE_VERSIONS: readonly ProfileCardData[] = [
  {
    id: 'java-profile',
    profileCode: 'CV-2024-JAVA',
    initials: 'NMA',
    name: 'Nguyen Minh Anh',
    role: 'Java Backend Specialist',
    organization: 'FPT Software / Cloud Infrastructure',
    status: 'ACTIVE PROFILE',
    statusTone: 'ready',
    experience: '5.5 Years',
    completion: '100% READY',
    filename: 'AnhNM_Java_2026.pdf',
    primarySkill: 'Java 17 / Spring Boot 3',
    primarySkillExperience: '5.5 YRS',
    skills: ['Kafka', 'MySQL', 'Docker'],
    exportHeading: 'Preview-before-export available',
    exportDescription: 'The Java Backend profile is ready for standardized PDF and DOCX output.',
    theme: 'orange',
  },
  {
    id: 'fullstack-profile',
    profileCode: 'CV-2024-FULL',
    initials: 'NMA',
    name: 'Nguyen Minh Anh',
    role: 'Fullstack Web Engineer',
    organization: 'FPT Software / Web Experience',
    status: 'DRAFT (90%)',
    statusTone: 'draft',
    experience: '4.0 Years',
    completion: '90% DRAFT',
    filename: 'AnhNM_Fullstack_2026.pdf',
    primarySkill: 'Angular 17 / TypeScript',
    primarySkillExperience: '4.0 YRS',
    skills: ['NestJS', 'PostgreSQL', 'Docker'],
    exportHeading: 'Profile completion required',
    exportDescription: 'Complete the remaining profile details before previewing an export.',
    theme: 'blue',
  },
  {
    id: 'architecture-profile',
    profileCode: 'CV-2024-ARCH',
    initials: 'NMA',
    name: 'Nguyen Minh Anh',
    role: 'Solutions Architect',
    organization: 'FPT Software / Enterprise Architecture',
    status: 'ACTIVE PROFILE',
    statusTone: 'ready',
    experience: '6.0 Years',
    completion: '100% READY',
    filename: 'AnhNM_Architect_2026.pdf',
    primarySkill: 'AWS Cloud / Enterprise Architecture',
    primarySkillExperience: '6.0 YRS',
    skills: ['Kubernetes', 'System Security', 'CI/CD'],
    exportHeading: 'Preview-before-export available',
    exportDescription: 'The Architect profile is ready for standardized PDF and DOCX output.',
    theme: 'green',
  },
];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [ProfileCardComponent, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly sourceProfile = SOURCE_PROFILE;
  readonly profileVersions = PROFILE_VERSIONS;
  readonly user = this.authService.user;
  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly logoutError = this.authService.logoutError;
  readonly avatarInitials = computed(() => {
    const username = this.user()?.username?.trim() || this.user()?.email || 'User';
    const words = username.split(/[\s._-]+/).filter(Boolean);
    return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase();
  });
  readonly marqueeItems = [
    '100% profile independence',
    'independent profile versions',
    'preview-before-export',
    'PDF and DOCX output',
    'completion status tracking',
  ] as const;

  localTime = '';
  accountMenuOpen = false;
  logoutInProgress = false;

  private readonly isBrowser: boolean;
  private clockInterval?: ReturnType<typeof setInterval>;
  private gsapContext?: ReturnType<typeof gsap.context>;
  private heroTimeline?: gsap.core.Timeline;
  private sceneInitTimer?: number;
  private viewportRefreshFrame?: number;
  private viewportWidth?: number;
  private destroyed = false;
  private readonly onViewportChange = (event: Event): void => {
    const viewportWidth = document.documentElement.clientWidth;

    if (event.type === 'resize' && viewportWidth === this.viewportWidth) {
      return;
    }

    this.viewportWidth = viewportWidth;

    if (this.viewportRefreshFrame !== undefined) {
      return;
    }

    this.viewportRefreshFrame = window.requestAnimationFrame(() => {
      this.viewportRefreshFrame = undefined;
      this.syncChromeHeight();
      ScrollTrigger.refresh();
    });
  };

  constructor(
    private readonly elementRef: ElementRef<HTMLElement>,
    private readonly ngZone: NgZone,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.updateClock();

    if (this.isBrowser) {
      this.clockInterval = setInterval(() => this.updateClock(), 1000);
    }
  }

  toggleAccountMenu(): void { this.accountMenuOpen = !this.accountMenuOpen; }
  closeAccountMenu(): void { this.accountMenuOpen = false; }

  signOut(): void {
    if (this.logoutInProgress) return;
    this.logoutInProgress = true;
    this.closeAccountMenu();
    this.authService.logout().subscribe({
      next: () => void this.router.navigateByUrl('/'),
      error: () => { this.logoutInProgress = false; },
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.accountMenuOpen && !target.closest('.home-account-menu') && !target.closest('.home-account-btn')) {
      this.closeAccountMenu();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { if (this.accountMenuOpen) this.closeAccountMenu(); }

  ngAfterViewInit(): void {
    if (!this.isBrowser) {
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      ScrollTrigger.config({ ignoreMobileResize: true });
      this.viewportWidth = document.documentElement.clientWidth;
      this.syncChromeHeight();
      window.addEventListener('load', this.onViewportChange);
      window.addEventListener('resize', this.onViewportChange);
      this.sceneInitTimer = window.setTimeout(() => {
        if (!this.destroyed) {
          this.initScrollAnimation();
        }
      }, 0);
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;

    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }

    if (this.sceneInitTimer) {
      clearTimeout(this.sceneInitTimer);
    }

    if (this.viewportRefreshFrame !== undefined) {
      window.cancelAnimationFrame(this.viewportRefreshFrame);
      this.viewportRefreshFrame = undefined;
    }

    window.removeEventListener('load', this.onViewportChange);
    window.removeEventListener('resize', this.onViewportChange);
    this.heroTimeline?.scrollTrigger?.kill();
    this.heroTimeline?.kill();
    this.heroTimeline = undefined;
    this.gsapContext?.revert();
    this.gsapContext = undefined;
  }

  private updateClock(): void {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    this.localTime = `${hours}:${minutes}:${seconds}`;
  }

  private syncChromeHeight(): void {
    const host = this.elementRef.nativeElement;
    const root = document.documentElement;
    const siteHeader = host.querySelector<HTMLElement>('#site-header');
    const statusBar = host.querySelector<HTMLElement>('#system-status-bar');
    const marquee = host.querySelector<HTMLElement>('#hero-marquee');

    const assign = (name: string, value: string): void => {
      root.style.setProperty(name, value);
      host.style.setProperty(name, value);
    };

    if (siteHeader) {
      assign('--site-header-height', `${siteHeader.offsetHeight}px`);
    }
    if (statusBar) {
      assign('--system-status-bar-height', `${statusBar.offsetHeight}px`);
    }
    if (marquee) {
      assign('--hero-marquee-height', `${marquee.offsetHeight}px`);
    }
  }

  private initScrollAnimation(): void {
    const host = this.elementRef.nativeElement;
    const siteHeader = host.querySelector<HTMLElement>('#site-header');
    const heroScene = host.querySelector<HTMLElement>('#hero-interactive-scene');
    const heroLeftCol = host.querySelector<HTMLElement>('#hero-left-col');
    const heroRightCol = host.querySelector<HTMLElement>('#hero-right-col');
    const heroMainCv = host.querySelector<HTMLElement>('#hero-main-cv');
    const heroRolledCylinder = host.querySelector<HTMLElement>('#hero-rolled-cylinder');
    const heroSplitTrio = host.querySelector<HTMLElement>('#hero-split-trio');

    if (
      !siteHeader ||
      !heroScene ||
      !heroLeftCol ||
      !heroRightCol ||
      !heroMainCv ||
      !heroRolledCylinder ||
      !heroSplitTrio
    ) {
      return;
    }

    const splitCards = gsap.utils.toArray<HTMLElement>('.split-card', heroSplitTrio);

    this.gsapContext = gsap.context(() => {
      this.heroTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: heroScene,
          start: () => `top top+=${siteHeader.offsetHeight}`,
          end: '+=1400',
          scrub: 0.8,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      gsap.set(
        [heroLeftCol, heroRightCol, heroMainCv, heroRolledCylinder, heroSplitTrio],
        { force3D: true },
      );
      gsap.set(heroSplitTrio, { autoAlpha: 0, pointerEvents: 'none' });
      gsap.set(splitCards, { animationPlayState: 'paused' });
      gsap.set(heroMainCv, { transformOrigin: 'center top' });
      gsap.set(heroRolledCylinder, {
        autoAlpha: 0,
        scale: 0.5,
        rotation: 0,
        transformOrigin: 'center center',
      });

      this.heroTimeline
        .to(
          heroLeftCol,
          { autoAlpha: 0, x: -30, duration: 0.8, ease: 'power1.inOut' },
          0,
        )
        .to(
          heroRightCol,
          { xPercent: -50, duration: 1.0, ease: 'power1.inOut' },
          0,
        )
        .to(
          heroMainCv,
          {
            scaleY: 0.04,
            scaleX: 0.65,
            rotateX: 85,
            y: -20,
            autoAlpha: 0,
            transformOrigin: 'center top',
            duration: 1.0,
            ease: 'power2.inOut',
          },
          0.8,
        )
        .to(
          heroRolledCylinder,
          {
            autoAlpha: 1,
            scale: 1,
            rotation: 360,
            duration: 1.0,
            ease: 'power2.inOut',
          },
          1.0,
        )
        .to(
          heroRolledCylinder,
          {
            scale: 1.2,
            autoAlpha: 0,
            duration: 0.6,
            ease: 'power2.out',
          },
          1.8,
        )
        .to(heroRightCol, { autoAlpha: 0, duration: 0.2 }, 1.8)
        .fromTo(
          heroSplitTrio,
          { autoAlpha: 0, scale: 0.8, y: 40 },
          {
            autoAlpha: 1,
            scale: 1,
            y: 0,
            duration: 1.2,
            ease: 'back.out(1.2)',
          },
          2.0,
        )
        .set(splitCards, { animationPlayState: 'running' }, 2.0)
        .set(heroSplitTrio, { pointerEvents: 'auto' }, 2.0);
    }, host);
  }
}
