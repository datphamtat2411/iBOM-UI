import { inject } from '@angular/core';
import { CanActivateFn, CanDeactivateFn } from '@angular/router';

import { ProfileEditSessionService } from '../services/profile-edit-session.service';

export const profileDirtyNavigationGuard: CanActivateFn = (_route, state) =>
  inject(ProfileEditSessionService).requestNavigation(state.url);

export const profileDirtyDeactivationGuard: CanDeactivateFn<unknown> = (_component, _currentRoute, _currentState, nextState) =>
  inject(ProfileEditSessionService).requestNavigation(nextState?.url ?? '');
