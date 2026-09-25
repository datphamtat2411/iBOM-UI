# Task 09 — Member Management & Advanced Search

## Objective

Redesign Member Management into a results-first management surface where common Member search remains fast and compact while advanced Profile-based criteria are available when needed.

The experience must make applied search intent and matching evidence understandable without changing existing Member or Profile search semantics.

## Scope

Redesign:

- Member Management page composition;
- username/email and account-status filters;
- advanced Profile criteria disclosure;
- Language + Level condition building;
- Skill + Seniority condition building;
- selected and applied-condition presentation;
- Apply and Reset interactions;
- Member results table;
- matching Profile evidence;
- loading, empty, error, and pagination states;
- entry into managed Member Profiles;
- responsive search and results behavior.

Use Task 01 shared controls, states, table patterns, and motion foundations. Align Master Data picker interaction with the language established by Task 06.

## Design Intent

Treat Member Management as a **result-oriented search workspace**, not a large query-builder form.

Keep common Member-level filters immediately accessible:

- username/email;
- account status.

Move Profile-based Language and Skill criteria into progressively disclosed advanced search so results remain close to the primary controls.

Advanced criteria must remain powerful without dominating the page.

Clearly communicate that all Profile conditions are combined and must be satisfied within the same Profile. Multiple Skill or Language conditions must not be combined across separate Profiles belonging to one Member.

Preserve the distinction between draft filters and the currently applied query. Results and pagination represent the applied query until the user explicitly applies new changes.

Applied criteria should remain understandable even when advanced controls are collapsed.

## Result Experience

Keep results table-oriented and information-dense.

Preserve one result row per Member even when multiple Profiles match.

When Profile criteria are applied, retain enough matching-Profile evidence to explain why the Member matched without turning each table row into a Profile-card collection.

Do not invent Member-level Full Name or Job Title values from an arbitrary Profile.

Inactive Members remain valid list/search results and must not be silently excluded.

Preserve total-record information and pagination with the established default page size of 10.

## Functional Invariants

Preserve:

- Manager/Admin authorization;
- Member list and search APIs;
- username/email and status semantics;
- multiple Language and Skill conditions;
- optional Language Level and Skill Seniority modifiers;
- AND and same-Profile matching semantics;
- Member result deduplication;
- matching Profile evidence;
- inactive-Member searchability;
- draft versus applied filters;
- explicit Apply and Reset behavior;
- current Master Data search/paging behavior;
- pagination against the applied query;
- page recovery behavior;
- managed-Member navigation and context handoff.

HomePage remains untouched.

## Boundaries

Do not:

- change backend search semantics or request contracts;
- calculate Seniority matching in the frontend;
- turn Skill Category into an independent Member-search condition;
- invent Member-level data sourced from an arbitrary Profile;
- redesign the managed Profile Workspace;
- replace the results table with a decorative card grid;
- create a generic universal query-builder abstraction.

## Discovery

Start from:

- Member Management page and focused tests;
- current draft/applied filter flow;
- matching Profile evidence and managed-Member navigation;
- `MemberFilterChoicePicker`;
- Member Management models and service contracts;
- relevant Member Search business requirements and acceptance criteria;
- Task 01 shared table/filter/state foundations;
- Task 06 Master Data combobox language.

Use `docs/DESIGN.md` as the stable shared design authority.

## Plan Contract

Create `plan.md` with no implementation changes and keep it concise, ideally within 150 lines.

Use exactly:

1. `Repository Findings`
2. `Relevant Code`
3. `Proposed Changes`
4. `Implementation Context`
5. `File Delta`
   - `Add`
   - `Modify`
   - `Delete`
6. `Verification`

Use `None` for an empty File Delta category.

`File Delta` must list concrete expected paths and each file's responsibility.

The plan must resolve:

- results-first page composition;
- basic versus advanced-filter responsibility;
- advanced disclosure and condition-builder layout;
- same-Profile semantics presentation;
- draft versus applied-query feedback;
- applied-condition summary;
- matching Profile evidence treatment;
- table density and responsive strategy;
- loading, empty, error, retry, and pagination presentation;
- picker/shared-pattern migration;
- accessibility and focused verification.

Resolve visual, interaction, responsive, and filtering-state decisions far enough that BUILD implements an approved Member Management experience rather than redesigning during implementation.
