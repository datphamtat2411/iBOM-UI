Read `AGENTS.md`.

Plan Managed Member Profile Context, Profile List & Selection.

Inspect first:

Frontend:

* Member Management navigation, Member result actions, and route foundation from Tasks 01–02;
* current `ProfileContextService`, Profile workspace routing, Profile summary/detail loading, Profile switching, and application-shell Profile context;
* current dirty-state navigation/deactivation behavior and session-reset patterns.

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

* `MemberProfileController` and Member Profile-list service flow;
* `ProfileSummaryResponse`;
* generic Profile detail access through `ProfileController`, `ProfileService`, and `ProfileAccessService`;
* authorization/not-found behavior for Manager/Admin accessing MEMBER Profiles.

Plan these capabilities:

* open the same managed Member flow from normal Member results and advanced search results;
* establish a managed Member context distinct from the signed-in user's own Profile context;
* load the authoritative active Profile list through `GET /api/members/{memberId}/profiles`;
* select and switch Profiles while preserving the managed Member context;
* load selected Profile detail through the existing generic Profile detail contract;
* support route/deep-link recovery for managed Member and selected Profile;
* represent loading, zero-profile, inaccessible Member, missing Profile, failure, and Profile-switching states;
* adapt shell/context presentation so managed Profile switching does not expose own-profile Create/Copy semantics;
* focused tests for context isolation, Member switching, Profile switching, route recovery, zero Profiles, and failure recovery.

Task-specific constraints:

* do not store managed Member Profiles inside own-profile summary state or refresh them through `/profiles/me`;
* `matchingProfiles` from advanced search is evidence only and must not replace the authoritative Member Profile list;
* managed Member context remains active while switching that Member's Profiles and is replaced when another Member is opened;
* zero Profiles is a valid state and must prevent Profile-dependent actions;
* session/logout reset must clear managed context;
* preserve compatibility with existing dirty-state navigation for later editing work.

Prototype routing:

* use `docs/design-reference/member-management.md` for managed Member entry/context;
* use `docs/design-reference/profile-workspace.md` for Profile selection/workspace continuity;
* do not infer Create/Copy Profile capability for managed Members.

Out of scope:

* Profile create/copy;
* Profile update or section CRUD;
* Profile delete;
* CV Preview/Export;
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

Do not describe how each file should be edited.

Do not modify repository files.

