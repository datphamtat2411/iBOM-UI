import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Subject, of, throwError } from 'rxjs';

import { NotificationService } from '../../../../../../core/notifications/notification.service';
import { ProfileDetail, Project } from '../../../../models/profile.models';
import { ProfileContextService } from '../../../../services/profile-context.service';
import { ProfileService } from '../../../../services/profile.service';
import { ProjectsSectionComponent } from './projects-section.component';

describe('ProjectsSectionComponent', () => {
  let fixture: ComponentFixture<ProjectsSectionComponent>;
  let context: {
    selectedId: ReturnType<typeof signal>;
    detail: ReturnType<typeof signal>;
    reloadDetail: jasmine.Spy;
    applyMutationVersion: jasmine.Spy;
  };
  let profiles: { listProjects: jasmine.Spy; deleteProject: jasmine.Spy };
  let notifications: { showSuccess: jasmine.Spy };
  const profile: ProfileDetail = {
    id: 1,
    profileName: 'Backend CV',
    firstName: 'A',
    lastName: 'User',
    jobTitle: 'Engineer',
    yearsOfExperience: 5,
    personality: null,
    technicalSummary: null,
    hasPreviewed: true,
    version: 3,
    updatedAt: '2026-01-01',
    createdAt: '2026-01-01',
    lastExportedAt: null,
    preferredFileNameFormatId: null,
  };
  const project: Project = {
    id: 1,
    name: 'Order Platform',
    description: 'Modernized order flow',
    startDate: '2025-01-01',
    endDate: null,
    status: 'ONGOING',
    position: 'Backend Lead',
    teamSize: 5,
    responsibilities: 'Design services\nReview incidents',
    programmingLanguages: 'Java\nSQL',
    tools: 'Kafka',
  };

  beforeEach(async () => {
    context = {
      selectedId: signal('1'),
      detail: signal<ProfileDetail | null>(profile),
      reloadDetail: jasmine.createSpy('reloadDetail').and.returnValue(of(profile)),
      applyMutationVersion: jasmine.createSpy('applyMutationVersion').and.callFake((_id: string, version: number) => {
        context.detail.set({ ...profile, version, hasPreviewed: false });
        return true;
      }),
    };
    profiles = {
      listProjects: jasmine.createSpy('listProjects').and.returnValue(of([project])),
      deleteProject: jasmine.createSpy('deleteProject'),
    };
    notifications = { showSuccess: jasmine.createSpy('showSuccess') };
    await TestBed.configureTestingModule({
      imports: [ProjectsSectionComponent],
      providers: [
        { provide: ProfileContextService, useValue: context },
        { provide: ProfileService, useValue: profiles },
        { provide: NotificationService, useValue: notifications },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ProjectsSectionComponent);
    fixture.componentInstance.profile = profile;
    fixture.detectChanges();
    fixture.componentInstance.resetForProfile();
    fixture.detectChanges();
  });

  it('loads and renders Projects in backend-provided order', () => {
    const later = { ...project, id: 2, name: 'Later Response' };
    profiles.listProjects.and.returnValue(of([later, project]));
    fixture.componentInstance.resetForProfile();
    fixture.detectChanges();

    expect(fixture.componentInstance.projects.map((item) => item.id)).toEqual([2, 1]);
    expect(fixture.nativeElement.textContent).toContain('Later Response');
    expect(fixture.nativeElement.textContent).toContain('Jan 2025');
    expect(fixture.nativeElement.textContent).toContain('Present');
  });

  it('keeps expansion independent per Project and resets it on Profile changes', () => {
    const second = { ...project, id: 2, name: 'Second Project', startDate: '2024-01-01' };
    profiles.listProjects.and.returnValue(of([project, second]));
    fixture.componentInstance.resetForProfile();
    fixture.componentInstance.toggleProjectDetails(project);
    expect(fixture.componentInstance.isProjectExpanded(project)).toBeTrue();
    expect(fixture.componentInstance.isProjectExpanded(second)).toBeFalse();
    fixture.componentInstance.toggleProjectDetails(second);
    expect(fixture.componentInstance.isProjectExpanded(second)).toBeTrue();

    context.selectedId.set('2');
    context.detail.set({ ...profile, id: 2 });
    fixture.componentInstance.profile = { ...profile, id: 2 };
    fixture.componentInstance.resetForProfile();
    fixture.detectChanges();
    expect(fixture.componentInstance.isProjectExpanded(project)).toBeFalse();
    expect(fixture.componentInstance.isProjectExpanded(second)).toBeFalse();
  });

  it('emits Add and Edit route intents without owning the routed editor', () => {
    const request = jasmine.createSpy('request');
    fixture.componentInstance.navigationRequested.subscribe(request);
    fixture.componentInstance.requestProjectCreate();
    fixture.componentInstance.requestProjectEdit(project);

    expect(request).toHaveBeenCalledWith({ projectId: null });
    expect(request).toHaveBeenCalledWith({ projectId: 1 });
  });

  it('blocks route and delete entry while another mutation owns the context but keeps expansion safe', () => {
    const request = jasmine.createSpy('request');
    fixture.componentInstance.navigationRequested.subscribe(request);
    fixture.componentInstance.mutationBlocked = true;
    fixture.componentInstance.requestProjectCreate();
    fixture.componentInstance.requestProjectEdit(project);
    fixture.componentInstance.openProjectDeleteConfirmation(project);

    expect(request).not.toHaveBeenCalled();
    expect(fixture.componentInstance.projectDeleteConfirmation).toBeFalse();
    fixture.componentInstance.toggleProjectDetails(project);
    expect(fixture.componentInstance.isProjectExpanded(project)).toBeTrue();
  });

  it('confirms and deletes a Project with the canonical version', () => {
    profiles.deleteProject.and.returnValue(of({ profileVersion: 4 }));
    fixture.componentInstance.openProjectDeleteConfirmation(project);
    fixture.componentInstance.confirmProjectDelete();

    expect(profiles.deleteProject).toHaveBeenCalledWith('1', 1, 3);
    expect(context.applyMutationVersion).toHaveBeenCalledWith('1', 4);
    expect(notifications.showSuccess).toHaveBeenCalledWith('Project deleted successfully.');
  });

  it('requires reload and explicit retry after a Project delete conflict', () => {
    const latest = new Subject<ProfileDetail>();
    const refreshed = new Subject<Project[]>();
    context.reloadDetail.and.returnValue(latest);
    profiles.listProjects.and.returnValue(refreshed);
    profiles.deleteProject.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'PROFILE_VERSION_CONFLICT' } })));
    fixture.componentInstance.openProjectDeleteConfirmation(project);
    fixture.componentInstance.confirmProjectDelete();

    expect(fixture.componentInstance.hasDeleteConflict()).toBeTrue();
    fixture.componentInstance.confirmProjectDelete();
    expect(profiles.deleteProject).toHaveBeenCalledTimes(1);
    fixture.componentInstance.reloadLatest();
    context.detail.set({ ...profile, version: 4 });
    latest.next({ ...profile, version: 4 });
    refreshed.next([project]);

    expect(fixture.componentInstance.hasDeleteConflict()).toBeFalse();
    expect(fixture.componentInstance.projectDeleteConfirmation).toBeTrue();
    profiles.deleteProject.and.returnValue(of({ profileVersion: 5 }));
    fixture.componentInstance.confirmProjectDelete();
    expect(profiles.deleteProject).toHaveBeenCalledWith('1', 1, 4);
  });

  it('closes delete recovery when the target disappeared and never retries automatically', () => {
    const latest = new Subject<ProfileDetail>();
    const refreshed = new Subject<Project[]>();
    context.reloadDetail.and.returnValue(latest);
    profiles.listProjects.and.returnValue(refreshed);
    profiles.deleteProject.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'PROFILE_VERSION_CONFLICT' } })));
    fixture.componentInstance.openProjectDeleteConfirmation(project);
    fixture.componentInstance.confirmProjectDelete();
    fixture.componentInstance.reloadLatest();
    latest.next({ ...profile, version: 4 });
    refreshed.next([]);

    expect(fixture.componentInstance.projectDeleteConfirmation).toBeFalse();
    expect(fixture.componentInstance.projectDeleteTarget).toBeNull();
    expect(profiles.deleteProject).toHaveBeenCalledTimes(1);
  });

  it('ignores stale Project list, delete, and recovery responses after switching Profile', () => {
    const first = new Subject<Project[]>();
    const second = new Subject<Project[]>();
    profiles.listProjects.and.returnValues(first, second);
    fixture.componentInstance.resetForProfile();
    context.selectedId.set('2');
    context.detail.set({ ...profile, id: 2 });
    fixture.componentInstance.profile = { ...profile, id: 2 };
    fixture.componentInstance.resetForProfile();
    fixture.detectChanges();
    first.next([project]);
    second.next([{ ...project, id: 2, name: 'Other Profile Project' }]);
    expect(fixture.componentInstance.projects[0].name).toBe('Other Profile Project');

    context.selectedId.set('1');
    context.detail.set(profile);
    fixture.componentInstance.profile = profile;
    profiles.listProjects.and.returnValue(of([project]));
    fixture.componentInstance.resetForProfile();
    fixture.detectChanges();
    const pending = new Subject<{ profileVersion: number }>();
    profiles.deleteProject.and.returnValue(pending);
    fixture.componentInstance.openProjectDeleteConfirmation(project);
    fixture.componentInstance.confirmProjectDelete();
    context.selectedId.set('2');
    context.detail.set({ ...profile, id: 2 });
    pending.next({ profileVersion: 9 });

    expect(context.applyMutationVersion).not.toHaveBeenCalledWith('1', 9);
    expect(notifications.showSuccess).not.toHaveBeenCalled();
  });
});
