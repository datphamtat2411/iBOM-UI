# Project Editor

## Context

Project Editor is the dedicated editing surface for Project data inside the currently selected Profile.

It is a full-page editor, not a modal extension of the Workspace.

## Stable Rules

- Project editing always applies to the currently selected Profile.
- Existing and new Projects use the same editor structure.
- Completion status may affect whether End Date is required or available.
- Unsaved, saving, and saved states must remain explicit.
- Successful Project changes invalidate the current Preview when applicable.
- Returning to the Workspace must not leak Project data across Profiles.
- The editor should reuse shared shell and form patterns rather than create a separate application style.

## Prototype Route

Prototype: `design/ibom-core-prototype.html`

Do not read the full prototype.

### Styles

Search:
- `/* Editor */`

### Markup

Search only as relevant:
- `#page-editor`
- `[data-od-id="project-editor"]`
- `#project-form`
- `#completion-status`
- `#editor-message`
- `.sticky-actions`
- `#save-project`
- `#save-state`

### Behavior

Search only as relevant:
- `openProjectEditor()`
- `#completion-status` handler
- `#save-project` handler
- `#project-form` input handler
- navigation back to Profile Workspace
- Preview invalidation performed by successful Project save

### Responsive

Inspect Editor-related rules only in:
- `@media (max-width: 800px)`
- `@media (max-width: 430px)` when relevant

## Boundary

Do not infer Project validation rules, persistence contracts, authorization rules, or backend request shape from prototype sample behavior.

Exact Project fields, validation, save behavior, and acceptance criteria belong to the active task, `plan.md`, current source, and confirmed product context.
