# Task 04 — Seniority Master Management

Read `AGENTS.md`.

Plan the Seniority Master Management experience inside the Master Data workspace established by Task 01.

Inspect first:

Frontend:

* the Master Data workspace, routing, and management-access foundation;
* current Profile Skill experience-years handling;
* current reusable table, dialog/form, confirmation, notification, numeric-input, and loading/error patterns;
* `docs/INTEGRATION.md`;
* `docs/TESTING.md`;
* `docs/DESIGN.md`.

Backend:

* current Seniority controller/service and persistence behavior;
* focused request/response models, range validation, usage detection, and stable error codes.

Do not inspect existing `*.spec.ts` during PLAN unless current source leaves task-critical behavior unclear.

Plan a complete `/master-data/seniority` management flow for `MANAGER` and `ADMIN`.

List behavior:

* use the backend non-paginated Seniority list;
* columns: Level Name, Minimum Experience, Maximum Experience, Created Date, Updated Date, Actions;
* order by Minimum Experience ascending;
* render absent maximum as `Unlimited`;
* do not add search or pagination.

Use the existing backend contracts:

* `GET /api/master/seniority`
* `POST /api/master/seniority`
* `PUT /api/master/seniority/{seniorityId}`
* `DELETE /api/master/seniority/{seniorityId}`

Create/Edit:

* use a compact dialog consistent with iBOM;
* fields: required Level Name, required Minimum Experience, optional Maximum Experience, and an explicit Unlimited control;
* payload is `{ name, fromExperience, toExperience }`;
* trim Level Name;
* Unlimited must serialize as `toExperience = null`, never a sentinel value.

Preserve Seniority semantics:

* ranges are half-open `[min,max)`;
* minimum must be non-negative;
* finite maximum must be greater than minimum;
* touching boundaries are valid;
* ranges must not overlap;
* only one unlimited range is valid;
* backend remains authority for cross-record range conflicts.

Handle stable backend errors by status/error code, including:
`SENIORITY_NOT_FOUND`, `SENIORITY_NAME_ALREADY_EXISTS`, `SENIORITY_RANGE_CONFLICT`, `SENIORITY_IN_USE`, and `VALIDATION_ERROR`.

Duplicate/range failures keep the editor open and preserve input. Delete requires confirmation. `SENIORITY_IN_USE` is backend-derived from Profile Skill experience values; do not reproduce usage calculation in the frontend.

Design:

* compact table-first enterprise UI;
* follow current iBOM visual and feedback patterns;
* include restrained loading, empty, failure, and mutation-pending states;
* do not depend on Task 02/03 implementation or create generic CRUD/range frameworks.

Out of scope:

* other Master Data resources;
* Profile Skill behavior changes;
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

