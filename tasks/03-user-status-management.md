Read `AGENTS.md`.

Plan User Account Status & Session Lifecycle for the current frontend.

Inspect first:

Frontend:

- current User Management workspace, list state, query state, and feature service/models produced by Task 01;
- current authenticated-user state;
- current `AuthService`;
- current auth interceptor and refresh flow;
- current auth guard and Login navigation;
- current reusable dialog and notification patterns.

Read:

- `docs/ARCHITECTURE.md`;
- `docs/INTEGRATION.md`;
- `docs/TESTING.md`;
- `docs/DESIGN.md`;
- `docs/design-reference/application-shell.md`.

Do not inspect existing `*.spec.ts` files during PLAN.
Do not inspect unrelated Profile, CV, Master Data, Dashboard, Registration, or account-creation flows.

Backend:
Use gh CLI to inspect `datphamtat2411/iBOM-API` on branch `develop`.

Inspect first:

- `UserController` behavior for `PUT /api/users/{userId}/status`;
- `UserService` account-status transition and self-deactivation behavior;
- `UserStatusUpdateRequest`;
- authentication-version and refresh-session invalidation behavior caused by deactivation;
- relevant refresh behavior and `ErrorCode` handling;
- `ApiResponse`.

Do not inspect backend tests or unrelated authentication flows.

Plan these capabilities:

- add an Actions column to the existing User directory;
- expose explicit Deactivate for ACTIVE users and Activate for INACTIVE users;
- require confirmation before either status change;
- prevent normal UI self-deactivation and clearly explain why;
- submit explicit ACTIVE/INACTIVE state through `PUT /api/users/{userId}/status`;
- prevent duplicate mutation for the target account;
- keep displayed status unchanged until backend success;
- on success, show feedback and refresh the current directory without resetting applied search, roles, or page;
- preserve retryable state on failure and handle backend self-deactivation rejection defensively;
- complete application-wide handling for an authenticated session that becomes unusable after deactivation;
- after refresh failure ends authentication, clear local auth state and navigate to Login once;
- preserve normal successful refresh behavior;
- focused tests required for status actions, confirmations, mutation behavior, self-protection, and session-ending navigation.

Task-specific constraints:

- do not use a toggle switch for account status;
- backend remains authoritative for status transition, self-deactivation protection, auth-version invalidation, and refresh-token revocation;
- do not optimistically change status or client-reorder rows;
- reactivation must not revive old authentication state;
- do not infer that every ended session means the account was deactivated; use generic session-ended feedback;
- do not add feature-specific 401 redirects or redesign the existing auth/session architecture.

Prototype routing:

- use `docs/design-reference/application-shell.md`;
- inspect only the existing User Management/table context, status language, and relevant dialog interaction patterns;
- preserve the User Management workspace and restrained management UI language;
- do not scan the full prototype;
- no standalone status-management screen is required.

Out of scope:

- Managed User Creation;
- editing existing users or roles;
- Delete User, password reset, or session-management UI;
- Audit Log;
- unsaved-work protection;
- backend changes.

Return `plan.md` with exactly:

- Task Plan
- Repository Findings
- Proposed Changes
- Backend API Route
- Prototype Route
- File Delta
- Focused Tests
- Out of Scope

Organize Proposed Changes by capability or concern, not by file.
Keep File Delta to Modify / Add / Remove inventory only.
Do not describe how each file should be edited.
Keep `plan.md` under 150 lines.

Do not modify repository files.
