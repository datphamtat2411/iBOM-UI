# Task 01 — UI Foundation & Shared Interaction System

## Objective

Establish the shared technical and visual foundation for the iBOM redesign so later feature tasks compose from one coherent system instead of redefining styling and interaction locally.

This task creates the redesign grammar. It does **not** redesign individual product pages.

## Scope

Introduce and integrate the approved redesign foundation:

- Tailwind CSS as the primary styling language for redesigned surfaces;
- Angular Material and Angular CDK;
- semantic design tokens for color, surfaces, typography, spacing, radius, borders, elevation, focus, and motion;
- shared interaction states: default, hover, focus-visible, pressed, selected, disabled, and loading;
- reduced-motion behavior;
- a clear shared ownership boundary for reusable UI primitives.

Create only high-leverage primitives already justified by repeated current UI needs, such as:

- action/button patterns;
- form-field visual/state foundations;
- status/badge and notice/feedback patterns;
- loading/skeleton foundations;
- dialog/overlay, menu/popover, and tooltip infrastructure where Material/CDK provides useful behavior or accessibility.

Exact primitive structure and Material/CDK component mapping belong to PLAN.

## Design Intent

Preserve iBOM's warm technical character while refining it into a quieter, more coherent system.

Tailwind utilities must express semantic design decisions rather than replace SCSS duplication with arbitrary utility values.

Material/CDK are implementation infrastructure, not visual identity. Default Material appearance must not leak into the product.

Use a small, deliberate vocabulary for typography, spacing, geometry, elevation, interaction states, and motion.

Motion should be restrained and functional: CSS/Tailwind first, Angular/CDK when coordination is required, GSAP only when simpler mechanisms cannot provide equivalent product value.

## Functional Invariants

Do not change:

- routes or navigation behavior;
- business logic;
- API integration;
- validation or RBAC behavior;
- existing workflow semantics.

The existing HomePage is outside redesign scope and must remain materially unchanged.

## Boundaries

Do not:

- redesign Shell, Dashboard, Auth, Profile, Preview, Member, User, or Master Data pages;
- perform a repository-wide SCSS-to-Tailwind migration;
- pre-build speculative future components;
- introduce a permanent design-system/demo route;
- remove legacy styling merely for cleanup.

Legacy SCSS may coexist with the new foundation until its owning redesign task migrates that surface.

## Discovery

Start from:

- current global styles and package/toolchain configuration;
- repeated button, form, feedback, table, dialog, menu, focus, and motion patterns across representative features;
- current overlay/dialog implementations and accessibility behavior;
- existing test/config conventions.

Use `docs/DESIGN.md` as the stable design authority. Inspect representative feature code only far enough to identify recurring shared needs and migration boundaries.

## Plan Contract

Create `plan.md` with **no implementation changes**.

Keep it concise and ideally within 150 lines.

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

`File Delta` must list concrete expected paths and each file's responsibility, not broad directory globs.

The plan must resolve:

- dependency/configuration strategy;
- semantic token and Tailwind integration approach;
- Material/CDK theming and usage boundary;
- shared primitive ownership;
- interaction and motion foundation;
- legacy-SCSS coexistence strategy;
- HomePage protection;
- focused verification.

Resolve visual and interaction decisions far enough that BUILD implements an approved foundation rather than designing during implementation.
