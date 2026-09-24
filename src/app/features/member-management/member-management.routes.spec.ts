import { profileDirtyNavigationGuard } from '../profile/guards/profile-unsaved-changes.guard';
import { memberManagementRoutes } from './member-management.routes';

describe('Member Management routes', () => {
  it('lazy-loads the Member Management workspace at the feature root', () => {
    expect(memberManagementRoutes).toHaveSize(4);
    expect(memberManagementRoutes[0].path).toBe('');
    expect(memberManagementRoutes[0].pathMatch).toBe('full');
    expect(memberManagementRoutes[0].loadComponent).toEqual(jasmine.any(Function));
  });

  it('routes both managed Member Profile entry states through the guarded Profile workspace', () => {
    expect(memberManagementRoutes.slice(1).map((route) => route.path)).toEqual([
      ':memberId/profiles',
      ':memberId/profiles/:profileId/preview',
      ':memberId/profiles/:profileId',
    ]);
    expect(memberManagementRoutes.slice(1).every((route) => route.canActivate)).toBeTrue();
    expect(memberManagementRoutes.slice(1).every((route) => route.loadComponent)).toBeTrue();
  });

  it('reuses the shared CV Preview component for managed Preview routes', () => {
    const preview = memberManagementRoutes.find((route) => route.path === ':memberId/profiles/:profileId/preview');

    expect(preview?.canActivate).toEqual([profileDirtyNavigationGuard]);
    expect(preview?.loadComponent).toEqual(jasmine.any(Function));
  });
});
