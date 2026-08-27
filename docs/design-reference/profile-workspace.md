# Profile Workspace

## Context

Profile Workspace is the main editing surface for the currently selected Profile.

Every Profile uses the same Workspace structure for About Me, Education, Languages, Certificates, Projects, and Skills.

## Stable Rules

- Workspace always reflects the currently selected Profile.
- All Profiles expose the same sections and editing capability.
- Completeness changes state and guidance, not available sections.
- Empty sections expose an appropriate Add action.
- Existing records expose the relevant editing action.
- Changes apply only to the current Profile.
- Saving Profile data invalidates the current Preview when applicable.
- Switching Profile must replace Workspace data without leaking the previous Profile.

## Prototype Route

Prototype: `design/ibom-core-prototype.html`

Do not read the full prototype.

### Styles

Search:
- `/* Workspace */`

### Markup

Search only as relevant:
- `#page-workspace`
- `[data-od-id="profile-workspace"]`
- `#workspace-notice`
- `#profile-workspace-content`
- `#workspace-section-nav`
- `#workspace-sections`
- `#workspace-section-about`
- `#workspace-section-education`
- `#workspace-section-languages`
- `#workspace-section-certificates`
- `#workspace-section-projects`
- `#workspace-section-skills`

### Behavior

Search only as relevant:
- `workspaceScore()`
- `renderRecordList()`
- `renderWorkspace()`
- Workspace section-navigation handler
- `[data-section-action]` handler
- `#add-project` / `[data-edit-project]` handlers
- Workspace-related updates inside `setProfile()`

### Responsive

Inspect Workspace-related rules only in:
- `@media (max-width: 1050px)`
- `@media (max-width: 800px)`

## Boundary

Do not infer Profile CRUD behavior, field validation, persistence rules, or non-Project editor implementation from prototype placeholders.

The prototype fully demonstrates Project editing separately; other section editors are visual/action placeholders unless the active task defines their behavior.

Exact Profile-section requirements belong to the active task, `plan.md`, current source, and confirmed product context.
