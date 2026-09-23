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
    const resourceRoutes = masterDataRoutes.slice(1).filter((route) =>
      ['skills', 'seniority'].includes(route.path ?? ''),
    );

    expect(resourceRoutes.map((route) => route.path)).toEqual([
      'skills',
      'seniority',
    ]);
    expect(resourceRoutes.map((route) => route.data?.['resource'])).toEqual([
      'Skills',
      'Seniority',
    ]);
    expect(resourceRoutes.every((route) => route.loadComponent === resourceRoutes[0].loadComponent)).toBeTrue();
  });

  it('lazy-loads a dedicated Languages management page without changing its route contract', () => {
    const languages = masterDataRoutes.find((route) => route.path === 'languages');

    expect(languages?.data?.['resource']).toBe('Languages');
    expect(languages?.loadComponent).toEqual(jasmine.any(Function));
    expect(languages?.loadComponent).not.toBe(masterDataRoutes[1].loadComponent);
  });

  it('lazy-loads a dedicated File Name Formats page', () => {
    const route = masterDataRoutes.find((item) => item.path === 'file-name-formats');

    expect(route?.loadComponent).toEqual(jasmine.any(Function));
    expect(route?.loadComponent).not.toBe(masterDataRoutes[1].loadComponent);
    expect(route?.data).toBeUndefined();
  });
});
