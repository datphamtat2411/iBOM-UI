# Task 02 — Skills Master Management

Read `AGENTS.md`.

Plan the Skills Master Management experience inside the Master Data workspace established by Task 01.

Inspect first:

Frontend:

* the Master Data workspace, routing, and management-access foundation;
* current Profile Skill flow and existing Skill Master lookup integration;
* current reusable table, pagination, dialog/form, confirmation, notification, and loading/error patterns;
* `docs/INTEGRATION.md`;
* `docs/TESTING.md`;
* `docs/DESIGN.md`.

Backend:

* current Skill Master controller/service contract;
* Skill Category read contract;
* focused request/response models and stable error codes.

Do not inspect existing `*.spec.ts` during PLAN unless current source leaves task-critical behavior unclear.

Plan a complete `/master-data/skills` management flow for `MANAGER` and `ADMIN`.

List behavior:

* paginated Skills table, default size `10`;
* columns: Skill Name, Category, Created Date, Updated Date, Actions;
* default backend ordering by Skill Name A–Z, case-insensitive;
* search Skill Name using trimmed, case-insensitive contains semantics;
* empty search restores the normal list.

Use the existing backend contracts:

* `GET /api/master/skills?page=&size=&search=`
* `POST /api/master/skills`
* `PUT /api/master/skills/{skillId}`
* `DELETE /api/master/skills/{skillId}`
* `GET /api/master/skill-categories`

Create/Edit:

* use a compact dialog consistent with current iBOM patterns;
* fields: required Skill Name and required controlled Category;
* Category must come from the Skill Category lookup, never free text;
* mutation payload is `{ name, categoryId }`;
* trim Skill Name before submission;
* duplicate or server validation failure keeps the editor open and preserves input.

Handle stable backend errors by status/error code, not message text, including:
`SKILL_NAME_ALREADY_EXISTS`, `SKILL_CATEGORY_NOT_FOUND`, `SKILL_REFERENCED_BY_PROFILES`, `SKILL_NOT_FOUND`, and `VALIDATION_ERROR`.

Delete requires explicit confirmation. Referenced Skills must remain unchanged and show explanatory failure feedback.

Design:

* table-first compact enterprise management UI;
* follow current iBOM typography, spacing, borders, colors, controls, and feedback patterns;
* establish a useful visual precedent for later Master Data resources without creating speculative generic CRUD abstractions;
* include restrained loading, empty, no-result, failure, and mutation-pending states.

Preserve existing Profile Skill Master lookup behavior.

Out of scope:

* Skill Category CRUD;
* other Master Data resources;
* Profile Skill CRUD changes;
* backend changes;
* generic Master Data CRUD engines;
* Task 01 navigation/access redesign.

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
