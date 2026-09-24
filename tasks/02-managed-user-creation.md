Read `AGENTS.md`.

Plan Managed User Creation for the current frontend.

Inspect first:

Frontend:

- current User Management workspace, list state, query state, and feature service/models produced by Task 01;
- current Registration form and validation flow as the account-form precedent;
- existing strong-password and password-confirmation validation;
- current reusable dialog, form-feedback, and notification patterns.

Read:

- `docs/ARCHITECTURE.md`;
- `docs/INTEGRATION.md`;
- `docs/TESTING.md`;
- `docs/DESIGN.md`.

Do not inspect existing `*.spec.ts` files during PLAN.
Do not inspect unrelated Profile, CV, Member, Master Data, Dashboard, or account-status flows.

Backend:
Use gh CLI to inspect `datphamtat2411/iBOM-API` on branch `develop`.

Inspect first:

- `UserController` behavior for `POST /api/users`;
- managed-user creation behavior in `UserService`;
- `ManagedUserCreateRequest` and `UserSummaryResponse`;
- shared user-account creation, normalization, uniqueness, and password-validation behavior;
- `ApiResponse` and relevant managed-creation `ErrorCode` behavior.

Do not inspect backend tests or unrelated authentication flows.

Plan these capabilities:

- add a Create User action to the existing User Management workspace;
- create users through an in-context dialog, not a standalone route;
- collect Email, Username, Password, Confirm Password, and Role;
- support only MEMBER, MANAGER, and ADMIN, defaulting Role to MEMBER;
- keep Confirm Password frontend-only and require it to match Password;
- reuse existing password-validation behavior rather than duplicating it;
- prevent duplicate submission;
- submit through `POST /api/users`;
- map known backend validation/conflict errors through existing frontend conventions;
- on failure, preserve the dialog and retryable form state;
- on success, close the dialog, show success feedback, and refresh the current User directory without resetting applied search, roles, or page;
- focused tests required for request payload, validation, submission, errors, and success-state preservation.

Task-specific constraints:

- do not hard-code backend-configured allowed email domains;
- managed-created users require no email-verification flow;
- creation must not create or imply creation of a Profile;
- do not optimistically insert a user before backend success;
- do not add a second confirmation step for MANAGER or ADMIN selection;
- backend remains authoritative for normalization, uniqueness, password validity, and account creation.

Prototype routing:

- inspect only the prototype `user-management` support context when needed;
- there is no dedicated Managed User Creation prototype screen;
- preserve the User Management workspace from Task 01 and reuse current frontend form/dialog language;
- do not scan the full prototype or invent a new visual system.

Out of scope:

- account activation/deactivation and session lifecycle;
- editing existing users or roles;
- password reset;
- Delete User or Role Management;
- Profile creation;
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
