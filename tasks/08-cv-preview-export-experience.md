# Task 08 — CV Preview & Export Experience

## Objective

Redesign CV Preview and Export into a document-first experience where the current backend-generated CV is the primary visual focus and Preview/Export controls remain clear, compact, and trustworthy.

Improve hierarchy and interaction quality without changing document generation, Preview validity, export semantics, or filename resolution behavior.

## Scope

Redesign:

- CV Preview page composition;
- document stage and surrounding controls;
- Preview required, loading, generating, valid, failure, and unavailable states;
- Generate/Retry Preview presentation;
- File Name Format selection;
- PDF and DOCX export controls;
- export loading, success, and failure feedback;
- last-export metadata presentation;
- personal and managed Preview context;
- responsive document viewing and control placement;
- Preview skeleton and related motion.

Use Task 01 shared controls, feedback, tokens, accessibility, and motion foundations.

## Design Intent

Treat this as a **document workspace**, not a control panel with a document attached.

When Preview is valid, the backend-generated PDF should receive the strongest visual priority.

Reduce duplicated status messaging. Preview state should have one clear canonical presentation rather than being repeated through banners, badges, actions, and document placeholders.

Keep Preview generation and document export conceptually distinct:

- Preview establishes the current document;
- Export downloads that verified document in PDF or DOCX form.

Routine valid/success states should remain quiet. Required, failure, unavailable, and stale-document states should receive stronger guidance.

Controls may remain persistent during long-document viewing where useful, but should consume minimal visual space.

## Functional Invariants

Preserve:

- backend-generated PDF as the Preview source of truth;
- existing Preview state semantics;
- Profile/version reconciliation before accepting a generated Preview;
- invalidation when the active Profile/version changes;
- export gating until the current Preview is verified valid;
- personal and managed Profile behavior;
- PDF and DOCX export support;
- duplicate-export prevention;
- post-export Profile reconciliation;
- backend-authoritative export filename handling;
- safe `Content-Disposition` filename parsing;
- `lastExportedAt` behavior;
- File Name Format API and selection semantics;
- loading all available File Name Format pages.

`Automatic` must continue to delegate filename resolution to the backend. Do not reproduce filename-precedence logic in the frontend.

HomePage remains untouched.

## Boundaries

Do not:

- redesign the generated CV template;
- create an HTML approximation of the CV;
- introduce frontend PDF/DOCX generation;
- replace the existing PDF viewing approach with a custom viewer unless PLAN identifies a concrete blocker that cannot reasonably be solved otherwise;
- change Preview/export APIs or version semantics;
- invent new export formats;
- redesign File Name Format Master management;
- implement frontend filename generation;
- alter Profile completeness or Preview invalidation rules.

Task 08 consumes File Name Formats; Task 11 owns their management experience.

## Discovery

Start from:

- `CvPreviewComponent` and its focused tests;
- Preview generation and Profile reconciliation flow;
- export/download and backend filename handling;
- File Name Format pagination/loading behavior;
- Profile context behavior for personal and managed routes;
- Task 01 shared feedback/control/motion foundation;
- Task 02 Profile and managed-context shell contract.

Inspect backend-facing services/models only far enough to preserve existing Preview and export behavior.

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

- document-first page composition;
- Preview-state presentation and duplicate-status reduction;
- document-stage sizing and responsive containment;
- Generate/Retry action hierarchy;
- File Name Format and export-control composition;
- PDF/DOCX loading and feedback behavior;
- persistent-control strategy for long documents;
- valid-document preservation during secondary failures;
- stale-document invalidation presentation;
- managed-context presentation without shell duplication;
- skeleton and reduced-motion behavior;
- legacy styling migration;
- accessibility and focused verification.

Resolve visual, interaction, responsive, and document-state presentation decisions far enough that BUILD implements an approved Preview/Export experience rather than redesigning during implementation.
