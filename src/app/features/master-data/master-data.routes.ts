import { Routes } from '@angular/router';

const loadMasterDataWorkspace = () =>
  import('./pages/master-data-workspace/master-data-workspace.component').then(
    (component) => component.MasterDataWorkspaceComponent,
  );

const loadLanguageMasterManagement = () =>
  import('./pages/language-master-management/language-master-management.component').then(
    (component) => component.LanguageMasterManagementComponent,
  );

export const masterDataRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'skills',
  },
  {
    path: 'skills',
    loadComponent: loadMasterDataWorkspace,
    data: { resource: 'Skills' },
  },
  {
    path: 'seniority',
    loadComponent: loadMasterDataWorkspace,
    data: { resource: 'Seniority' },
  },
  {
    path: 'languages',
    loadComponent: loadLanguageMasterManagement,
    data: { resource: 'Languages' },
  },
  {
    path: 'file-name-formats',
    loadComponent: loadMasterDataWorkspace,
    data: { resource: 'File Name Formats' },
  },
];
