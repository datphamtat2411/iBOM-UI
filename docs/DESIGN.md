# Design

iBOM uses a restrained technical-enterprise visual language with clear hierarchy, compact operational UI, and strong Profile context.

This file preserves stable design context across sessions. It does not define task-specific screen requirements.

## Design Direction

Prefer:
- clear information hierarchy;
- compact, readable enterprise layouts;
- crisp geometry and restrained corner radius;
- structural borders and deliberate spacing;
- purposeful brand color;
- reusable patterns over per-page reinvention.

Avoid:
- generic card-heavy SaaS layouts;
- glassmorphism;
- decorative gradients;
- excessive rounding;
- gratuitous animation;
- redesigning approved composition without an explicit task requirement.

## Product Contexts

Homepage may remain expressive and marketing-oriented.
Authentication may use stronger brand expression while remaining direct and familiar.
Authenticated screens are restrained, dense, and task-oriented.
Generated CVs are document-first, professional, static, and print-oriented.

## Typography

Authenticated operational UI uses IBM Plex Sans.

IBM Plex Mono is reserved for technical metadata such as percentages, timestamps, codes, filenames, and compact technical labels.

Do not use monospace for normal body copy, navigation, form content, or general table content.

Approved brand treatment may retain prototype display typography for the iBOM wordmark and authentication storytelling.

## Color and Geometry

Use the approved prototype palette and semantic roles.

Foundation:
- warm near-white application canvas;
- white content and document surfaces;
- dark ink foreground;
- restrained muted text and borders;
- orange primary action/accent;
- FPT blue, orange, and green brand identifiers;
- semantic success, warning, information, and danger states.

Do not invent feature-specific palettes or unrelated visual systems.

## Shared UX Invariants

- Selected Profile context must always be unambiguous.
- All Profiles use the same Workspace structure and editing capability.
- Completeness changes state and guidance, not available sections.
- Empty sections expose an appropriate next action.
- Profile switching must not leak previous Profile data.
- Saving Profile data invalidates the current Preview when applicable.
- Export is unavailable until the current Profile has a valid Preview.
- Managed Member context remains explicit while switching that Member's Profiles.
- Generated CV content belongs only to the current Profile.

## Interaction and Accessibility

Motion is restrained and used only to clarify context, loading, saving, overlays, or result updates.

Preserve visible keyboard focus, semantic labels, keyboard-operable menus and dialogs, adequate target size, text plus color for important states, reduced-motion support, and responsive layouts that preserve task clarity.

Exact motion timing and responsive composition come from the routed prototype region when relevant.

## Design Reference Routing

For UI work, PLAN reads only the relevant page reference:

- application shell / navigation / Profile context → `docs/design-reference/application-shell.md`
- login / authentication entry → `docs/design-reference/login.md`
- Member Dashboard → `docs/design-reference/dashboard.md`
- Profile Workspace → `docs/design-reference/profile-workspace.md`
- Project editing → `docs/design-reference/project-editor.md`
- CV Preview / export → `docs/design-reference/cv-preview.md`
- Member Management / advanced search → `docs/design-reference/member-management.md`

Do not read unrelated page references for a focused task.

## Approved Prototype

Canonical prototype: `design/ibom-core-prototype.html`

The prototype is approved visual and interaction evidence.

PLAN follows the relevant design-reference file into the smallest required prototype regions and records those exact routes in `plan.md`.

BUILD does not reread design docs by default. For UI work, BUILD inspects the exact prototype regions routed by `plan.md` before implementing the corresponding UI.

Do not read the full prototype by default.

## Boundary

This file defines stable frontend design context and routing only.

Do not infer production requirements from prototype sample data, helper copy, unresolved product decisions, or temporary implementation mechanics.

Exact feature behavior, acceptance criteria, and implementation detail belong to the active task, `plan.md`, current source, and routed prototype regions.
