# Dashboard

## Context

Member Dashboard for the currently selected Profile.

The Dashboard summarizes Profile status, completeness, Preview state, and available Profiles without replacing the Profile Workspace.

## Stable Rules

- Dashboard content always reflects the selected Profile.
- Completeness is shown as guidance and status, not as a restriction on available Profile sections.
- Preview state shown here belongs only to the selected Profile.
- Profile summaries represent independent CV versions.
- Dashboard actions should route into existing Profile or Preview workflows rather than create parallel editing behavior.
- Manager access to this page does not redefine the Dashboard's Profile-centered model.

## Prototype Route

Prototype: `design/ibom-core-prototype.html`

Do not read the full prototype.

### Styles

Search:
- `/* Dashboard */`

### Markup

Search only as relevant:
- `#page-dashboard`
- `[data-od-id="member-dashboard"]`
- `[data-od-id="profile-context-band"]`
- `#dashboard-notice`
- `#contribution-list`
- `.profile-summary-list`

### Behavior

Search only as relevant:
- `renderContributions()`
- Dashboard-related updates inside `setProfile()`
- Dashboard Profile-summary handlers through `[data-profile]`
- Dashboard navigation through `showPage()`

### Responsive

Inspect Dashboard-related rules only in:
- `@media (max-width: 1050px)`
- `@media (max-width: 800px)`
- `@media (max-width: 430px)` when relevant

## Boundary

Do not infer new metrics, analytics, Manager-dashboard requirements, or business calculations from this reference.

Exact Dashboard data, actions, and acceptance criteria belong to the active task, `plan.md`, current source, and confirmed product context.
