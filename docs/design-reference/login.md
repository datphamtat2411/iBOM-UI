# Login

## Context

Authentication entry screen and branded transition from the Homepage into the authenticated application.

Login should preserve the approved visual composition and interaction pattern rather than being redesigned independently.

## Stable Rules

- Keep the authentication form direct and familiar.
- Preserve the branded Login composition shown in the approved prototype.
- Authentication feedback must remain clear for loading, invalid credentials, and inactive-account states.
- Login-specific design must not redefine the shared authenticated shell.
- Supporting Register and Forgot Password flows may reuse this visual language, but their product behavior remains task-specific.

## Prototype Route

Prototype: `design/ibom-core-prototype.html`

Do not read the full prototype.

### Styles

Search:
- `/* Login */`

### Markup

Search only as relevant:
- `#login-screen`
- `[data-od-id="login-brand-panel"]`
- `[data-od-id="login-heading"]`
- `#login-form`
- `[data-od-id="login-form"]`
- `[data-od-id="login-submit"]`
- `#auth-message`

### Behavior

Search only as relevant:
- `#login-form` submit handler
- Login success transition into `#app-screen`

### Responsive

Inspect Login-related rules only in:
- `@media (max-width: 800px)`
- `@media (max-width: 430px)`

## Boundary

Do not infer registration rules, password-recovery rules, backend authentication contracts, credential validation behavior, or production copy from prototype helper content.

Exact authentication behavior belongs to the active task, `plan.md`, current source, and backend integration context.
