import { masterDataRoutes } from './master-data.routes';

describe('Master Data routes', () => {
  it('redirects the workspace root to Skills', () => {
    expect(masterDataRoutes[0]).toEqual({
      path: '',
      pathMatch: 'full',
      redirectTo: 'skills',
    });
  });

  it('keeps the shared workspace host for resources without a dedicated page', () => {
    const resourceRoutes = masterDataRoutes.slice(1).filter((route) => route.path !== 'languages');

    expect(resourceRoutes.map((route) => route.path)).toEqual([
      'skills',
      'seniority',
      'file-name-formats',
    ]);
    expect(resourceRoutes.map((route) => route.data?.['resource'])).toEqual([
      'Skills',
      'Seniority',
      'File Name Formats',
    ]);
    expect(resourceRoutes.every((route) => route.loadComponent === resourceRoutes[0].loadComponent)).toBeTrue();
  });

  it('lazy-loads a dedicated Languages management page without changing its route contract', () => {
    const languages = masterDataRoutes.find((route) => route.path === 'languages');

    expect(languages?.data?.['resource']).toBe('Languages');
    expect(languages?.loadComponent).toEqual(jasmine.any(Function));
    expect(languages?.loadComponent).not.toBe(masterDataRoutes[1].loadComponent);
  });
});
