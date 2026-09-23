Read `AGENTS.md`.

Plan Member Search Builder & Matching Profile Results.

Inspect first:

Frontend:

* Member Management workspace, list/result state, filters, pagination, and service/model foundation from Task 01;
* current Skill, Seniority, and Language Master Data read flows;
* existing form, loading, pagination, and error-handling patterns.

Read:

* `docs/ARCHITECTURE.md`;
* `docs/INTEGRATION.md`;
* `docs/TESTING.md`;
* `docs/DESIGN.md`;
* `docs/design-reference/member-management.md`.

Do not inspect existing `*.spec.ts` files during PLAN.

Backend:

Use gh CLI to inspect `datphamtat2411/iBOM-API` on branch `develop`.

Inspect first:

* `MemberController.searchBySkill` and `MemberService.searchBySkill`;
* `MemberLanguageSearchController` and `MemberLanguageSearchService`;
* `MemberSkillSearchResponse`, `MemberLanguageSearchResponse`, and `MatchingProfileResponse`;
* Skill, Seniority, and Language read contracts.

Plan these capabilities:

* extend Member Management with advanced search while preserving the Task 01 base list;
* provide separate Skill + Seniority and Language + Level search modes;
* allow multiple complete pairs within the active mode using AND semantics;
* populate choices from authoritative Master Data beyond the first paginated page;
* support status filtering and server-side pagination with page size 10;
* keep draft conditions separate from the applied query;
* render one row per Member and show backend `matchingProfiles` as Profile-specific evidence;
* retain applied conditions on no-result and handle validation, loading, empty, error, reset, and pagination;
* focused tests for pairing, serialization, states, pagination, and matching-profile evidence.

Task-specific constraints:

* do not mix Skill/Seniority and Language/Level in one search request; backend contracts are separate;
* never intersect both endpoint result sets client-side;
* all pairs within one request use backend same-Profile AND semantics;
* duplicate Skill or Language conditions must not be submitted;
* backend derives Skill seniority from `ProfileSkill.experienceYears`;
* Member identity remains username/email; `firstName`, `lastName`, and `jobTitle` are matching-Profile evidence only;
* inactive Members remain eligible unless status explicitly filters them out.

Prototype routing:

* use `docs/design-reference/member-management.md`;
* inspect only search-builder, result-evidence, empty/loading, and responsive references;
* do not copy the prototype's mixed Skill + Language behavior.

Out of scope:

* managed Member Profile context/selection;
* Profile CRUD/delete;
* CV Preview/Export;
* backend changes/combined-search endpoint.

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

