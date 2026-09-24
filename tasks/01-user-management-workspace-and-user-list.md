Read `AGENTS.md`.

Plan User Management Workspace & User List/Search for the current frontend.

Inspect first:

Frontend:

- current application routing and `managementGuard`;
- current application-shell Management navigation;
- current Member Management list/search/pagination flow as the primary management UI precedent;
- current API response/error infrastructure and feature-service conventions.

Read:

- `docs/ARCHITECTURE.md`;
- `docs/INTEGRATION.md`;
- `docs/TESTING.md`;
- `docs/DESIGN.md`;
- `docs/design-reference/application-shell.md`;
- `docs/design-reference/member-management.md`.

Do not inspect existing `*.spec.ts` files during PLAN.
Do not inspect unrelated Profile, CV, Master Data, Dashboard, or Auth flows unless required by the areas above.

Backend:
Use gh CLI to inspect `datphamtat2411/iBOM-API` on branch `develop`.

Inspect first:

- `UserController` behavior for `GET /api/users`;
- `UserService.list`;
- `UserSummaryResponse`;
- the current User summary repository query and ordering;
- `PageResponse` and `ApiResponse`;
- authorization protecting User Management.

Do not inspect backend tests or unrelated User/Auth flows.

Plan these capabilities:

- add protected `/users` User Management routing and Management navigation for MANAGER/ADMIN;
- deliver one unified User directory;
- display Username, Email, Role, and Account Status only;
- integrate `GET /api/users`;
- support explicit Username/Email search and multi-role filtering for MEMBER, MANAGER, and ADMIN;
- no selected roles means all roles;
- applying query changes resets to page `0`;
- use backend pagination with fixed size `10`, total records, and page navigation;
- preserve backend ordering;
- provide loading, retryable error, initial-empty, filtered-empty, and responsive states;
- focused tests required for routing, query behavior, pagination, and rendered states.

Task-specific constraints:

- do not derive Full Name or Job Title from Profiles;
- do not add status filtering, client-side sorting, live/debounced search, or page-size selection;
- do not add Create User or Activate/Deactivate placeholder actions;
- do not introduce a new state-management library;
- backend remains authoritative for authorization, filtering, ordering, and pagination.

Prototype routing:

- use `docs/design-reference/application-shell.md` and `docs/design-reference/member-management.md`;
- inspect only Management navigation and the prototype `user-management` support note;
- preserve the current authenticated-shell and compact Member Management table language;
- do not scan the full prototype;
- a new User Management page is required, but not a new visual system.

Out of scope:

- Managed User Creation;
- account status mutation and session lifecycle;
- existing-user role editing;
- Delete User or Role Management;
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
