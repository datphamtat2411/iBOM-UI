Read `AGENTS.md`.

Plan **Member Dashboard** for the current frontend.

Inspect first:

Frontend:
- current personal Dashboard page from Task 01;
- current Dashboard API service/models;
- current `ProfileContextService` own-Profile summaries, selection, and selected detail;
- current `ApplicationShell` Dashboard Profile-switching behavior;
- existing Profile Workspace and CV Preview navigation patterns;
- current timestamp-formatting and loading/error-state conventions;
- `docs/ARCHITECTURE.md`;
- `docs/INTEGRATION.md`;
- `docs/DESIGN.md`;
- `docs/TESTING.md`;
- `docs/design-reference/dashboard.md`;
- `docs/design-reference/application-shell.md`.

Do not inspect unrelated management features or existing `*.spec.ts` files during PLAN unless required by a directly discovered dependency.

Backend:
Use gh CLI to inspect `datphamtat2411/iBOM-API` on branch `develop`.

Inspect first:
- `GET /api/dashboard/my-stats?profileId={profileId}`;
- `MemberDashboardStatsResponse`;
- `ProfileCompletenessResponse` and section response shape;
- Profile detail behavior for `hasPreviewed`;
- relevant Profile summary/detail contracts.

Plan these capabilities:
- replace the authenticated Dashboard placeholder with the production Member Dashboard;
- load Dashboard stats for the shared selected own Profile;
- prevent stale responses from a previous Profile selection from overwriting the current selection;
- display selected Profile context, whole-number completeness, completeness-by-section, Preview state, and latest export;
- render `Never exported` when `latestExportedAt` is absent and format timestamps using `Asia/Ho_Chi_Minh`;
- use existing Profile detail/context for Preview state; do not extend or fake the Dashboard response;
- provide Open Workspace and Preview CV actions for the selected Profile;
- provide a My Profiles summary list using existing Profile summary data without N+1 Dashboard/detail requests;
- Profile switching must stay on `/dashboard`;
- handle initial loading, Profile switching, Dashboard API failure with retry, zero completeness, and no-Profile empty state with Create Profile action;
- preserve responsive behavior and current iBOM visual language.

Task-specific constraints:
- backend remains authority for completeness and latest-export aggregation;
- do not calculate Profile completeness from raw Profile sections in frontend;
- do not redesign Task 01 routing/access/Profile-context foundation;
- no backend changes;
- no Manager Dashboard or Chart.js work.

Prototype routing:
- use the Member Dashboard composition and interactions as design intent;
- preserve current system styling rather than cloning prototype styling literally.

Out of scope:
- Manager Dashboard analytics;
- Profile CRUD redesign;
- Preview/export implementation changes;
- new per-Profile aggregate APIs.

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
