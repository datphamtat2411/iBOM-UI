# Task 05 — Profile Workspace & Context Continuity

## Objective

Redesign the outer Profile Workspace so users retain clear Profile, section, and editing context throughout long-scroll work.

The Workspace should behave as a stable editing environment rather than a long page of disconnected sections.

This task owns Workspace composition and navigation. Detailed redesign of individual section editors belongs to Task 06.

## Scope

Redesign:

- Profile Workspace page hierarchy;
- local workspace context and page-level actions;
- section navigation;
- section completeness presentation;
- active-section tracking;
- scroll-to-section behavior;
- desktop sticky and responsive section-navigation behavior;
- personal and managed Workspace presentation;
- workspace loading, empty, missing, and error states;
- Preview and Delete action presentation;
- unsaved-navigation and delete confirmation presentation.

Use Task 01 tokens, primitives, overlays, interaction states, and motion grammar.

Coordinate with the Profile and managed-Member context established by Task 02 rather than duplicating it.

## Design Intent

Treat the page as a **working Profile document environment**.

Section navigation is a first-class Workspace control.

Users should always be able to understand:

- which Profile/context they are working in;
- which section they are currently viewing;
- which sections are complete or need attention;
- how to move quickly to another section.

The active section must reflect the section actually visible during manual scrolling, not only the last navigation item clicked.

Scroll-to-section behavior must account for persistent shell/workspace chrome and reduced-motion preferences.

Completeness exists here as an editing-orientation aid, not as a dashboard. Keep it compact and integrated with navigation.

Managed-Member context must remain unmistakable, but avoid repeating information already persistently established by the Application Shell.

Persistent UI should remain compact. Do not stack multiple sticky bars or consume excessive vertical viewport space.

## Functional Invariants

Preserve:

- personal and managed Profile route behavior;
- selected Profile and Profile-isolation semantics;
- section ordering and completeness calculations;
- Profile switching and fallback/recovery behavior;
- managed Profile selection and missing-Profile handling;
- Preview navigation;
- Profile deletion rules and loading/error behavior;
- unsaved-change navigation protection;
- section mutation ownership/locking;
- Project navigation behavior.

HomePage remains untouched.

## Boundaries

Do not redesign the internal About Me, Education, Languages, Certificates, Projects, or Skills editors. Task 06 owns their detailed presentation and editing interactions.

Do not redesign Project Create/Edit or CV Preview.

Do not modify Application Shell ownership established by Task 02.

Do not convert the Workspace into a wizard or force sequential section completion.

Do not introduce new completeness rules, navigation semantics, or Profile lifecycle behavior.

## Discovery

Start from:

- `ProfileWorkspaceComponent` and its focused tests;
- current section-navigation and completeness flow;
- `ProfileContextService` and managed-context behavior;
- `ProfileEditSessionService` and unsaved-navigation flow;
- existing delete confirmation and Profile recovery behavior;
- Task 01 shared overlay/dialog, feedback, navigation, and motion foundations;
- Task 02 Profile and managed-context shell contract.

Inspect section components only far enough to understand the Workspace boundary and interaction contracts.

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

- workspace and shell context responsibility;
- section-navigation composition and responsive modes;
- active-section synchronization during manual scroll;
- scroll offset and reduced-motion behavior;
- completeness presentation;
- managed versus personal Workspace treatment;
- Preview/Delete action hierarchy;
- shared dialog/overlay adoption for confirmations;
- loading, empty, missing, and error states;
- preservation of dirty-navigation, mutation-locking, deletion, and Profile-recovery semantics;
- focused verification.

Resolve visual, sticky, scrolling, responsive, and interaction decisions far enough that BUILD implements an approved Workspace frame rather than redesigning during implementation.
