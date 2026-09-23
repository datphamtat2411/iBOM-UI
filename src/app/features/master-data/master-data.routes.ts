import { Routes } from '@angular/router';

const loadMasterDataWorkspace = () =>
  import('./pages/master-data-workspace/master-data-workspace.component').then(
    (component) => component.MasterDataWorkspaceComponent,
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
    loadComponent: loadMasterDataWorkspace,
    data: { resource: 'Languages' },
  },
  {
    path: 'file-name-formats',
    loadComponent: loadMasterDataWorkspace,
    data: { resource: 'File Name Formats' },
  },
];
