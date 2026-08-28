import { Routes } from '@angular/router';

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
    path: 'registration',
    loadComponent: () =>
      import('./features/auth/pages/registration/registration.component').then(
        (component) => component.RegistrationComponent,
      ),
  },
];
