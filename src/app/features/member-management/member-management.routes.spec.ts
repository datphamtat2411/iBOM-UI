import { memberManagementRoutes } from './member-management.routes';

describe('Member Management routes', () => {
  it('lazy-loads the Member Management workspace at the feature root', () => {
    expect(memberManagementRoutes).toHaveSize(3);
    expect(memberManagementRoutes[0].path).toBe('');
    expect(memberManagementRoutes[0].pathMatch).toBe('full');
    expect(memberManagementRoutes[0].loadComponent).toEqual(jasmine.any(Function));
  });

  it('routes both managed Member Profile entry states through the guarded Profile workspace', () => {
    expect(memberManagementRoutes.slice(1).map((route) => route.path)).toEqual([':memberId/profiles', ':memberId/profiles/:profileId']);
    expect(memberManagementRoutes.slice(1).every((route) => route.canActivate)).toBeTrue();
    expect(memberManagementRoutes.slice(1).every((route) => route.loadComponent)).toBeTrue();
  });
});
