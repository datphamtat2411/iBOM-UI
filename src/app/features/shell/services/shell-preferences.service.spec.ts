import { ShellPreferencesService, SHELL_SIDEBAR_COLLAPSED_STORAGE_KEY } from './shell-preferences.service';

describe('ShellPreferencesService', () => {
  let viewportWidth = 1440;

  beforeEach(() => {
    localStorage.removeItem(SHELL_SIDEBAR_COLLAPSED_STORAGE_KEY);
    spyOnProperty(window, 'innerWidth', 'get').and.callFake(() => viewportWidth);
  });

  afterEach(() => {
    try {
      localStorage.removeItem(SHELL_SIDEBAR_COLLAPSED_STORAGE_KEY);
    } catch {
      // The storage guard test intentionally blocks localStorage access.
    }
  });

  it('defaults to an expanded sidebar on desktop', () => {
    viewportWidth = 1440;

    const service = new ShellPreferencesService();

    expect(service.sidebarCollapsed()).toBeFalse();
  });

  it('defaults to a collapsed sidebar on tablet widths', () => {
    viewportWidth = 1024;

    const service = new ShellPreferencesService();

    expect(service.sidebarCollapsed()).toBeTrue();
  });

  it('keeps the persistent preference independent from the responsive default', () => {
    localStorage.setItem(SHELL_SIDEBAR_COLLAPSED_STORAGE_KEY, 'false');
    viewportWidth = 1024;

    const service = new ShellPreferencesService();

    expect(service.sidebarCollapsed()).toBeFalse();
  });

  it('ignores invalid stored values and falls back to the viewport default', () => {
    localStorage.setItem(SHELL_SIDEBAR_COLLAPSED_STORAGE_KEY, 'sometimes');
    viewportWidth = 1024;

    const service = new ShellPreferencesService();

    expect(service.sidebarCollapsed()).toBeTrue();
  });

  it('persists explicit collapse and expand actions immediately', () => {
    const service = new ShellPreferencesService();

    service.setSidebarCollapsed(true);
    expect(service.sidebarCollapsed()).toBeTrue();
    expect(localStorage.getItem(SHELL_SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe('true');

    service.setSidebarCollapsed(false);
    expect(service.sidebarCollapsed()).toBeFalse();
    expect(localStorage.getItem(SHELL_SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe('false');
  });

  it('does not throw when local storage is unavailable', () => {
    spyOnProperty(window, 'localStorage', 'get').and.throwError('storage blocked');

    const service = new ShellPreferencesService();

    expect(() => service.setSidebarCollapsed(true)).not.toThrow();
    expect(service.sidebarCollapsed()).toBeTrue();
  });
});
