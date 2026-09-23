import { memberManagementRoutes } from './member-management.routes';

describe('Member Management routes', () => {
  it('lazy-loads the Member Management workspace at the feature root', () => {
    expect(memberManagementRoutes).toHaveSize(1);
    expect(memberManagementRoutes[0].path).toBe('');
    expect(memberManagementRoutes[0].pathMatch).toBe('full');
    expect(memberManagementRoutes[0].loadComponent).toEqual(jasmine.any(Function));
  });
});
