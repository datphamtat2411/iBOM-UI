# Task 01 — Master Data Workspace & Management Access Foundation

Read `AGENTS.md`.

Plan the Master Data Workspace & Management Access Foundation for the current frontend.

Inspect first:

Frontend:

* current authenticated application shell and sidebar navigation;
* current authenticated routing and route guards;
* current auth user/role state;
* current Profile flows that read Master Data;
* `docs/ARCHITECTURE.md`;
* `docs/INTEGRATION.md`;
* `docs/TESTING.md`;
* `docs/DESIGN.md`;
* `docs/design-reference/application-shell.md`.

Do not inspect existing `*.spec.ts` during PLAN unless current source leaves a task-critical behavior unclear.

Plan these capabilities:

* add a `Management` sidebar group visible only to `MANAGER` and `ADMIN`;
* numbering is independent per sidebar group: existing `Workspace` numbering is unchanged and `Management` starts with `01 Master Data`;
* make `Master Data` a collapsible parent with `Skills`, `Seniority`, `Languages`, and `File Name Formats`;
* establish `/master-data` with child routes `/skills`, `/seniority`, `/languages`, and `/file-name-formats`; `/master-data` defaults to Skills;
* protect the management workspace from `MEMBER` navigation/access;
* establish the shared Master Data feature/workspace host required by later resource tasks.

Interaction constraints:

* clicking the Master Data parent toggles expand/collapse only;
* collapsing while on a child route must not navigate away;
* direct-load/refresh of a Master Data child auto-expands the parent;
* parent and current child remain recognizably active;
* preserve keyboard operation, visible focus, and `aria-expanded`;
* use restrained motion only.

Design constraints:

* extend the current iBOM shell visual language: compact enterprise layout, existing typography, spacing, colors, borders, radii, and navigation treatment;
* child items are clearly indented without creating a new visual system;
* do not copy external reference visuals literally or introduce card-heavy navigation.

Prototype routing:

* use `docs/design-reference/application-shell.md`;
* inspect only current sidebar/navigation evidence;
* do not treat the prototype's old Master Data position/numbering as authoritative;
* do not scan the full prototype.

Out of scope:

* CRUD/business UI for any Master Data resource;
* Skill Category management;
* generic CRUD/table/form abstractions;
* backend changes;
* Member/User Management implementation;
* changes that break existing Profile Master Data lookups.

Return `plan.md` with exactly:

* Task Plan
* Repository Findings
* Proposed Changes
* Prototype Route
* File Delta
* Focused Tests
* Out of Scope

Organize Proposed Changes by capability or concern. Keep File Delta to Modify / Add / Remove only. Keep `plan.md` under 150 lines.

Do not modify repository files.

