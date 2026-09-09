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
    path: 'new',
    loadComponent: () =>
      import('./pages/profile-create/profile-create.component').then(
        (component) => component.ProfileCreateComponent,
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
