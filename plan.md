# Task Plan

1. Add a real logout operation to the existing `AuthService`.
2. Route logout through `/api/auth/logout` with credentials and Angular XSRF handling.
3. Coordinate logout with shared refresh requests so stale refresh results cannot restore auth.
4. Connect the shell Sign out action with duplicate-submit protection.
5. Clear local session state and navigate to `/login` only after successful logout.
6. Preserve the authenticated session and show retryable feedback when logout fails.
7. Add focused service, interceptor, guard, and shell tests.

# Repository Findings

- `AuthService` stores access token and user only in signals.
- Session restoration calls the shared refresh flow during `APP_INITIALIZER`.
- `refreshAccessToken()` shares concurrent requests but can currently write a session after logout clears state.
- The interceptor attaches credentials to API requests and retries eligible `401` responses through refresh.
- Refresh requests are excluded from token attachment and retry through `IS_REFRESH_REQUEST`.
- Logout is not currently represented in API configuration or HTTP context.
- `authGuard` allows navigation only when both token and user are present, otherwise redirects to `/login`.
- `/dashboard` and its children are protected by `authGuard`.
- Login already navigates to `/dashboard` after successful authentication.
- The shell Sign out button has no click handler.
- Shell account-menu behavior already supports closing on navigation, outside click, and Escape.
- No browser token storage is used or should be introduced.
- Angular XSRF is configured for `XSRF-TOKEN` and `X-XSRF-TOKEN`.

# Proposed Changes

- Add `LOGOUT_PATH` to API configuration and classify logout as a non-refresh auth request so it receives credentials/XSRF but does not receive access-token retry behavior.
- Add `AuthService.logout()` returning an observable for `POST /api/auth/logout` with `withCredentials: true`.
- Add logout/refresh coordination in `AuthService`:
  - invalidate the current refresh generation when logout begins;
  - prevent an already in-flight refresh from applying its session after logout begins;
  - prevent new refresh work while logout is active;
  - release the logout lock on failure so the still-authenticated user can retry;
  - clear token and user only after logout succeeds.
- Ensure refresh cleanup does not overwrite a newer logout/refresh state.
- Add shell logout state so repeated clicks produce one request.
- Close the account menu when logout starts.
- On successful logout, navigate to `/login`.
- On logout failure, remain authenticated, restore the enabled state, and expose backend-owned message when available with a frontend fallback.
- Do not clear local auth or navigate on failed logout because the backend refresh cookie may remain valid.
- Rely on the existing guard and backend-cleared cookies to block protected routes and prevent reload restoration after success.
- Keep the existing shell composition and account-menu styling unchanged.

# Backend API Route

- `POST /api/auth/logout`
- Request body: none.
- Credentials: required so the HttpOnly `refresh_token` cookie is sent.
- CSRF: required by `SecurityConfig`; Angular must send `X-XSRF-TOKEN` from `XSRF-TOKEN`.
- Authorization: permit-all at Spring Security level; logout uses the refresh cookie.
- Success: HTTP `200`, `ApiResponse<Void>` with `data: null`.
- Side effects: revokes the matching refresh-token record and clears:
  - `refresh_token` at path `/api/auth`;
  - `XSRF-TOKEN` at path `/`.
- Missing or already-revoked refresh token is tolerated by `LoginService.logout`.
- Relevant errors include `AUTH_INVALID_REFRESH_TOKEN` for refresh failures and `REQUEST_FAILED` for generic security transport errors.

# Prototype Route

Inspect only `design/ibom-core-prototype.html` regions routed by `docs/design-reference/application-shell.md`:

- Styles: `/* Application shell */`, especially `.account-btn`, `.account-menu`, `.sidebar-foot`, and responsive account-menu rules.
- Markup: `[data-od-id="authenticated-app-shell"]`, `[data-od-id="primary-navigation"]`, `#account-btn`, and `#account-menu`.
- Behavior: account-menu handlers, `completeSignOut()`, and the `#sign-out` handler.
- Responsive region: account-menu behavior under `@media (max-width: 1050px)` and `@media (max-width: 800px)`.
- Preserve the existing menu placement, keyboard behavior, focus treatment, and compact shell visual language.
- Do not add confirmation dialogs or unsaved-change handling.

# File Delta

Modify:
- `src/app/core/auth/auth.service.ts`
- `src/app/core/http/api.config.ts`
- `src/app/core/http/auth.interceptor.ts`
- `src/app/core/http/http-context.tokens.ts`
- `src/app/features/shell/application-shell.component.ts`
- `src/app/features/shell/application-shell.component.html`
- `src/app/core/auth/auth.service.spec.ts`
- `src/app/core/http/auth.interceptor.spec.ts`
- `src/app/core/auth/auth.guard.spec.ts`
- `src/app/features/shell/application-shell.component.spec.ts`

Add:
- None

Remove:
- None

# Focused Tests

- `AuthService` sends exactly one credentialed `POST /api/auth/logout`.
- Successful logout clears access token and user, and no stale refresh result repopulates either signal.
- Logout waits for an in-flight refresh without allowing that refresh to restore authentication after logout starts.
- A refresh started after logout begins is not issued or cannot apply a session.
- Logout failure preserves the current token and user, exposes failure state, and permits a retry.
- Interceptor does not attach the access token or start a refresh retry for logout.
- Concurrent unauthorized requests still share one refresh request.
- Guard redirects to `/login` after successful local logout and does not permit `/dashboard`.
- Shell Sign out invokes logout once despite repeated clicks, disables or otherwise blocks duplicate interaction, closes the menu, and navigates to `/login` only on success.
- Shell logout failure keeps the authenticated shell available and re-enables Sign out.
- Focused verification: run the repository’s narrow Angular Jasmine/Karma tests for the affected spec files only.

# Out of Scope

- Account Settings changes.
- Registration and password-recovery flows.
- Profile, CV, member, dashboard, or other business modules.
- Backend changes or backend tests.
- Browser token storage.
- Unsaved-change confirmation or dirty-work protection.
- New standalone screens.
- Broader auth/session architecture redesign.