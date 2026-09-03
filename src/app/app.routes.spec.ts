import { routes } from './app.routes';

describe('application routes', () => {
  it('protects the lazy dashboard shell and renders a lazy dashboard child', () => {
    const dashboard = routes.find((route) => route.path === 'dashboard');

    expect(dashboard?.canActivate).toBeTruthy();
    expect(dashboard?.loadComponent).toEqual(jasmine.any(Function));
    expect(dashboard?.children?.[0].path).toBe('');
    expect(dashboard?.children?.[0].loadComponent).toEqual(jasmine.any(Function));
  });

  it('protects authentication pages from an existing session', () => {
    for (const path of ['login', 'registration', 'forgot-password']) {
      expect(routes.find((route) => route.path === path)?.canActivate).toEqual(jasmine.any(Array));
    }
  });
});
