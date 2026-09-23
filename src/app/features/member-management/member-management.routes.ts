import { Routes } from '@angular/router';

export const memberManagementRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./pages/member-management/member-management.component').then(
        (component) => component.MemberManagementComponent,
      ),
  },
];
