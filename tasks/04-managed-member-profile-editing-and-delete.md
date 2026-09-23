Read `AGENTS.md`.

Plan Managed Member Profile Workspace CRUD & Delete.

Inspect first:

Frontend:

* managed Member context, Profile-list/selection flow, and routing from Task 03;
* current Profile Workspace and six section flows: About Me, Education, Languages, Certificates, Projects, and Skills;
* current Profile update/delete, section mutation, optimistic-concurrency, dirty-state, and Profile-summary refresh patterns.

Read:

* `docs/ARCHITECTURE.md`;
* `docs/INTEGRATION.md`;
* `docs/TESTING.md`;
* `docs/DESIGN.md`;
* `docs/design-reference/member-management.md`;
* `docs/design-reference/profile-workspace.md`.

Do not inspect existing `*.spec.ts` files during PLAN.

Backend:

Use gh CLI to inspect `datphamtat2411/iBOM-API` on branch `develop`.

Inspect first:

* generic Profile update/delete contracts and `ProfileAccessService`;
* Education, Language, Certificate, Project, and Skill CRUD controllers/services;
* Profile version / optimistic-concurrency handling;
* preview invalidation on successful CV-data mutation;
* soft-delete and last-active-Profile protection.

Plan these capabilities:

* reuse/adapt the existing Profile Workspace for the selected managed Member Profile rather than creating a second editor;
* support managed editing across About Me, Education, Languages, Certificates, Projects, and Skills using existing validation/business rules;
* ensure every mutation targets the selected managed Profile, never the signed-in user's own Profile;
* preserve optimistic-concurrency and existing mutation/error handling;
* preserve dirty-state protection across Profile switch, Member switch, and navigation;
* support Profile delete confirmation, backend soft-delete rules, and last-Profile rejection;
* after successful mutations or deletion, refresh the authoritative managed Member Profile context and recover selection correctly;
* isolate editor/form/error state when switching Members or Profiles;
* focused tests for managed target IDs, CRUD reuse, concurrency, dirty navigation, delete recovery, and context isolation.

Task-specific constraints:

* do not duplicate the six Profile section implementations for managed mode;
* managed lifecycle must never refresh through `/profiles/me`;
* Profile-list refresh must use the managed Member context established in Task 03;
* successful CV-data changes must not preserve stale preview-valid state;
* do not silently overwrite stale updates;
* do not expose Create/Copy Profile capability for managed Members;
* preserve existing owner Profile behavior while introducing managed-context support.

Prototype routing:

* use `docs/design-reference/profile-workspace.md` for workspace/section behavior;
* use `docs/design-reference/member-management.md` only for managed-context continuity;
* do not infer new managed Profile capabilities from prototype-only controls.

Out of scope:

* CV Preview/Export;
* File Name Format selection;
* Profile create/copy;
* advanced Member search;
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

