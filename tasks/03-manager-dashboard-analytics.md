Read `AGENTS.md`.

Plan **Manager Dashboard Analytics** for the current frontend.

Inspect first:

Frontend:
- current `/dashboard/manager` route/page and Task 01 Dashboard foundation;
- current Dashboard API service/models;
- current management navigation/access behavior;
- existing loading, error, retry, responsive, and timestamp-formatting conventions;
- current dependency/package setup for chart integration;
- `docs/ARCHITECTURE.md`;
- `docs/INTEGRATION.md`;
- `docs/DESIGN.md`;
- `docs/TESTING.md`;
- `docs/design-reference/application-shell.md`.

Do not inspect Member Dashboard implementation details or unrelated management features unless required by a directly discovered dependency.

Backend:
Use gh CLI to inspect `datphamtat2411/iBOM-API` on branch `develop`.

Inspect first:
- `GET /api/dashboard/manager-stats`;
- `ManagerDashboardStatsResponse`;
- `DashboardService` aggregation behavior;
- relevant Manager/Admin authorization.

Plan these capabilities:
- replace the Task 01 Manager Dashboard placeholder with the production analytics page;
- load and render `completedProfiles / totalProfiles` with a safe progress percentage, including `0 / 0`;
- render Primary Skill distribution as a horizontal bar chart using backend ordering and `otherProfileCount`;
- render Skill Category distribution as a donut chart plus textual count/percentage breakdown;
- render backend-provided `Uncategorized` normally;
- derive `Others` category percentage from total category contributions, not `totalProfiles`;
- display no-skill states when distributions are empty;
- add manual Refresh with duplicate-request protection;
- preserve existing data during refresh when appropriate, surface refresh failure, and update a client-side `Data loaded` timestamp only after successful loads;
- handle initial loading, full API failure with retry, responsive layout, and chart lifecycle safely;
- integrate Chart.js directly if required by the current dependency setup;
- keep chart information accessible through textual labels/counts, not canvas alone.

Task-specific constraints:
- backend remains authority for eligibility, completed-Profile calculation, Primary Skill selection, Top 7/Others aggregation, and category percentages;
- do not recompute Manager analytics from raw Profile/Skill data;
- do not redesign Task 01 routing, guard, or navigation foundation;
- no backend changes.

Design reference:
- use the approved Manager Dashboard screenshot as composition/hierarchy reference only;
- preserve its Completed Profiles → Main Skills + Skill Distribution → supporting data-info structure;
- do not clone its colors, card styling, typography, spacing, or visual system literally;
- reinterpret the page using the existing iBOM authenticated visual language.

Out of scope:
- Member Dashboard changes;
- Profile selection/workspace changes;
- backend aggregation changes;
- new Dashboard APIs.

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
