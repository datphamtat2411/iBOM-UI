import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';

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
    path: 'registration',
    loadComponent: () =>
      import('./features/auth/pages/registration/registration.component').then(
        (component) => component.RegistrationComponent,
      ),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/pages/forgot-password/forgot-password.component').then(
        (component) => component.ForgotPasswordComponent,
      ),
  },
];
