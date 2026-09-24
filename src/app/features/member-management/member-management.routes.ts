import { Routes } from '@angular/router';

import { profileDirtyNavigationGuard } from '../profile/guards/profile-unsaved-changes.guard';

export const memberManagementRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./pages/member-management/member-management.component').then(
        (component) => component.MemberManagementComponent,
      ),
  },
  {
    path: ':memberId/profiles',
    canActivate: [profileDirtyNavigationGuard],
    loadComponent: () =>
      import('../profile/pages/profile-workspace/profile-workspace.component').then(
        (component) => component.ProfileWorkspaceComponent,
      ),
  },
  {
    path: ':memberId/profiles/:profileId/projects/new',
    canActivate: [profileDirtyNavigationGuard],
    loadComponent: () =>
      import('../profile/pages/project-editor/project-editor.component').then(
        (component) => component.ProjectEditorComponent,
      ),
  },
  {
    path: ':memberId/profiles/:profileId/projects/:projectId',
    canActivate: [profileDirtyNavigationGuard],
    loadComponent: () =>
      import('../profile/pages/project-editor/project-editor.component').then(
        (component) => component.ProjectEditorComponent,
      ),
  },
  {
    path: ':memberId/profiles/:profileId/preview',
    canActivate: [profileDirtyNavigationGuard],
    loadComponent: () =>
      import('../profile/pages/cv-preview/cv-preview.component').then(
        (component) => component.CvPreviewComponent,
      ),
  },
  {
    path: ':memberId/profiles/:profileId',
    canActivate: [profileDirtyNavigationGuard],
    loadComponent: () =>
      import('../profile/pages/profile-workspace/profile-workspace.component').then(
        (component) => component.ProfileWorkspaceComponent,
      ),
  },
];
