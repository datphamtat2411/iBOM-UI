# Task 07 — Profile Lifecycle & Project Editing

## Objective

Redesign the focused lifecycle flows around Profile creation, Profile copying, and Project Create/Edit so they use the same form, action, feedback, and dialog language established by earlier redesign tasks while preserving their distinct workflow complexity.

This task should improve clarity, confidence, and continuity without changing lifecycle semantics.

## Scope

Redesign:

- Create Profile;
- Copy Profile source-selection, naming, warning, and success states;
- Project Create;
- Project Edit;
- lifecycle form hierarchy and action regions;
- validation, loading, success, failure, dirty, and conflict states;
- Project save-state presentation;
- unsaved-navigation, discard, reload, and lifecycle confirmation presentation;
- responsive behavior for these flows.

Use Task 01 shared foundations and the form/editing language established by Task 06.

## Design Intent

### Profile Create

Keep Create Profile as a focused page-level form.

Do not convert it into a wizard or modal.

Preserve semantic grouping of Profile identity and About Me fields, with related fields grouped naturally and long-form fields given appropriate space.

The flow should clearly lead from input to Profile creation and entry into the new Workspace.

The existing active-Profile-count warning remains an advisory confirmation rather than a hard limit.

### Profile Copy

Keep Copy Profile as an explicit multi-step dialog:

1. choose the source Profile;
2. confirm the new Profile name;
3. show completion state.

Source selection is first-class. The current Workspace Profile should remain prioritized and identifiable, while users may choose another active Profile.

The selected source must remain clear before final submission.

Keep search, empty/loading states, Back behavior, and the successful choices to:

- open the copied Profile;
- copy another Profile.

Do not collapse Copy back into a single-name dialog or automatically navigate after success.

### Project Create/Edit

Keep Project Create/Edit as a dedicated route-based editor.

Create and Edit should share one editing language while preserving their current behavioral differences.

Retain semantic form grouping for Project identity, timeline/status, scope/contribution, and technology.

Long-form fields should prioritize editing comfort over excessive density.

Status and End Date dependency must remain understandable without changing validation semantics.

Normal Save returns to the Profile Workspace. Create mode continues to support `Save & add another`.

## Functional Invariants

Preserve:

- Profile Create fields, validation, API behavior, and post-create selection/navigation;
- the current active-Profile-count advisory threshold and explicit acknowledgement semantics;
- Profile Copy source-selection semantics and source ordering behavior;
- Copy search, refresh, context-safety, validation, and success choices;
- unsaved-change protection before Copy proceeds;
- Project routes and personal/managed route behavior;
- Project Create/Edit fields and validation;
- Project status and End Date rules;
- `Save & add another` behavior;
- normal Project Save return-to-Workspace behavior;
- dirty tracking and unsaved-navigation protection;
- Profile version conflict handling;
- reload-latest and draft-preservation semantics;
- Profile context/version updates after Project mutation.

HomePage remains untouched.

## Boundaries

Do not:

- redesign the Profile Workspace frame owned by Task 05;
- redesign the Projects list/disclosure owned by Task 06;
- introduce Profile rename or additional lifecycle features;
- convert Profile Create into a modal or wizard;
- convert Project editing back into an inline Workspace form;
- change APIs, routes, validation rules, lifecycle semantics, or Profile limits;
- constrain Project technology fields to Skill Master Data;
- create generic domain lifecycle abstractions merely to reduce code duplication.

Consistency should come from shared presentation and interaction patterns, not from forcing all three flows into one component architecture.

## Discovery

Start from:

- Profile Create component and focused tests;
- Profile Copy component and its source-selection/context-protection flow;
- Project Editor component and focused tests;
- `ProfileEditSessionService` and navigation guards;
- Profile context/version update behavior used by these flows;
- Task 01 shared dialog/form/action foundations;
- Task 05 Workspace context/navigation contract;
- Task 06 form, save-state, conflict, and confirmation patterns.

Inspect services only far enough to preserve existing lifecycle behavior.

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

- Profile Create composition and form-system adoption;
- active-Profile-count warning treatment;
- Copy dialog structure and step continuity;
- source-selection hierarchy and responsive behavior;
- Copy overlay/dialog integration;
- Project editor hierarchy and semantic form layout;
- Project save/status/action presentation;
- status-dependent End Date treatment;
- dirty-navigation and conflict/reload confirmation integration;
- personal versus managed Project context;
- responsive behavior across all three flows;
- duplicated local styling migration;
- accessibility and focused verification.

Resolve visual, interaction, dialog, and responsive decisions far enough that BUILD implements approved lifecycle flows rather than redesigning them during implementation.
