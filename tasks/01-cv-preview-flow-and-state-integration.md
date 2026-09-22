Read `AGENTS.md`.

Plan CV Preview Flow & Preview State Integration for the current Profile frontend.

Inspect first:

Frontend:

* current Profile routing and Profile Workspace navigation/context;
* current `ProfileContextService`, Profile API integration, and Profile models;
* current Profile mutation/version flow that invalidates `hasPreviewed`;
* `docs/ARCHITECTURE.md`;
* `docs/INTEGRATION.md`;
* `docs/TESTING.md`;
* `docs/DESIGN.md`;
* `docs/design-reference/cv-preview.md`.

Do not inspect existing `*.spec.ts` files during PLAN.
Do not inspect unrelated Dashboard, Member Management, Master Data, or authentication flows.

Backend:
Use gh CLI to inspect `datphamtat2411/iBOM-API` on branch `develop`.

Inspect first:

* `CvPreviewController` and `GET /api/cv/preview/{profileId}`;
* `CvPreviewService`;
* Profile preview/version state handling around `markPreviewed`;
* Profile detail contract for `hasPreviewed` and `version`;
* relevant `PROFILE_NOT_FOUND` and `PROFILE_VERSION_CONFLICT` behavior.

Do not inspect export/download or File Name Format implementation.

Plan these capabilities:

* add a dedicated authenticated CV Preview page within the existing application shell;
* request the current Profile Preview as backend-generated PDF and render it inline;
* represent Preview required, generating, valid, failure, and retry states;
* reconcile authoritative Profile state after successful Preview;
* immediately stop treating the displayed Preview as current when Profile data invalidates `hasPreviewed`;
* prevent stale Preview responses, errors, or documents from leaking across Profile switches;
* clean up replaced Preview resources;
* focused tests for Preview lifecycle and Profile-context safety.

Task-specific constraints:

* backend-generated PDF is the authoritative Preview; do not reconstruct CV content in Angular;
* Preview uses latest saved Profile data only;
* successful Preview must not be assumed valid for another Profile or later Profile version;
* prevent duplicate Preview generation while one is active;
* keep the flow Profile-ID based and reusable for future managed-Member access without implementing Member Management UI.

Prototype routing:

* use `docs/design-reference/cv-preview.md`;
* inspect only the routed Preview page, document stage, Preview status, generation interaction, and relevant responsive rules;
* preserve the approved document-first Preview composition;
* do not scan the full prototype.

Out of scope:

* PDF/DOCX export;
* File Name Format loading or selection;
* preferred File Name Format;
* export timestamp UX;
* Member Management navigation;
* backend changes.

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

