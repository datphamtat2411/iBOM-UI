Read `AGENTS.md`.

Plan **Dashboard Integration & Access Foundation** for the current frontend.

Inspect first:

Frontend:

- current Dashboard route/page and authenticated shell navigation;
- current `ApplicationShell` Profile-switching behavior;
- current `ProfileContextService` own-Profile selection flow;
- current auth and `managementGuard`;
- current frontend API/service/model conventions;
- `docs/ARCHITECTURE.md`;
- `docs/INTEGRATION.md`;
- `docs/DESIGN.md`;
- `docs/TESTING.md`;
- `docs/design-reference/dashboard.md`;
- `docs/design-reference/application-shell.md`.

Do not inspect unrelated business modules or existing `*.spec.ts` files during PLAN unless required by a directly discovered dependency.

Backend:
Use GitHub to inspect `datphamtat2411/iBOM-API` on branch `develop`.

Inspect first:

- `DashboardController`;
- Dashboard response DTOs and `DashboardService`;
- `SecurityConfig` authorization;
- common `ApiResponse`.

Authoritative contracts:

- `GET /api/dashboard/my-stats?profileId={profileId}`;
- `GET /api/dashboard/manager-stats`.

Plan these capabilities:

- add Dashboard-owned API models/service for both contracts;
- keep `/dashboard` as personal Dashboard for MEMBER, MANAGER, ADMIN;
- add `/dashboard/manager` for MANAGER/ADMIN only;
- show Manager Dashboard navigation only in the existing Management group while preserving personal Dashboard navigation;
- make `/dashboard` reuse existing own-Profile context instead of creating Dashboard-specific selection state;
- on Dashboard entry, preserve a valid current own Profile; otherwise select the first available Profile; use `null` when none exist;
- make Profile switching route-aware: switching on Dashboard stays on Dashboard; Profile Workspace keeps its current navigation behavior;
- add only the minimal Manager Dashboard placeholder needed to establish route/access boundaries;
- add focused tests for API wiring, role access/navigation, and Dashboard Profile selection.

Task-specific constraints:

- reuse existing auth, routing, shell, HTTP, and Profile context architecture;
- frontend role visibility is UX only; backend remains authorization authority;
- do not calculate completeness or Manager analytics in frontend;
- no backend changes;
- no Chart.js or analytics visualization.

Prototype routing:

- inspect only Member Dashboard/Profile-context and application-shell areas needed for shared Profile context;
- Manager Dashboard visual implementation is not part of this task.

Out of scope:

- Member Dashboard production content;
- Manager analytics UI, charts, refresh/data-loaded UX;
- Preview/completeness/latest-export presentation.

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
Do not modify repository files.
