# Task 03 — Language Master Management

Read `AGENTS.md`.

Plan the Language Master Management experience inside the Master Data workspace established by Task 01.

Inspect first:

Frontend:

* the Master Data workspace, routing, and management-access foundation;
* current Profile Language flow and existing Language Master lookup integration;
* current reusable table, pagination, dialog/form, confirmation, notification, and loading/error patterns;
* `docs/INTEGRATION.md`;
* `docs/TESTING.md`;
* `docs/DESIGN.md`.

Backend:

* current Language Master controller/service contract;
* focused request/response models and stable error codes.

Do not inspect existing `*.spec.ts` during PLAN unless current source leaves task-critical behavior unclear.

Plan a complete `/master-data/languages` management flow for `MANAGER` and `ADMIN`.

List behavior:

* paginated Languages table, default size `10`;
* columns: Language Name, Created Date, Updated Date, Actions;
* default backend ordering by Language Name A–Z, case-insensitive;
* search Language Name using trimmed, case-insensitive contains semantics;
* empty search restores the normal list.

Use the existing backend contracts:

* `GET /api/master/languages?page=&size=&search=`
* `POST /api/master/languages`
* `PUT /api/master/languages/{languageId}`
* `DELETE /api/master/languages/{languageId}`

Create/Edit:

* use a compact dialog consistent with current iBOM patterns;
* required Language Name only;
* mutation payload is `{ name }`;
* trim Language Name before submission;
* blank input shows `Please enter Language Name.`;
* duplicate or server validation failure keeps the editor open and preserves input.

Handle stable backend errors by status/error code, not message text, including:
`LANGUAGE_ALREADY_EXISTS`, `LANGUAGE_IN_USE`, `LANGUAGE_NOT_FOUND`, and `VALIDATION_ERROR`.

Delete requires explicit confirmation. A Language referenced by Profile data must remain unchanged and show explanatory failure feedback.

On successful create/update/delete:

* provide appropriate success feedback;
* refresh the current Languages list without reloading the whole application.

Design:

* use a compact table-first enterprise management layout;
* follow current iBOM typography, spacing, borders, colors, controls, and feedback patterns;
* keep loading, empty, no-result, failure, and mutation-pending states clear and restrained;
* use existing reusable primitives where appropriate, but do not depend on Task 02 implementation or create speculative generic CRUD abstractions.

Preserve the existing Profile Language Master lookup behavior.

Out of scope:

* other Master Data resources;
* Profile Language CRUD changes;
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

