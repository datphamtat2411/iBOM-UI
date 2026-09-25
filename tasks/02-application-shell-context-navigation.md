# Task 02 — Application Shell & Context Navigation

## Objective

Redesign the authenticated application shell into a coherent, persistent interaction system that keeps navigation, account identity, selected Profile, and managed-Member context clear while feature content changes.

The shell should feel quiet, stable, and content-first rather than visually competing with the current task.

## Scope

Redesign the authenticated shell, including:

- primary sidebar navigation;
- Workspace and Management grouping;
- Master Data parent/child navigation;
- expanded, collapsed, responsive, and mobile navigation states;
- shell topbar/context region;
- selected Profile context and Profile switcher;
- managed Member/Profile context;
- current-account control and menu;
- shell-level toast/notification presentation;
- shell/content layout relationship;
- shell-level menus, tooltips, overlays, and transition behavior.

Replace number-only compact navigation with meaningful, consistent iconography and accessible labels.

Sidebar collapse/expand must be explicitly understandable and user-controlled. A user's explicit collapse choice should remain predictable across route navigation; PLAN determines the appropriate persistence mechanism.

## Design Intent

Use the shared foundation established by Task 01.

The sidebar should follow a **quiet chrome, content-first** model:

- compact and highly scannable;
- restrained active states;
- clear grouping;
- consistent icon weight;
- reduced visual noise;
- smooth but subtle state changes.

Collapsed navigation must retain meaning through icons, tooltips or equivalent affordances, accessible names, and unmistakable route state.

The topbar should become a **context surface**, not a duplicate page-header layer. Page title, breadcrumb, description, and task-specific actions remain owned by feature pages.

Profile context is a first-class product concept. Personal and managed Profile states must remain visually distinguishable and unambiguous.

Managed-Member context may be visually consolidated but must never become easy to confuse with the user's own Profile context.

Use Task 01 overlay primitives and Material/CDK behavior where appropriate for account menus, Profile switching, tooltips, focus management, keyboard interaction, and positioning.

Motion should provide continuity for sidebar state, navigation expansion, menus, and context changes without delaying navigation or becoming decorative.

## Functional Invariants

Preserve:

- existing routes and route meaning;
- role-based navigation visibility and management authorization;
- selected Profile semantics and Profile data isolation;
- Profile create/copy entry points;
- managed Member navigation and exit behavior;
- account settings and sign-out behavior;
- Master Data route hierarchy;
- notification semantics.

HomePage remains untouched.

## Boundaries

Do not redesign feature-page content, including Dashboard, Profile sections, CV Preview, Member Search, User Management, Master Data tables/forms, or Authentication.

Do not redesign the Profile Copy workflow itself; only its shell entry point and required shell integration belong here.

Do not introduce a competing local token, control, overlay, or motion system when Task 01 already provides an applicable foundation.

A global route transition is optional and should be included only if PLAN finds a lightweight, maintainable implementation with clear continuity value.

## Discovery

Start from:

- the current authenticated application shell and its tests;
- existing route/RBAC visibility logic;
- current Profile and managed-Member context flows;
- account, Profile switcher, Master Data navigation, toast, and responsive shell behavior;
- Task 01 shared tokens, primitives, overlays, accessibility, and motion foundations.

Inspect feature pages only far enough to understand their contract with the shell. Do not rediscover or redesign their internal composition.

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

`File Delta` must identify concrete expected paths and the responsibility of each change.

The plan must resolve:

- sidebar state model and responsive modes;
- icon/navigation strategy;
- collapse persistence behavior;
- topbar and content-frame responsibility;
- Profile and managed-context composition;
- Master Data collapsed-navigation behavior;
- overlay/menu/tooltip implementation using Task 01 foundations;
- shell motion and reduced-motion behavior;
- accessibility and keyboard interaction;
- migration from existing shell-local styling;
- focused verification.

Resolve visual, interaction, and responsive decisions far enough that BUILD implements an approved shell rather than redesigning during implementation.
