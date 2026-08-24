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
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import {
  ProfileCardComponent,
  ProfileCardData,
} from './profile-card/profile-card.component';

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
  imports: [ProfileCardComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  readonly sourceProfile = SOURCE_PROFILE;
  readonly profileVersions = PROFILE_VERSIONS;
  readonly marqueeItems = [
    '100% profile independence',
    'independent profile versions',
    'preview-before-export',
    'PDF and DOCX output',
    'completion status tracking',
  ] as const;

  localTime = '';

  private readonly isBrowser: boolean;
  private clockInterval?: ReturnType<typeof setInterval>;
  private resizeObserver?: ResizeObserver;
  private gsapContext?: ReturnType<typeof gsap.context>;
  private gsapMedia?: ReturnType<typeof gsap.matchMedia>;
  private destroyed = false;

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

  ngAfterViewInit(): void {
    if (!this.isBrowser) {
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      this.syncChromeHeight();
      this.observeChromeSize();
      this.setupScrollScene();
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;

    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }

    this.resizeObserver?.disconnect();
    this.gsapMedia?.revert();
    this.gsapContext?.revert();
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
    const siteHeader = host.querySelector<HTMLElement>('#site-header');
    const statusBar = host.querySelector<HTMLElement>('#system-status-bar');
    const marquee = host.querySelector<HTMLElement>('#hero-marquee');

    if (siteHeader) {
      host.style.setProperty('--site-header-height', `${siteHeader.offsetHeight}px`);
    }
    if (statusBar) {
      host.style.setProperty('--system-status-bar-height', `${statusBar.offsetHeight}px`);
    }
    if (marquee) {
      host.style.setProperty('--hero-marquee-height', `${marquee.offsetHeight}px`);
    }
  }

  private observeChromeSize(): void {
    if (!('ResizeObserver' in window)) {
      return;
    }

    const host = this.elementRef.nativeElement;
    this.resizeObserver = new ResizeObserver(() => {
      this.syncChromeHeight();
      ScrollTrigger.refresh();
    });

    const observedElements = [
      host.querySelector('#site-header'),
      host.querySelector('#system-status-bar'),
      host.querySelector('#hero-marquee'),
    ];

    observedElements.forEach((element) => {
      if (element) {
        this.resizeObserver?.observe(element);
      }
    });
  }

  private setupScrollScene(): void {
    const host = this.elementRef.nativeElement;
    gsap.registerPlugin(ScrollTrigger);
    this.gsapMedia = gsap.matchMedia();

    this.gsapMedia.add(
      '(min-width: 768px) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
      () => {
        this.gsapContext = gsap.context(() => {
          const timeline = gsap.timeline({
            scrollTrigger: {
              trigger: '#hero-interactive-scene',
              start: () =>
                `top top+=${host.querySelector<HTMLElement>('#site-header')?.offsetHeight ?? 0}`,
              end: '+=1400',
              scrub: 0.8,
              pin: true,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          });

          timeline
            .to(
              '#hero-left-col',
              { autoAlpha: 0, x: -30, duration: 0.8, ease: 'power1.inOut' },
              0,
            )
            .to(
              '#hero-right-col',
              { xPercent: -50, duration: 1, ease: 'power1.inOut' },
              0,
            )
            .to(
              '#hero-main-cv',
              {
                scaleY: 0.04,
                scaleX: 0.65,
                rotateX: 85,
                y: -20,
                autoAlpha: 0,
                transformOrigin: 'center top',
                duration: 1,
                ease: 'power2.inOut',
              },
              0.8,
            )
            .to(
              '#hero-rolled-cylinder',
              {
                autoAlpha: 1,
                scale: 1,
                rotation: 360,
                duration: 1,
                ease: 'power2.inOut',
              },
              1,
            )
            .to(
              '#hero-rolled-cylinder',
              { scale: 1.2, autoAlpha: 0, duration: 0.6, ease: 'power2.out' },
              1.8,
            )
            .to('#hero-right-col', { autoAlpha: 0, duration: 0.2 }, 1.8)
            .fromTo(
              '#hero-split-trio',
              { autoAlpha: 0, scale: 0.8, y: 40 },
              {
                autoAlpha: 1,
                scale: 1,
                y: 0,
                pointerEvents: 'auto',
                duration: 1.2,
                ease: 'back.out(1.2)',
              },
              2,
            );
        }, host);

        queueMicrotask(() => {
          if (!this.destroyed) {
            ScrollTrigger.refresh();
          }
        });

        return () => {
          this.gsapContext?.revert();
          this.gsapContext = undefined;
        };
      },
    );
  }
}
