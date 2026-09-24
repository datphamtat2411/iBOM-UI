import { profileDirtyNavigationGuard } from '../profile/guards/profile-unsaved-changes.guard';
import { memberManagementRoutes } from './member-management.routes';

describe('Member Management routes', () => {
  it('lazy-loads the Member Management workspace at the feature root', () => {
    expect(memberManagementRoutes).toHaveSize(6);
    expect(memberManagementRoutes[0].path).toBe('');
    expect(memberManagementRoutes[0].pathMatch).toBe('full');
    expect(memberManagementRoutes[0].loadComponent).toEqual(jasmine.any(Function));
  });

  it('routes managed Profile workspace, Project editor, and Preview states through guarded shared components', () => {
    expect(memberManagementRoutes.slice(1).map((route) => route.path)).toEqual([
      ':memberId/profiles',
      ':memberId/profiles/:profileId/projects/new',
      ':memberId/profiles/:profileId/projects/:projectId',
      ':memberId/profiles/:profileId/preview',
      ':memberId/profiles/:profileId',
    ]);
    expect(memberManagementRoutes.slice(1).every((route) => route.canActivate)).toBeTrue();
    expect(memberManagementRoutes[1].loadComponent).toEqual(jasmine.any(Function));
    expect(memberManagementRoutes[2].loadComponent).toEqual(jasmine.any(Function));
    expect(memberManagementRoutes[3].loadComponent).toEqual(jasmine.any(Function));
    expect(memberManagementRoutes[4].loadComponent).toEqual(jasmine.any(Function));
    expect(memberManagementRoutes[5].loadComponent).toEqual(jasmine.any(Function));
  });

  it('reuses the shared CV Preview component for managed Preview routes', () => {
    const preview = memberManagementRoutes.find((route) => route.path === ':memberId/profiles/:profileId/preview');

    expect(preview?.canActivate).toEqual([profileDirtyNavigationGuard]);
    expect(preview?.loadComponent).toEqual(jasmine.any(Function));
  });
});
