import { Routes } from '@angular/router';

export const userManagementRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./pages/user-management/user-management.component').then(
        (component) => component.UserManagementComponent,
      ),
  },
];
