import { profileDirtyNavigationGuard } from './guards/profile-unsaved-changes.guard';
import { profileRoutes } from './profile.routes';

describe('Profile routes', () => {
  it('matches the Profile-ID-based Preview route inside the guarded Profile shell', () => {
    const preview = profileRoutes.find((route) => route.path === ':profileId/preview');
    const workspace = profileRoutes.find((route) => route.path === ':profileId');

    expect(preview?.canActivate).toEqual([profileDirtyNavigationGuard]);
    expect(preview?.loadComponent).toEqual(jasmine.any(Function));
    expect(profileRoutes.indexOf(preview!)).toBeLessThan(profileRoutes.indexOf(workspace!));
  });

  it('matches the Project create and edit routes with the dirty navigation guard', () => {
    const create = profileRoutes.find((route) => route.path === ':profileId/projects/new');
    const edit = profileRoutes.find((route) => route.path === ':profileId/projects/:projectId');

    expect(create?.canActivate).toEqual([profileDirtyNavigationGuard]);
    expect(edit?.canActivate).toEqual([profileDirtyNavigationGuard]);
    expect(create?.loadComponent).toEqual(jasmine.any(Function));
    expect(edit?.loadComponent).toEqual(jasmine.any(Function));
  });

  it('keeps Project routes ahead of the single-segment Profile workspace route', () => {
    const createIndex = profileRoutes.findIndex((route) => route.path === ':profileId/projects/new');
    const editIndex = profileRoutes.findIndex((route) => route.path === ':profileId/projects/:projectId');
    const workspaceIndex = profileRoutes.findIndex((route) => route.path === ':profileId');

    expect(createIndex).toBeLessThan(workspaceIndex);
    expect(editIndex).toBeLessThan(workspaceIndex);
  });
});
