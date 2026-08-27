# Member Management

## Context

Member Management is the Manager-facing area for finding Members and entering managed Member Profile context.

Search results represent Members, while filtering conditions are evaluated against Profile-owned data.

## Stable Rules

- Skill + Seniority conditions use AND semantics.
- Language + Level conditions use AND semantics.
- Paired conditions must match within the same Profile.
- A Member appears at most once in results.
- Search conditions remain visible when results are empty.
- Opening a Member enters explicit managed Member context.
- Managed Member context remains active while switching that Member's Profiles.
- Manager search must not invent Member or Profile detail that was not returned by the current data source.

## Prototype Route

Prototype: `design/ibom-core-prototype.html`

Do not read the full prototype.

### Styles

Search:
- `/* Member management */`

### Markup

Search only as relevant:
- `#page-members`
- `[data-od-id="member-management"]`
- `[data-od-id="member-search-builder"]`
- `#member-results`
- `#member-tbody`
- `#no-results`
- `#apply-search`
- `#clear-search`

### Behavior

Search only as relevant:
- `pairMatches()`
- `searchMembers()`
- `renderMembers()`
- `renderMemberLoading()`
- `openMember()`
- `#apply-search` handler
- `#clear-search` handler

Inspect managed Member Profile-switching behavior only when the task crosses into application-shell context.

### Responsive

Inspect Member Management-related rules only in:
- `@media (max-width: 1050px)`
- `@media (max-width: 800px)`

## Boundary

Do not infer new search operators, result columns, Member detail fields, inactive-user filtering, role capabilities, or backend query contracts from prototype sample data.

Exact search inputs, data contracts, authorization behavior, and acceptance criteria belong to the active task, `plan.md`, current source, and confirmed product context.
