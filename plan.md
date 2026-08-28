# Task Plan

Implement a feature-owned Forgot and Reset Password workflow using the existing Login authentication composition and backend contracts. Keep transient flow state local to the feature and never persist credentials or recovery data.

# Repository Findings

* Login is a standalone lazy-loaded component at `/login`.
* Login's Forgot Password control is currently disabled and has no route.
* Registration provides reusable patterns for reactive forms, live password requirements, Confirm Password matching, field-error mapping, loading flags, and duplicate-submit prevention.
* Auth feature services use `HttpClient`, `ApiResponse`, `/api` config constants, and `withCredentials: true`.
* Feature-specific pages, services, models, and state belong under `features/auth`.
* API errors expose optional `errorCode`, human-readable `message`, and structured validation data. Behavior must not branch on `message`.
* Existing auth styling uses the approved branded two-column authentication layout and responsive breakpoints.

# Proposed Changes

## Forgot Password Route and Screen

* Add a lazy-loaded `/forgot-password` route.
* Change Login's Forgot Password entry into a router link.
* Add a standalone feature-owned Forgot Password component using the Login visual language.
* Keep transient `email`, `verificationCode`, and `password` values in component/feature memory only.
* Provide navigation back to Login without persisting or exposing recovery state.

## Request Code

* Add an email form with required and email validation.
* Normalize email by trimming and lowercasing before submission.
* Submit `POST /api/auth/forgot-password`.
* On success, show neutral copy such as “If an account exists for this email, a verification code has been sent.” and advance to code verification.
* Do not reveal whether the account exists, including through success or request-specific error copy.
* Disable the submit control while the request is active and ignore duplicate submissions.

## Verify Code

* Add a six-digit numeric verification-code step.
* Submit the normalized email and code through `POST /api/auth/forgot-password/verify`.
* On success, advance to the new-password step.
* Map `AUTH_INVALID_OR_EXPIRED_VERIFICATION_CODE` to code-field feedback.
* Preserve the code in memory for the reset request, but never browser storage.
* Allow a new code request through the feature workflow without weakening backend rate limits.

## New Password and Reset

* Add Password and frontend-only Confirm Password fields.
* Add live requirement indicators for 8–72 characters, uppercase, lowercase, digit, and special character.
* Match the backend `StrongPasswordValidator` semantics, including Unicode-aware letter/digit checks and excluding whitespace from special-character matches.
* Validate Confirm Password only on the frontend and omit it from the API payload.
* Submit email, verification code, and password through `POST /api/auth/reset-password`.
* On successful reset, clear in-memory flow state and navigate to `/login`.
* Treat backend validation and code validity as final authority even when frontend validation passes.

## Loading and Errors

* Use separate request, verification, and reset loading state as needed to disable relevant controls.
* Ignore submit events while the corresponding operation is active.
* Map `VALIDATION_ERROR` and HTTP 400 validation responses to fields using structured `data.errors`.
* Handle `AUTH_INVALID_OR_EXPIRED_VERIFICATION_CODE` with code-step feedback.
* Handle `AUTH_VERIFICATION_CODE_REQUEST_LIMIT_REACHED` with rate-limit guidance while retaining neutral account behavior.
* Use HTTP status and `errorCode` for branching, never human-readable `message`.
* Use backend messages for backend-owned feedback where appropriate and frontend-owned copy for local validation and neutral request-code guidance.
* Provide a safe generic fallback for unexpected errors.

# Backend API Route

* `POST /api/auth/forgot-password`

  * Request: `{ "email": string }`
  * Success: `ApiResponse<Void>` with HTTP 200.
  * Invalid email: HTTP 400, `VALIDATION_ERROR`.
  * Rate limit: HTTP 429, `AUTH_VERIFICATION_CODE_REQUEST_LIMIT_REACHED`.
  * Unknown emails still receive the same successful service response behavior; the UI must remain neutral.

* `POST /api/auth/forgot-password/verify`

  * Request: `{ "email": string, "verificationCode": string }`.
  * Success: `ApiResponse<Void>` with HTTP 200.
  * Invalid format: HTTP 400, `VALIDATION_ERROR`.
  * Unknown, expired, exhausted, or incorrect code: HTTP 400, `AUTH_INVALID_OR_EXPIRED_VERIFICATION_CODE`.

* `POST /api/auth/reset-password`

  * Request: `{ "email": string, "verificationCode": string, "password": string }`.
  * Confirm Password is not sent.
  * Success: `ApiResponse<Void>` with HTTP 200.
  * Invalid format or strong-password failure: HTTP 400, `VALIDATION_ERROR`.
  * Invalid, expired, exhausted, or incorrect code: HTTP 400, `AUTH_INVALID_OR_EXPIRED_VERIFICATION_CODE`.
  * Backend invalidates the code and revokes existing refresh tokens after reset.

# Prototype Route

* Reference: `docs/design-reference/login.md`.
* Prototype: `design/ibom-core-prototype.html`.
* Inspect only the Login support evidence and routed authentication regions:

  * Styles: `/* Login */`, lines 100–120.
  * Markup: `#login-screen`, `#login-form`, `#auth-message`, lines 440–457.
  * Responsive rules: `@media (max-width: 800px)` and `@media (max-width: 430px)`, Login-related rules around lines 361–367.
  * Supporting behavior note: `supportCopy['forgot-password']`, lines 765–768.
* Reuse the branded story panel, white form panel, compact fields, action hierarchy, feedback treatment, spacing, focus states, and responsive composition.
* Do not treat prototype support copy or Login fields as the exact recovery specification.

# File Delta

* Modify `src/app/features/auth/pages/login/login.component.html`
* Modify `src/app/app.routes.ts`
* Modify `src/app/core/http/api.config.ts`
* Add `src/app/features/auth/pages/forgot-password/forgot-password.component.ts`
* Add `src/app/features/auth/pages/forgot-password/forgot-password.component.html`
* Add `src/app/features/auth/pages/forgot-password/forgot-password.component.scss`
* Add `src/app/features/auth/services/password-reset.service.ts`
* Add `src/app/features/auth/models/password-reset.models.ts`
* Add `src/app/features/auth/pages/forgot-password/forgot-password.component.spec.ts`
* Add `src/app/features/auth/services/password-reset.service.spec.ts`
* Modify `src/app/features/auth/pages/login/login.component.spec.ts`

# Focused Tests

* Route/link exposes Forgot Password from Login and loads `/forgot-password`.
* Email required and format validation prevents request submission.
* Request-code payload is normalized and uses the correct method and URL.
* Request-code success remains neutral and advances to verification.
* Unknown-account behavior does not produce account-existence-specific UI.
* Duplicate request, verify, and reset submissions are ignored while loading.
* Six-digit code validation and verify payload are correct.
* Invalid/expired code errors attach to the code field.
* Rate-limit errors show guidance based on stable status/error code.
* Password indicators update live for each backend requirement.
* Unicode-aware strong-password cases match backend rules; whitespace is not accepted as special character.
* Confirm Password mismatch is frontend-only and omitted from reset payload.
* Reset success clears transient state and navigates to Login.
* Structured validation and unexpected errors render appropriate feedback without branching on `message`.

# Out of Scope

* Registration changes.
* Login or session infrastructure changes.
* Logout.
* Authenticated Change Password or Change Username.
* Dashboard, application shell, and unrelated routes.
* Backend changes or backend test changes.
* Browser storage for email, verification code, or passwords.
