import { TestBed } from '@angular/core/testing';

import { ProfileEditSessionService } from './profile-edit-session.service';

describe('ProfileEditSessionService', () => {
  let service: ProfileEditSessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ProfileEditSessionService] });
    service = TestBed.inject(ProfileEditSessionService);
  });

  it('allows clean navigation without opening a confirmation', async () => {
    await expectAsync(service.requestNavigation('/dashboard')).toBeResolvedTo(true);
    expect(service.pendingNavigation()).toBeNull();
  });

  it('waits for the workspace decision and resolves a pending navigation once', async () => {
    service.setDirty(true);
    const decision = service.requestNavigation('/profiles/2');

    expect(service.pendingNavigation()).toEqual({ url: '/profiles/2' });
    service.resolveNavigation(false);
    await expectAsync(decision).toBeResolvedTo(false);
    expect(service.pendingNavigation()).toBeNull();
  });
});
