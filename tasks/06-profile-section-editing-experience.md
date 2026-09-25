# Task 06 — Profile Section Editing Experience

## Objective

Redesign all six Profile sections into one coherent editing experience so users can learn a consistent interaction language once and reuse it across the Profile Workspace.

This task owns section-level presentation and editing behavior while preserving the outer Workspace structure established by Task 05.

## Scope

Redesign:

- About Me;
- Education;
- Languages;
- Certificates;
- Projects section presentation;
- Skills;
- section headers, descriptions, actions, and states;
- display/read versus edit presentation;
- inline create/edit forms;
- dirty, saving, saved, conflict, and failure feedback;
- empty, loading, and section-level error states;
- record-list/table presentation;
- delete, discard, and reload confirmations;
- Master Data combobox presentation and interaction;
- Project summary/disclosure interaction;
- responsive section editing behavior.

Use Task 01 shared controls, forms, feedback, dialogs, tokens, accessibility, and motion foundation.

## Design Intent

All sections should share a recognizable anatomy and interaction grammar without forcing different data types into the same visual representation.

Preserve the current workflow families:

- **About Me** — singular read/edit section;
- **Education, Languages, Certificates, Skills** — collection CRUD sections with inline create/edit;
- **Projects** — summary/list section with progressive disclosure and route-based Create/Edit.

Section headers, editor surfaces, form fields, action hierarchy, feedback, and record actions should feel consistent across all sections.

Inline editing remains the preferred model. Do not convert routine section editing into modal workflows.

Forms should use field relationships rather than fixed column counts to determine layout.

Save-state presentation must clearly distinguish saving, unsaved changes, conflict/reload-required, and unchanged states without over-emphasizing routine status.

Routine success feedback should remain calm; errors and version conflicts should receive stronger prominence.

## Functional Invariants

Preserve:

- all existing section fields and validation rules;
- CRUD semantics;
- section ordering;
- `Save & add another` behavior where currently supported;
- dirty-state tracking and unsaved-change protection;
- Workspace mutation ownership/locking;
- optimistic/version-conflict behavior;
- reload-latest semantics and draft protection;
- delete semantics and confirmations;
- Master Data search, paging, duplicate-option disabling, and keyboard behavior;
- Profile-specific data isolation;
- completeness and Preview invalidation behavior;
- Project Create/Edit navigation.

HomePage remains untouched.

## Section-specific Requirements

Skills remain table-oriented.

Education and Certificates remain compact structured record collections rather than card grids.

Languages and Skills must preserve accessible Master Data combobox behavior. PLAN may adopt Task 01/CDK infrastructure only where doing so preserves or improves existing behavior without unnecessary rewrite.

Projects should retain summary-first progressive disclosure. Task 06 owns Project list, expand/collapse, actions, empty state, and deletion presentation; Task 07 owns the Project Create/Edit page itself.

Read-only or derived values must appear intentionally read-only rather than resembling broken or disabled editable fields.

## Boundaries

Do not:

- redesign Profile Workspace navigation, sticky context, or page-level actions owned by Task 05;
- redesign Project Create/Edit pages;
- change APIs, domain models, validation rules, completeness logic, or Preview rules;
- convert Skills into cards;
- force all record types into one generic component;
- introduce inheritance-heavy or domain-generic CRUD abstractions merely to remove duplication.

Prefer shared presentation primitives and patterns while keeping section-specific domain logic explicit.

## Discovery

Start from:

- all six current Profile section components and their focused tests;
- repeated section-header, form, sticky-action, notice, record, confirmation, and combobox patterns;
- existing dirty-state, mutation-locking, conflict/reload, and delete flows;
- Task 01 shared UI/form/dialog foundations;
- the Workspace contract established by Task 05.

Inspect services only as needed to preserve current section behavior.

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

- shared section and editor grammar;
- singular versus collection-section treatment;
- form and validation composition;
- save/dirty/conflict feedback;
- record-list/table action patterns;
- Master Data combobox strategy;
- Project disclosure presentation;
- shared confirmation/dialog adoption;
- responsive behavior and sticky-action coordination with Task 05;
- duplicated local styling/pattern migration;
- accessibility and focused verification.

Resolve visual and interaction decisions far enough that BUILD applies one approved section-editing language rather than redesigning each section independently.
