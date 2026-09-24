import { Routes } from '@angular/router';

import { authGuard, guestGuard, managementGuard } from './core/auth/auth.guard';
import { profileDirtyDeactivationGuard } from './features/profile/guards/profile-unsaved-changes.guard';
import { masterDataRoutes } from './features/master-data/master-data.routes';
import { memberManagementRoutes } from './features/member-management/member-management.routes';
import { profileRoutes } from './features/profile/profile.routes';
import { userManagementRoutes } from './features/user-management/user-management.routes';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home.component').then(
        (component) => component.HomeComponent,
      ),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/login/login.component').then(
        (component) => component.LoginComponent,
      ),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/shell/application-shell.component').then(
        (component) => component.ApplicationShellComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (component) => component.DashboardComponent,
          ),
      },
      {
        path: 'account-settings',
        loadComponent: () =>
          import('./features/auth/pages/account-settings/account-settings.component').then(
            (component) => component.AccountSettingsComponent,
          ),
      },
    ],
  },
  {
    path: 'profiles',
    canActivate: [authGuard],
    canDeactivate: [profileDirtyDeactivationGuard],
    loadComponent: () =>
      import('./features/shell/application-shell.component').then(
        (component) => component.ApplicationShellComponent,
      ),
    children: profileRoutes,
  },
  {
    path: 'master-data',
    canActivate: [authGuard, managementGuard],
    loadComponent: () =>
      import('./features/shell/application-shell.component').then(
        (component) => component.ApplicationShellComponent,
      ),
    children: masterDataRoutes,
  },
  {
    path: 'members',
    canActivate: [authGuard, managementGuard],
    data: { managementDeniedMessage: 'You do not have permission to access Member Management.' },
    canDeactivate: [profileDirtyDeactivationGuard],
    loadComponent: () =>
      import('./features/shell/application-shell.component').then(
        (component) => component.ApplicationShellComponent,
      ),
    children: memberManagementRoutes,
  },
  {
    path: 'users',
    canActivate: [authGuard, managementGuard],
    data: { managementDeniedMessage: 'You do not have permission to access User Management.' },
    loadComponent: () =>
      import('./features/shell/application-shell.component').then(
        (component) => component.ApplicationShellComponent,
      ),
    children: userManagementRoutes,
  },
  {
    path: 'registration',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/registration/registration.component').then(
        (component) => component.RegistrationComponent,
      ),
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/forgot-password/forgot-password.component').then(
        (component) => component.ForgotPasswordComponent,
      ),
  },
];
