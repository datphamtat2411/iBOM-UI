# Application Shell

## Context

Shared authenticated shell for navigation, account access, selected Profile context, and managed Member context.

The shell is persistent across authenticated pages and must not be redesigned independently by individual features.

## Stable Rules

- Selected Profile context must always be explicit.
- Profile switching must not leak previous Profile data.
- Managed Member context persists while switching that Member's Profiles.
- Management navigation remains role-aware and separate from Workspace navigation.
- Preview state shown in the shell belongs to the selected Profile.
- Feature pages must reuse the shared shell instead of creating page-specific variants.

## Prototype Route

Prototype: `design/ibom-core-prototype.html`

Do not read the full prototype.

### Styles

Search:
- `/* Application shell */`

### Markup

Search only as relevant:
- `[data-od-id="authenticated-app-shell"]`
- `[data-od-id="primary-navigation"]`
- `[data-od-id="profile-context-header"]`
- `[data-od-id="profile-switcher"]`
- `#profile-menu`
- `#member-context`
- `#account-btn`
- `#account-menu`
- `#exit-managed-member`

### Behavior

Search only as relevant:
- `showPage()`
- `updateProfileScopeUI()`
- `setProfile()`
- `switchProfile()`
- `#exit-managed-member` handler
- Profile-menu handlers
- account-menu handlers

### Responsive

Inspect shell-related rules only in:
- `@media (max-width: 1050px)`
- `@media (max-width: 800px)`

## Boundary

Do not infer new navigation destinations, role capabilities, account features, backend authorization rules, or page-specific layout from this reference.

If the task crosses into page content, PLAN must also read the matching page design reference.
