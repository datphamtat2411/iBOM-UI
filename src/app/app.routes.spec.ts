import { routes } from './app.routes';
import { authGuard, managementGuard } from './core/auth/auth.guard';
import { masterDataRoutes } from './features/master-data/master-data.routes';
import { memberManagementRoutes } from './features/member-management/member-management.routes';
import { userManagementRoutes } from './features/user-management/user-management.routes';

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

  it('protects Profile routes and keeps the canonical workspace children', () => {
    const profiles = routes.find((route) => route.path === 'profiles');

    expect(profiles?.canActivate).toBeTruthy();
    expect(profiles?.canDeactivate).toBeTruthy();
    expect(profiles?.children?.map((route) => route.path)).toEqual(['', 'new', ':profileId/projects/new', ':profileId/projects/:projectId', ':profileId/preview', ':profileId']);
    expect(profiles?.children?.[1].path).toBe('new');
    expect(profiles?.children?.every((route) => route.canActivate)).toBeTrue();
    expect(profiles?.children?.every((route) => route.loadComponent)).toBeTrue();
  });

  it('protects Master Data with authentication and management authorization', () => {
    const masterData = routes.find((route) => route.path === 'master-data');

    expect(masterData?.canActivate).toEqual([authGuard, managementGuard]);
    expect(masterData?.loadComponent).toEqual(jasmine.any(Function));
    expect(masterData?.children).toBe(masterDataRoutes);
  });

  it('protects Member Management with authentication and management authorization', () => {
    const members = routes.find((route) => route.path === 'members');

    expect(members?.canActivate).toEqual([authGuard, managementGuard]);
    expect(members?.data).toEqual({
      managementDeniedMessage: 'You do not have permission to access Member Management.',
    });
    expect(members?.canDeactivate).toBeTruthy();
    expect(members?.loadComponent).toEqual(jasmine.any(Function));
    expect(members?.children).toBe(memberManagementRoutes);
    expect(members?.children?.map((route) => route.path)).toEqual([
      '',
      ':memberId/profiles',
      ':memberId/profiles/:profileId/projects/new',
      ':memberId/profiles/:profileId/projects/:projectId',
      ':memberId/profiles/:profileId/preview',
      ':memberId/profiles/:profileId',
    ]);
    expect(members?.children?.slice(1).every((route) => route.canActivate)).toBeTrue();
  });

  it('does not attach Member Management denial feedback to Master Data', () => {
    const masterData = routes.find((route) => route.path === 'master-data');

    expect(masterData?.data?.['managementDeniedMessage']).toBeUndefined();
  });

  it('protects User Management with authentication and management authorization', () => {
    const users = routes.find((route) => route.path === 'users');

    expect(users?.canActivate).toEqual([authGuard, managementGuard]);
    expect(users?.data).toEqual({
      managementDeniedMessage: 'You do not have permission to access User Management.',
    });
    expect(users?.loadComponent).toEqual(jasmine.any(Function));
    expect(users?.children).toBe(userManagementRoutes);
    expect(users?.children?.map((route) => route.path)).toEqual(['']);
  });
});
