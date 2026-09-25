# Task 04 — Dashboard Experience

## Objective

Redesign the Member Dashboard and Manager Dashboard into clear, restrained, action-oriented surfaces that use the shared redesign foundation without turning either page into a generic card-heavy analytics dashboard.

The Member Dashboard should help users understand the state of the selected Profile and what action matters next.

The Manager Dashboard should support fast analytics scanning and trustworthy interpretation of existing Profile and skill data.

## Scope

Redesign the content of:

- Member Dashboard;
- Manager Dashboard;
- dashboard loading, empty, error, refresh, and status states;
- completeness presentation;
- Profile overview/list presentation;
- Preview/document readiness presentation;
- Manager completion summary;
- skill distribution charts and companion value lists;
- analytics provenance and refresh feedback;
- dashboard responsive composition.

Use Task 01 tokens, primitives, interaction states, and motion grammar.

Consume the Application Shell contract established by Task 02; do not redesign shell-owned context.

## Design Intent

### Member Dashboard

Treat the page as a **Profile health and next-action dashboard**, not a collection of unrelated metrics.

Hierarchy should make it easy to understand:

1. the relevant Profile context;
2. completeness and document readiness;
3. the most useful current action;
4. sections needing attention;
5. other available Profiles.

Avoid over-repeating selected Profile information already established by the shell.

Reduce redundant document-state messaging where the same state is currently represented by banner, status, and action simultaneously.

Keep completeness data list-oriented and highly scannable rather than converting sections into independent cards.

### Manager Dashboard

Treat the page as a calm analytical overview.

Preserve the existing completion, primary-skill, and skill-category analytics.

Do not invent additional KPIs, trends, comparisons, or derived business meaning.

Keep charts paired with exact readable values and accessible descriptions.

Chart.js remains the visualization foundation unless PLAN discovers a concrete implementation blocker. Bring chart colors, typography, grid treatment, tooltips, and density into the shared design system instead of retaining isolated hard-coded visual language.

Routine provenance and freshness information should remain available but visually secondary to the analytics themselves.

Motion should be restrained. Chart animation is optional and should exist only where it improves state continuity, respects reduced motion, and adds negligible complexity.

## Functional Invariants

Preserve:

- Dashboard APIs and response semantics;
- selected Profile behavior and Profile isolation;
- completeness calculations and section meaning;
- Preview/document-state rules;
- Profile creation and switching behavior;
- Manager analytics calculations and distributions;
- refresh semantics;
- exact companion data for charts;
- chart accessibility information;
- role and route behavior.

HomePage remains untouched.

## Boundaries

Do not:

- modify Application Shell structure or shell-level Profile context;
- redesign Profile Workspace or CV Preview;
- change backend contracts or analytics meaning;
- invent new metrics, trends, recommendations, or business rules;
- replace useful lists/tables with decorative card grids;
- introduce a new charting library merely for visual redesign;
- create a dashboard-specific visual system that bypasses Task 01.

Task 04 may change component presentation state or view logic where required by the approved composition, but it is not an analytics/domain refactor.

## Discovery

Start from:

- Member Dashboard component, styles, focused tests, and Profile-context integration;
- Manager Dashboard component, Chart.js configuration, styles, and focused tests;
- dashboard models and service-facing UI contracts;
- Task 01 shared tokens, primitives, feedback states, and motion foundation;
- the shell/page-content contract produced by Task 02.

Inspect Profile or service internals only as needed to preserve existing Dashboard behavior.

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

- Member Dashboard hierarchy and composition;
- shell-context versus dashboard-context responsibility;
- action emphasis without inventing business rules;
- completeness and Profile-list presentation;
- document-status consolidation;
- Manager completion and analytics composition;
- Chart.js visual-system integration;
- loading, refresh, error, empty, and sparse-data presentation;
- responsive reading order and chart sizing;
- optional motion decisions and reduced-motion behavior;
- legacy dashboard styling migration;
- focused verification.

Resolve visual, interaction, chart, and responsive decisions far enough that BUILD implements an approved Dashboard experience rather than redesigning during implementation.
