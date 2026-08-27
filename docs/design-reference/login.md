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

## Supporting Authentication Flows

Registration and Forgot Password do not have complete standalone screens in the approved prototype.

They reuse the approved Login authentication visual language and form patterns.

When a task involves Registration or Forgot Password, PLAN may inspect only the relevant supporting authentication evidence together with the routed Login regions required to preserve visual consistency.

Relevant prototype support may include:

- Registration support/reference content when present.
- Forgot Password support/reference content when present.
- Login form composition and authentication layout.
- Shared authentication field, action, feedback, spacing, and responsive patterns.

Do not treat Login field structure or prototype helper/support content as an exact Registration or Forgot Password production screen specification.

For these supporting flows:

- visual language may be derived from Login;
- exact fields come from the active task and implemented backend contract;
- exact step flow comes from the active task and confirmed requirements;
- validation behavior comes from the active task and backend contract;
- API interaction comes from the implemented backend contract;
- navigation and success behavior remain task-specific.

If the prototype does not contain exact visual evidence for a required supporting-authentication state, preserve the established authentication visual language rather than inventing a separate design system.

## Boundary

Do not infer registration rules, password-recovery rules, backend authentication contracts, credential validation behavior, or production copy from prototype helper content.

Exact authentication behavior belongs to the active task, `plan.md`, current source, and backend integration context.