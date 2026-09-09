import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { ProfileEditSessionService } from '../services/profile-edit-session.service';
import { profileDirtyDeactivationGuard, profileDirtyNavigationGuard } from './profile-unsaved-changes.guard';

describe('profile unsaved changes guards', () => {
  let session: ProfileEditSessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ProfileEditSessionService] });
    session = TestBed.inject(ProfileEditSessionService);
  });

  it('keeps clean route changes route-driven', async () => {
    const state = { url: '/profiles/2' } as RouterStateSnapshot;
    await expectAsync(TestBed.runInInjectionContext(() => profileDirtyNavigationGuard({} as ActivatedRouteSnapshot, state))).toBeResolvedTo(true);
  });

  it('uses the same confirmation decision for direct profile route changes and shell deactivation', async () => {
    session.setDirty(true);
    const nextState = { url: '/dashboard' } as RouterStateSnapshot;
    const decision = TestBed.runInInjectionContext(() => profileDirtyDeactivationGuard({}, {} as ActivatedRouteSnapshot, {} as RouterStateSnapshot, nextState));

    expect(session.pendingNavigation()).toEqual({ url: '/dashboard' });
    session.resolveNavigation(true);
    await expectAsync(decision).toBeResolvedTo(true);
  });
});
