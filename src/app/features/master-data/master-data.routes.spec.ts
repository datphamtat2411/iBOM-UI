import { masterDataRoutes } from './master-data.routes';

describe('Master Data routes', () => {
  it('redirects the workspace root to Skills', () => {
    expect(masterDataRoutes[0]).toEqual({
      path: '',
      pathMatch: 'full',
      redirectTo: 'skills',
    });
  });

  it('uses the shared workspace host for every Master Data resource', () => {
    const resourceRoutes = masterDataRoutes.slice(1);

    expect(resourceRoutes.map((route) => route.path)).toEqual([
      'skills',
      'seniority',
      'languages',
      'file-name-formats',
    ]);
    expect(resourceRoutes.map((route) => route.data?.['resource'])).toEqual([
      'Skills',
      'Seniority',
      'Languages',
      'File Name Formats',
    ]);
    expect(resourceRoutes.every((route) => route.loadComponent === resourceRoutes[0].loadComponent)).toBeTrue();
  });
});
