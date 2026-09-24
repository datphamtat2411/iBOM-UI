import { userManagementRoutes } from './user-management.routes';

describe('User Management routes', () => {
  it('lazy-loads the User Management workspace at the feature root', () => {
    expect(userManagementRoutes).toHaveSize(1);
    expect(userManagementRoutes[0].path).toBe('');
    expect(userManagementRoutes[0].pathMatch).toBe('full');
    expect(userManagementRoutes[0].loadComponent).toEqual(jasmine.any(Function));
  });
});
