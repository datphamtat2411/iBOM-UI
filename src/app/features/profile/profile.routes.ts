import { Routes } from '@angular/router';

export const profileRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/profile-workspace/profile-workspace.component').then(
        (component) => component.ProfileWorkspaceComponent,
      ),
  },
  {
    path: ':profileId',
    loadComponent: () =>
      import('./pages/profile-workspace/profile-workspace.component').then(
        (component) => component.ProfileWorkspaceComponent,
      ),
  },
];
