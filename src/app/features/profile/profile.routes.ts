import { Routes } from '@angular/router';

import { profileDirtyDeactivationGuard, profileDirtyNavigationGuard } from './guards/profile-unsaved-changes.guard';

export const profileRoutes: Routes = [
  {
    path: '',
    canActivate: [profileDirtyNavigationGuard],
    loadComponent: () =>
      import('./pages/profile-workspace/profile-workspace.component').then(
        (component) => component.ProfileWorkspaceComponent,
      ),
  },
  {
    path: 'new',
    canActivate: [profileDirtyNavigationGuard],
    loadComponent: () =>
      import('./pages/profile-create/profile-create.component').then(
        (component) => component.ProfileCreateComponent,
      ),
  },
  {
    path: ':profileId/projects/new',
    canActivate: [profileDirtyNavigationGuard],
    loadComponent: () =>
      import('./pages/project-editor/project-editor.component').then(
        (component) => component.ProjectEditorComponent,
      ),
  },
  {
    path: ':profileId/projects/:projectId',
    canActivate: [profileDirtyNavigationGuard],
    loadComponent: () =>
      import('./pages/project-editor/project-editor.component').then(
        (component) => component.ProjectEditorComponent,
      ),
  },
  {
    path: ':profileId/preview',
    canActivate: [profileDirtyNavigationGuard],
    loadComponent: () =>
      import('./pages/cv-preview/cv-preview.component').then(
        (component) => component.CvPreviewComponent,
      ),
  },
  {
    path: ':profileId',
    canActivate: [profileDirtyNavigationGuard],
    loadComponent: () =>
      import('./pages/profile-workspace/profile-workspace.component').then(
        (component) => component.ProfileWorkspaceComponent,
      ),
  },
];
