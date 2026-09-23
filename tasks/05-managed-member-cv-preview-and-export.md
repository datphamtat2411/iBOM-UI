Read `AGENTS.md`.

Plan Managed Member CV Preview & Export.

Inspect first:

Frontend:

* managed Member context, selected Profile, routing, and workspace continuity from Tasks 03–04;
* current CV Preview component, Preview route, export/download flow, and Profile-target resolution;
* current File Name Format selection/loading and preview-validity handling;
* existing loading, blob/document cleanup, navigation, and error-handling patterns.

Read:

* `docs/ARCHITECTURE.md`;
* `docs/INTEGRATION.md`;
* `docs/TESTING.md`;
* `docs/DESIGN.md`;
* `docs/design-reference/member-management.md`;
* `docs/design-reference/cv-preview.md`;
* `docs/design-reference/profile-workspace.md`.

Do not inspect existing `*.spec.ts` files during PLAN.

Backend:

Use gh CLI to inspect `datphamtat2411/iBOM-API` on branch `develop`.

Inspect first:

* CV preview and download controller/service flows;
* managed Profile authorization used by CV access;
* preview-before-export enforcement and preview-state mutation;
* PDF/DOCX download contracts;
* File Name Format selection/resolution and filename generation behavior.

Plan these capabilities:

* reuse/adapt the existing CV Preview/Export flow for the selected managed Member Profile rather than creating a second implementation;
* preview through `GET /api/cv/preview/{profileId}` using the selected managed Profile;
* export PDF/DOCX through the existing download contract;
* preserve preview-before-export behavior and Profile-specific preview validity;
* reuse existing File Name Format selection while ensuring filename resolution belongs to the managed Profile;
* reset/rebind preview, export, filename-format, loading, and error state when switching Profile or Member;
* preserve managed Member/Profile context across Preview navigation, refresh/deep link, and return to workspace;
* handle preview/export loading, failure, inaccessible Profile, stale preview state, and missing managed context;
* focused tests for managed Profile targeting, Preview validity, Profile/Member switching, navigation recovery, filename-format behavior, and unchanged owner flow.

Task-specific constraints:

* every Preview/Export request must target the selected managed Profile, never own-profile state or search `matchingProfiles`;
* do not duplicate CV Preview/Export components or document-generation logic for managed mode;
* successful Preview validity must not leak between Profiles;
* CV-data mutations must invalidate any stale export-ready frontend state;
* do not generate PDF/DOCX or resolve final filenames client-side;
* preserve existing owner Preview/Export behavior.

Prototype routing:

* use `docs/design-reference/cv-preview.md` for Preview/Export interaction;
* use `docs/design-reference/member-management.md` and `profile-workspace.md` only for managed-context continuity;
* do not infer new export capabilities from prototype-only controls.

Out of scope:

* Profile CRUD/delete;
* File Name Format CRUD;
* CV renderer implementation;
* Member search;
* Profile create/copy;
* backend changes or authorization redesign.

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

Do not describe how each file should be edited.

Do not modify repository files.

