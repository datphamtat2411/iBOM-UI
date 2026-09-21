import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';

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
    loadSummaries: jasmine.Spy;
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
  const detail: ProfileDetail = { ...summary, yearsOfExperience: 5, personality: 'Methodical', technicalSummary: 'Angular and Java', hasPreviewed: true, version: 3, createdAt: '2026-01-01' };

  beforeEach(async () => {
    params = new BehaviorSubject(convertToParamMap({ profileId: '1' }));
    router = { navigate: jasmine.createSpy('navigate') };
    profiles = {
      update: jasmine.createSpy('update'),
      delete: jasmine.createSpy('delete'),
      listEducations: jasmine.createSpy('listEducations').and.returnValue(of([])),
      createEducation: jasmine.createSpy('createEducation'),
      updateEducation: jasmine.createSpy('updateEducation'),
      deleteEducation: jasmine.createSpy('deleteEducation'),
      listProfileLanguages: jasmine.createSpy('listProfileLanguages').and.returnValue(of([])),
      createProfileLanguage: jasmine.createSpy('createProfileLanguage'),
      updateProfileLanguage: jasmine.createSpy('updateProfileLanguage'),
      deleteProfileLanguage: jasmine.createSpy('deleteProfileLanguage'),
      listCertificates: jasmine.createSpy('listCertificates').and.returnValue(of([])),
      createCertificate: jasmine.createSpy('createCertificate'),
      updateCertificate: jasmine.createSpy('updateCertificate'),
      deleteCertificate: jasmine.createSpy('deleteCertificate'),
      listProjects: jasmine.createSpy('listProjects').and.returnValue(of([])),
      deleteProject: jasmine.createSpy('deleteProject'),
      listProfileSkills: jasmine.createSpy('listProfileSkills').and.returnValue(of([])),
      createProfileSkill: jasmine.createSpy('createProfileSkill'),
      updateProfileSkill: jasmine.createSpy('updateProfileSkill'),
      deleteProfileSkill: jasmine.createSpy('deleteProfileSkill'),
      listLanguageMaster: jasmine.createSpy('listLanguageMaster').and.returnValue(of({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 })),
      listSkillMaster: jasmine.createSpy('listSkillMaster').and.returnValue(of({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 })),
    };
    context = {
      summaries: signal([summary]),
      summariesLoading: signal(false),
      summariesError: signal(null),
      selectedId: signal('1'),
      detail: signal<ProfileDetail | null>(detail),
      detailLoading: signal(false),
      detailError: signal(null),
      loadSummaries: jasmine.createSpy('loadSummaries'),
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

  it('loads the selected Profile and renders both feature-local section components', () => {
    expect(context.loadSummaries).toHaveBeenCalled();
    expect(context.loadDetail).toHaveBeenCalledWith('1');
    expect(fixture.nativeElement.querySelector('#workspace-section-about')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#workspace-section-education')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#workspace-section-languages')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#workspace-section-certificates')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#workspace-section-projects')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#workspace-section-skills')).toBeTruthy();
  });

  it('keeps section navigation anchors and selected Profile switching in Workspace', () => {
    expect(fixture.nativeElement.querySelector('.section-nav')?.textContent).toContain('About Me');
    expect(fixture.nativeElement.querySelector('.section-nav')?.textContent).toContain('Education');

    context.selectedId.set('2');
    context.detail.set({ ...detail, id: 2, profileName: 'Frontend CV' });
    params.next(convertToParamMap({ profileId: '2' }));

    expect(context.loadDetail).toHaveBeenCalledWith('2');
    expect(fixture.componentInstance.activeSection).toBe('about');
  });

  it('coordinates the extracted child interaction lock with Project mutations', () => {
    about().startEditing();
    fixture.detectChanges();

    expect(fixture.componentInstance.workspaceMutationLocked()).toBeTrue();
    expect((fixture.nativeElement.querySelector('#workspace-section-projects .section-title button') as HTMLButtonElement).disabled).toBeTrue();
    expect((fixture.nativeElement.querySelector('#workspace-section-education .section-title button') as HTMLButtonElement).disabled).toBeTrue();
  });

  it('coordinates Certificate ownership with the remaining Workspace sections', () => {
    certificates().startCertificateCreate();
    fixture.detectChanges();

    expect(fixture.componentInstance.workspaceMutationLocked()).toBeTrue();
    expect((fixture.nativeElement.querySelector('#workspace-section-about .edit-about-button') as HTMLButtonElement).disabled).toBeTrue();
    expect((fixture.nativeElement.querySelector('#workspace-section-projects .section-title button') as HTMLButtonElement).disabled).toBeTrue();
  });

  it('keeps Project route navigation in Workspace while preserving the child boundary', () => {
    projectsSection().requestProjectCreate();
    const project = {
      id: 99,
      name: 'Project',
      description: 'Description',
      startDate: null,
      endDate: null,
      status: 'ONGOING' as const,
      position: 'Engineer',
      teamSize: null,
      responsibilities: null,
      programmingLanguages: null,
      tools: null,
    };
    projectsSection().projects = [project];
    projectsSection().requestProjectEdit(project);

    expect(router.navigate).toHaveBeenCalledWith(['/profiles', '1', 'projects', 'new']);
    expect(router.navigate).toHaveBeenCalledWith(['/profiles', '1', 'projects', 99]);
  });

  it('prevents About Me from starting while Education owns the mutation context', () => {
    education().startEducationCreate();
    fixture.detectChanges();

    expect(education().educationEditorMode).toBe('create');
    expect(fixture.componentInstance.canStartAboutMeMutation()).toBeFalse();
    expect((fixture.nativeElement.querySelector('#workspace-section-about .edit-about-button') as HTMLButtonElement).disabled).toBeTrue();
  });

  it('blocks remaining sections when the Language child owns the context', () => {
    languageSection().startLanguageCreate();
    fixture.detectChanges();

    expect((fixture.nativeElement.querySelector('#workspace-section-about .edit-about-button') as HTMLButtonElement).disabled).toBeTrue();
    expect((fixture.nativeElement.querySelector('#workspace-section-education .section-title button') as HTMLButtonElement).disabled).toBeTrue();
  });

  it('blocks remaining sections when the Skill child owns the context', () => {
    skillSection().startSkillCreate();
    fixture.detectChanges();

    expect(fixture.componentInstance.workspaceMutationLocked()).toBeTrue();
    expect((fixture.nativeElement.querySelector('#workspace-section-about .edit-about-button') as HTMLButtonElement).disabled).toBeTrue();
    expect((fixture.nativeElement.querySelector('#workspace-section-projects .section-title button') as HTMLButtonElement).disabled).toBeTrue();
  });

  it('coordinates successful child mutations through the Workspace preview signal', () => {
    fixture.componentInstance.previewInvalidated = false;
    about().mutationSucceeded.emit({ profileId: '1', previewInvalidated: true });
    expect(fixture.componentInstance.previewInvalidated).toBeTrue();

    education().mutationSucceeded.emit({ profileId: '1', previewInvalidated: true });
    expect(fixture.componentInstance.previewInvalidated).toBeTrue();
  });

  it('ignores a mutation success signal for a Profile that is no longer selected', () => {
    fixture.componentInstance.previewInvalidated = false;
    context.selectedId.set('2');
    about().mutationSucceeded.emit({ profileId: '1', previewInvalidated: true });
    expect(fixture.componentInstance.previewInvalidated).toBeFalse();
  });

  it('uses the application edit session for extracted dirty navigation', () => {
    about().startEditing();
    about().editForm.controls.firstName.setValue('Changed');
    about().editForm.markAsDirty();

    expect(fixture.componentInstance.editSession.dirty()).toBeTrue();
    fixture.componentInstance.discardPendingNavigation();
    expect(fixture.componentInstance.editSession.dirty()).toBeFalse();
    expect(about().isEditing).toBeFalse();
  });
});
