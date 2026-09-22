Read `AGENTS.md`.

Plan Copy Profile Flow & Multi-Profile Integration for the current frontend.

Inspect first:

Frontend:

* current Profile selector/context in the authenticated shell;
* current `ProfileContextService`;
* current `ProfileService` and Profile models;
* current Profile routes and Workspace;
* existing Create Profile flow as the warning/context-synchronization precedent;
* current unsaved-edit navigation/mutation coordination;

Read:

* `docs/ARCHITECTURE.md`;
* `docs/INTEGRATION.md`;
* `docs/TESTING.md`;
* `docs/DESIGN.md`;
* `docs/design-reference/application-shell.md`;
* `docs/design-reference/profile-workspace.md`.

Do not inspect existing `*.spec.ts` files during PLAN unless source behavior is materially unclear.

Backend:
Use gh CLI to inspect datphamtat2411/iBOM-API on branch develop;

Inspect first:

* `ProfileController` copy endpoint;
* `ProfileCopyService`;
* `ProfileCopyRequest` and returned Profile contract;
* relevant Profile copy error codes.

Do not inspect backend tests or unrelated Profile-section APIs.

Plan these capabilities:

* expose `POST /api/profiles/{sourceProfileId}/copy`;
* let the user copy the currently selected Profile with a new Profile name while clearly identifying the source;
* prevent duplicate submissions and preserve retryable input on failure;
* apply the existing 5+ active-Profile warning before Copy continues;
* after successful Copy, refresh Profile summaries, select the new Profile, and navigate to `/profiles/{newProfileId}`;
* align the selector so zero Profiles shows Create, one Profile shows static current context, and two or more Profiles expose switching;
* preserve existing deep-link, stale-request protection, delete behavior, and unsaved-change coordination.

Task-specific constraints:

* backend owns the deep-copy transaction; never copy Profile sections in frontend code;
* copied Profiles follow backend copy semantics, including fresh preview/export-related state;
* preserve the current Profile context architecture and Workspace structure;
* switching or copying must never leak data from the previous Profile;
* do not redesign Create or Delete flows beyond integration needed by this task.

Prototype routing:

* use `docs/design-reference/application-shell.md` and `profile-workspace.md`;
* inspect only Profile switcher/menu, selected-Profile context, and Create/Copy action placement;
* do not scan the full prototype;
* use a lightweight Copy interaction rather than introducing a new standalone feature screen.

Out of scope:

* backend changes;
* Profile-section CRUD changes;
* CV Preview/Export UI;
* File Name Format management;
* unrelated Workspace or shell redesign.

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

