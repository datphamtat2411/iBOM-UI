# Task 05 — File Name Format Master Management

Read `AGENTS.md`.

Plan the File Name Format Master Management experience inside the Master Data workspace established by Task 01.

Inspect first:

Frontend:

* the Master Data workspace, routing, and management-access foundation;
* current CV export/File Name Format lookup integration;
* current reusable table, dialog/form, confirmation, notification, chip/token, and loading/error patterns;
* `docs/INTEGRATION.md`;
* `docs/TESTING.md`;
* `docs/DESIGN.md`.

Backend:

* current File Name Format controller/service;
* pattern parser/validation and serialization rules;
* request/response models, default-state behavior, references, and stable error codes.

Do not inspect existing `*.spec.ts` during PLAN unless current source leaves task-critical behavior unclear.

Plan a complete `/master-data/file-name-formats` management flow for `MANAGER` and `ADMIN`.

List behavior:

* paginated table, default size `10`;
* columns: Format Name, Format Pattern, Created Date, Updated Date, Actions;
* default ordering by Format Name A–Z, case-insensitive;
* do not add search when the current backend contract does not support it;
* visually distinguish the system default without adding default-management actions.

Use the existing backend contracts:

* `GET /api/master/file-name-formats?page=&size=`
* `POST /api/master/file-name-formats`
* `PUT /api/master/file-name-formats/{formatId}`
* `DELETE /api/master/file-name-formats/{formatId}`

Create/Edit must use a controlled builder, never unrestricted Pattern text input.

Allowed placeholders:

* `LastName`
* `FirstName`
* `Role`
* `Date`

`Role` means Profile About Me Job Title, not application role. `Date` represents export date using `yyyyMMdd`.

Builder behavior:

* add, remove, and reorder selected placeholders;
* prevent duplicate placeholders;
* require at least one placeholder;
* expose only backend-supported separators;
* show a read-only serialized Pattern preview;
* Edit must reconstruct the existing pattern into builder state.

Mutation payload is `{ name, pattern }`. Trim Format Name before submission. Duplicate/validation failures keep the editor open and preserve input.

Handle stable backend errors by status/error code, including:
`FILE_NAME_FORMAT_NOT_FOUND`, `FILE_NAME_FORMAT_INVALID`, `FILE_NAME_FORMAT_NAME_ALREADY_EXISTS`, `FILE_NAME_FORMAT_REFERENCED_BY_PROFILE`, `FILE_NAME_FORMAT_DEFAULT_CANNOT_DELETE`, and `VALIDATION_ERROR`.

Delete requires confirmation. Referenced formats cannot be deleted. The system default cannot be deleted. Do not add Set Default, default toggle, or unset-default behavior; current default state is system-managed.

Design:

* compact table-first enterprise UI;
* use a focused medium/large editor dialog with restrained token/chip treatment and clear preview;
* follow current iBOM visual language;
* include loading, empty, failure, invalid-builder, and mutation-pending states;
* do not create a generic template-builder framework.

Preserve existing CV export and Profile preferred-format behavior.

Out of scope:

* default switching;
* export filename resolution;
* Profile preferred-format editing;
* PDF/DOCX export changes;
* other Master Data resources;
* backend changes;
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

