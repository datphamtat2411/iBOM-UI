import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject, Subject, of } from 'rxjs';

import { NotificationService } from '../../../../core/notifications/notification.service';
import { ProfileDetail, ProfileSummary } from '../../models/profile.models';
import { ProfileContextService } from '../../services/profile-context.service';
import { ProfileService } from '../../services/profile.service';
import { AboutMeSectionComponent } from './sections/about-me-section/about-me-section.component';
import { CertificateSectionComponent } from './sections/certificate-section/certificate-section.component';
import { EducationSectionComponent } from './sections/education-section/education-section.component';
import { LanguageSectionComponent } from './sections/language-section/language-section.component';
import { ProjectsSectionComponent } from './sections/projects-section/projects-section.component';
import { ProfileWorkspaceComponent } from './profile-workspace.component';
import { SkillSectionComponent } from './sections/skill-section/skill-section.component';

describe('ProfileWorkspaceComponent', () => {
  let fixture: ComponentFixture<ProfileWorkspaceComponent>;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let router: { navigate: jasmine.Spy };
  let context: {
    summaries: ReturnType<typeof signal>;
    summariesLoading: ReturnType<typeof signal>;
    summariesError: ReturnType<typeof signal>;
    selectedId: ReturnType<typeof signal>;
    detail: ReturnType<typeof signal>;
    detailLoading: ReturnType<typeof signal>;
    detailError: ReturnType<typeof signal>;
    managedMember: ReturnType<typeof signal>;
    managedSummaries: ReturnType<typeof signal>;
    managedSummariesLoading: ReturnType<typeof signal>;
    managedSummariesError: ReturnType<typeof signal>;
    managedSelectedId: ReturnType<typeof signal>;
    managedDetail: ReturnType<typeof signal>;
    managedDetailLoading: ReturnType<typeof signal>;
    managedDetailError: ReturnType<typeof signal>;
    managedProfileMissing: ReturnType<typeof signal>;
    loadSummaries: jasmine.Spy;
    clearManagedContext: jasmine.Spy;
    loadManagedMember: jasmine.Spy;
    retryManagedMember: jasmine.Spy;
    loadDetail: jasmine.Spy;
    reloadDetail: jasmine.Spy;
    beginSelection: jasmine.Spy;
    replaceDetail: jasmine.Spy;
    refreshSummariesAndSelectFirst: jasmine.Spy;
    applyMutationVersion: jasmine.Spy;
    isNotFound: jasmine.Spy;
  };
  let profiles: Record<string, jasmine.Spy>;

  const summary: ProfileSummary = { id: 1, profileName: 'Backend CV', firstName: 'A', lastName: 'User', jobTitle: 'Engineer', updatedAt: '2026-01-01' };
  const detail: ProfileDetail = { ...summary, yearsOfExperience: 5, personality: 'Methodical', technicalSummary: 'Angular and Java', hasPreviewed: true, version: 3, createdAt: '2026-01-01', lastExportedAt: null, preferredFileNameFormatId: null };

  beforeEach(async () => {
    params = new BehaviorSubject(convertToParamMap({ profileId: '1' }));
    router = { navigate: jasmine.createSpy('navigate') };
    profiles = {
      delete: jasmine.createSpy('delete'),
      listEducations: jasmine.createSpy('listEducations').and.returnValue(of([])),
      listProfileLanguages: jasmine.createSpy('listProfileLanguages').and.returnValue(of([])),
      listCertificates: jasmine.createSpy('listCertificates').and.returnValue(of([])),
      listProjects: jasmine.createSpy('listProjects').and.returnValue(of([])),
      listProfileSkills: jasmine.createSpy('listProfileSkills').and.returnValue(of([])),
    };
    context = {
      summaries: signal([summary]),
      summariesLoading: signal(false),
      summariesError: signal(null),
      selectedId: signal('1'),
      detail: signal<ProfileDetail | null>(detail),
      detailLoading: signal(false),
      detailError: signal(null),
      managedMember: signal(null),
      managedSummaries: signal<ProfileSummary[]>([]),
      managedSummariesLoading: signal(false),
      managedSummariesError: signal(null),
      managedSelectedId: signal(null),
      managedDetail: signal<ProfileDetail | null>(null),
      managedDetailLoading: signal(false),
      managedDetailError: signal(null),
      managedProfileMissing: signal(false),
      loadSummaries: jasmine.createSpy('loadSummaries'),
      clearManagedContext: jasmine.createSpy('clearManagedContext'),
      loadManagedMember: jasmine.createSpy('loadManagedMember'),
      retryManagedMember: jasmine.createSpy('retryManagedMember'),
      loadDetail: jasmine.createSpy('loadDetail'),
      reloadDetail: jasmine.createSpy('reloadDetail'),
      beginSelection: jasmine.createSpy('beginSelection'),
      replaceDetail: jasmine.createSpy('replaceDetail'),
      refreshSummariesAndSelectFirst: jasmine.createSpy('refreshSummariesAndSelectFirst'),
      applyMutationVersion: jasmine.createSpy('applyMutationVersion').and.returnValue(true),
      isNotFound: jasmine.createSpy('isNotFound').and.returnValue(false),
    };

    await TestBed.configureTestingModule({
      imports: [ProfileWorkspaceComponent],
      providers: [
        { provide: ProfileService, useValue: profiles },
        { provide: ProfileContextService, useValue: context },
        { provide: ActivatedRoute, useValue: { paramMap: params } },
        { provide: Router, useValue: router },
        { provide: NotificationService, useValue: { showSuccess: jasmine.createSpy('showSuccess') } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ProfileWorkspaceComponent);
    fixture.detectChanges();
  });

  function about(): AboutMeSectionComponent {
    return fixture.debugElement.query(By.directive(AboutMeSectionComponent)).componentInstance;
  }

  function education(): EducationSectionComponent {
    return fixture.debugElement.query(By.directive(EducationSectionComponent)).componentInstance;
  }

  function certificates(): CertificateSectionComponent {
    return fixture.debugElement.query(By.directive(CertificateSectionComponent)).componentInstance;
  }

  function projectsSection(): ProjectsSectionComponent {
    return fixture.debugElement.query(By.directive(ProjectsSectionComponent)).componentInstance;
  }

  function languageSection(): LanguageSectionComponent {
    return fixture.debugElement.query(By.directive(LanguageSectionComponent)).componentInstance;
  }

  function skillSection(): SkillSectionComponent {
    return fixture.debugElement.query(By.directive(SkillSectionComponent)).componentInstance;
  }

  it('loads the selected Profile and renders each feature-local section component', () => {
    expect(context.loadSummaries).toHaveBeenCalled();
    expect(context.loadDetail).toHaveBeenCalledWith('1');
    expect(about().profile).toBe(detail);
    expect(projectsSection().profile).toBe(detail);
    expect(fixture.componentInstance.sections.map(([id]) => id)).toEqual(['about', 'education', 'languages', 'certificates', 'projects', 'skills']);
    expect(fixture.nativeElement.querySelector('#workspace-section-about')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#workspace-section-education')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#workspace-section-languages')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#workspace-section-certificates')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#workspace-section-projects')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#workspace-section-skills')).toBeTruthy();
  });

  it('loads a managed Member route separately and renders managed context without Profile CRUD actions', () => {
    const managedProfile = { ...detail, id: 2, profileName: 'Managed CV' };
    context.loadManagedMember.and.callFake((member: { id: string }, profileId: string | null) => {
      context.managedMember.set(member);
      context.managedSummaries.set([{ ...summary, id: 2, profileName: 'Managed CV' }]);
      context.managedSummariesLoading.set(false);
      context.managedSummariesError.set(null);
      context.managedSelectedId.set(profileId);
      context.managedDetail.set(managedProfile);
      context.managedDetailLoading.set(false);
      context.managedDetailError.set(null);
    });

    params.next(convertToParamMap({ memberId: '10', profileId: '2' }));
    fixture.detectChanges();

    expect(context.loadManagedMember).toHaveBeenCalledWith({ id: '10' }, '2');
    expect(context.loadDetail).toHaveBeenCalledWith('1');
    expect(fixture.nativeElement.querySelector('#workspace-title')?.textContent).toContain('Managed Profile Workspace');
    expect(fixture.nativeElement.textContent).toContain('Managed Member Profile');
    expect(fixture.nativeElement.querySelector('.delete-profile-button')).toBeNull();
    expect(fixture.nativeElement.querySelector('button[type="submit"]')).toBeNull();
  });

  it('keeps a zero-Profile managed route unselected and reports a missing deep-linked Profile in managed context', () => {
    context.loadManagedMember.and.callFake((member: { id: string }, profileId: string | null) => {
      context.managedMember.set(member);
      context.managedSummaries.set(profileId ? [{ ...summary, id: 2 }] : []);
      context.managedSummariesLoading.set(false);
      context.managedSummariesError.set(null);
      context.managedSelectedId.set(profileId);
      context.managedProfileMissing.set(Boolean(profileId));
      context.managedDetail.set(null);
      context.managedDetailLoading.set(false);
      context.managedDetailError.set(null);
    });

    params.next(convertToParamMap({ memberId: '10' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No active Profiles');
    expect(context.managedSelectedId()).toBeNull();

    params.next(convertToParamMap({ memberId: '10', profileId: 'missing' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Profile not found');
    expect(fixture.nativeElement.textContent).not.toContain('My Profile');
  });

  it('keeps section navigation anchors and selected Profile switching in Workspace', () => {
    expect(fixture.nativeElement.querySelector('.section-nav')?.textContent).toContain('About Me');
    expect(fixture.nativeElement.querySelector('.section-nav')?.textContent).toContain('Education');

    about().interactionActiveChange.emit(true);
    context.selectedId.set('2');
    context.detail.set({ ...detail, id: 2, profileName: 'Frontend CV' });
    params.next(convertToParamMap({ profileId: '2' }));
    fixture.detectChanges();

    expect(context.loadDetail).toHaveBeenCalledWith('2');
    expect(fixture.componentInstance.activeSection).toBe('about');
    expect(fixture.componentInstance.mutationOwner).toBeNull();
    expect(about().profile.id).toBe(2);
  });

  it('navigates to Preview using the selected Profile ID', () => {
    fixture.componentInstance.openPreview();

    expect(router.navigate).toHaveBeenCalledWith(['/profiles', '1', 'preview']);
  });

  it('coordinates one child interaction owner with Project mutations and releases it', () => {
    about().interactionActiveChange.emit(true);
    fixture.detectChanges();

    expect(fixture.componentInstance.workspaceMutationLocked()).toBeTrue();
    expect(fixture.componentInstance.mutationOwner).toBe('about');
    expect((fixture.nativeElement.querySelector('#workspace-section-projects .section-title button') as HTMLButtonElement).disabled).toBeTrue();
    expect((fixture.nativeElement.querySelector('#workspace-section-education .section-title button') as HTMLButtonElement).disabled).toBeTrue();

    about().interactionActiveChange.emit(false);
    fixture.detectChanges();
    expect(fixture.componentInstance.mutationOwner).toBeNull();
    expect((fixture.nativeElement.querySelector('#workspace-section-projects .section-title button') as HTMLButtonElement).disabled).toBeFalse();
  });

  it('coordinates Certificate ownership with the remaining Workspace sections', () => {
    certificates().interactionActiveChange.emit(true);
    fixture.detectChanges();

    expect(fixture.componentInstance.workspaceMutationLocked()).toBeTrue();
    expect((fixture.nativeElement.querySelector('#workspace-section-about .edit-about-button') as HTMLButtonElement).disabled).toBeTrue();
    expect((fixture.nativeElement.querySelector('#workspace-section-projects .section-title button') as HTMLButtonElement).disabled).toBeTrue();
  });

  it('keeps Project route navigation in Workspace while preserving the child boundary', () => {
    about().interactionActiveChange.emit(true);
    projectsSection().navigationRequested.emit({ projectId: null });
    expect(router.navigate).not.toHaveBeenCalled();

    about().interactionActiveChange.emit(false);
    projectsSection().navigationRequested.emit({ projectId: null });
    projectsSection().navigationRequested.emit({ projectId: 99 });

    expect(router.navigate).toHaveBeenCalledWith(['/profiles', '1', 'projects', 'new']);
    expect(router.navigate).toHaveBeenCalledWith(['/profiles', '1', 'projects', 99]);
  });

  it('prevents About Me mutation entry while Education owns the mutation context', () => {
    education().interactionActiveChange.emit(true);
    fixture.detectChanges();

    expect(fixture.componentInstance.mutationOwner).toBe('education');
    expect(fixture.componentInstance.mutationBlockedFor('about')).toBeTrue();
    expect((fixture.nativeElement.querySelector('#workspace-section-about .edit-about-button') as HTMLButtonElement).disabled).toBeTrue();
  });

  it('blocks remaining sections when the Language child owns the context', () => {
    languageSection().interactionActiveChange.emit(true);
    fixture.detectChanges();

    expect((fixture.nativeElement.querySelector('#workspace-section-about .edit-about-button') as HTMLButtonElement).disabled).toBeTrue();
    expect((fixture.nativeElement.querySelector('#workspace-section-education .section-title button') as HTMLButtonElement).disabled).toBeTrue();
  });

  it('blocks remaining sections when the Skill child owns the context', () => {
    skillSection().interactionActiveChange.emit(true);
    fixture.detectChanges();

    expect(fixture.componentInstance.workspaceMutationLocked()).toBeTrue();
    expect((fixture.nativeElement.querySelector('#workspace-section-about .edit-about-button') as HTMLButtonElement).disabled).toBeTrue();
    expect((fixture.nativeElement.querySelector('#workspace-section-projects .section-title button') as HTMLButtonElement).disabled).toBeTrue();
  });

  it('uses the application edit session for dirty navigation decisions', async () => {
    fixture.componentInstance.editSession.setDirty(true);
    const decision = fixture.componentInstance.editSession.requestNavigation('/dashboard');
    fixture.componentInstance.discardPendingNavigation();
    await expectAsync(decision).toBeResolvedTo(true);
  });

  it('ignores a stale Profile delete response after the route changes', () => {
    const pendingDelete = new Subject<void>();
    profiles['delete'].and.returnValue(pendingDelete);
    const secondSummary = { ...summary, id: 2, profileName: 'Frontend CV' };
    context.summaries.set([summary, secondSummary]);
    fixture.componentInstance.openDeleteConfirmation();
    fixture.componentInstance.confirmDelete();

    params.next(convertToParamMap({ profileId: '2' }));
    pendingDelete.next();

    expect(router.navigate).not.toHaveBeenCalledWith(['/profiles', 2]);
  });
});
