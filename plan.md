# HOTFIX-02 Plan

## Repository Findings

- Registration, reset-password, and account-settings templates currently render password inputs directly with `type="password"`.
- No existing password visibility or eye-icon pattern exists in `src`.
- Form values, validators, payload construction, and API services are already implemented and must remain unchanged.

## Relevant Code

- `src/app/features/auth/pages/registration/registration.component.{ts,html,scss,spec.ts}`
- `src/app/features/auth/pages/forgot-password/forgot-password.component.{ts,html,scss,spec.ts}`
- `src/app/features/auth/pages/account-settings/account-settings.component.{ts,html,scss,spec.ts}`

## Proposed Changes

- Add independent component booleans and `type` bindings for the two registration fields, two reset fields, and three account-settings fields.
- Add `type="button"` controls with state-dependent accessible labels and visible text labels.
- Wrap only affected inputs to position controls without changing form behavior or validation.
- Extend each affected component spec with default-hidden, independent-toggle, value-preservation, button-type, and accessible-label assertions.

## Prototype Route

- Use the authentication visual language from `design/ibom-core-prototype.html`, restricted to the Login styles and `#login-screen` / `#login-form` composition routed by `docs/design-reference/login.md`.
- No exact password visibility control exists in the prototype, so preserve the current production layout and add only the minimal control styling.

## Verification

- Run focused specs for Registration, ForgotPassword, and AccountSettings.
- Run `npm test -- --watch=false --browsers=ChromeHeadless` and `npm run build` as required by the task.
