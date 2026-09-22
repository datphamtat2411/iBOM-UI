Read `AGENTS.md`.

Plan CV Export & File Name Format Integration from the completed CV Preview foundation.

Inspect first:

Frontend:

* current CV Preview page, state, and Profile-context integration;
* current Profile models/context and feature API conventions;
* current binary/download handling patterns if any;
* `docs/ARCHITECTURE.md`;
* `docs/INTEGRATION.md`;
* `docs/TESTING.md`;
* `docs/DESIGN.md`;
* `docs/design-reference/cv-preview.md`.

Do not inspect existing `*.spec.ts` files during PLAN.
Do not inspect unrelated Master Data CRUD, Dashboard, Member Management, or authentication flows.

Backend:
Use gh CLI to inspect `datphamtat2411/iBOM-API` on branch `develop`.

Inspect first:

* `CvExportController` and `GET /api/cv/download/{profileId}`;
* `CvExportService`;
* `FileNameResolutionService`;
* `FileNameFormatController` list behavior and response contract;
* Profile detail contract for `hasPreviewed`, `lastExportedAt`, and `preferredFileNameFormatId`;
* relevant CV export, Profile version, and File Name Format error codes.

Do not inspect backend renderers, File Name Format CRUD implementation beyond list behavior, or unrelated modules.

Plan these capabilities:

* expose PDF and DOCX export from the existing Preview page;
* allow export only while the current Profile has a valid Preview;
* load available File Name Formats and support task-scoped selection;
* support an Automatic option that omits `fileNameFormatId`, allowing backend preferred-format then system-default fallback;
* treat an explicitly selected File Name Format as per-export only;
* download backend-produced binary content using the backend `Content-Disposition` filename;
* manage export loading, duplicate-submit protection, failure, and retry;
* reconcile authoritative Profile state after successful export and when Preview/version state becomes stale;
* prevent export responses or state updates from leaking across Profile switches;
* focused tests for export gating, format selection, binary download, and stale-context safety.

Task-specific constraints:

* do not construct export filenames in Angular;
* do not persist explicit File Name Format selection as Profile preference;
* do not invent an API or browser-storage workaround for preferred File Name Format;
* backend remains authoritative for Preview validity, filename resolution, `lastExportedAt`, and export errors;
* export failure must preserve the current valid Preview unless backend state proves it invalid.

Prototype routing:

* use `docs/design-reference/cv-preview.md`;
* inspect only export controls, File Name Format interaction, document tools, and relevant responsive behavior;
* preserve the completed Preview composition;
* do not scan the full prototype.

Out of scope:

* Preview lifecycle redesign;
* File Name Format CRUD;
* preferred File Name Format persistence;
* backend changes;
* Member Management navigation;
* Dashboard changes.

Return `plan.md` with exactly:

* Task Plan
* Repository Findings
* Proposed Changes
* Backend API Route
* Prototype Route
* File Delta
* Focused Tests
* Out of Scope

Organize Proposed Changes by capability or concern, not by file.
Keep File Delta to Modify / Add / Remove inventory only.
Keep `plan.md` under 150 lines.

Do not modify repository files.

