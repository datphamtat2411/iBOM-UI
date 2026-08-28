# Task Plan

1. Add a lazy-loaded `/login` route and standalone Login screen.
2. Enable the Homepage Login entry point to navigate to `/login`.
3. Preserve the approved branded two-panel Login composition and responsive behavior.
4. Add email/password reactive-form validation and accessible feedback.
5. Integrate `POST /api/auth/login` through `AuthService`.
6. Store the returned session in existing in-memory auth signals only.
7. Handle loading, duplicate submission, validation, invalid credentials, inactive account, and request-failure states.
8. Navigate successful logins to `/`, the only existing frontend destination, without building Dashboard or an application shell.
9. Add focused component, HTTP, routing, and Homepage-entry tests.

# Repository Findings

* Angular 17 standalone-component application with root route composition in `src/app/app.routes.ts`.
* Only the Homepage currently has a route: `/`.
* Homepage Login control is disabled with demo-only messaging.
* `AuthService` owns in-memory `accessToken`, user, restoration, refresh, and session mutation.
* `AuthService.setSession()` is the existing session establishment boundary.
* `authInterceptor`:

  * sends `withCredentials: true` for API requests;
  * excludes public auth endpoints from bearer attachment;
  * attaches bearer tokens to protected requests;
  * coordinates refresh and retry behavior.
* XSRF configuration is already registered globally with `XSRF-TOKEN` and `X-XSRF-TOKEN`.
* No shared form components or form-validation utilities currently exist.
* Existing tests use Jasmine, Karma, Angular TestBed, and `HttpTestingController`.
* Existing authenticated destination, Dashboard, or application shell does not exist.
* Current frontend `AuthenticatedUser.id` is typed as string, while the backend returns a numeric ID. The auth boundary should normalize the backend ID to the existing frontend session shape, including refresh responses if required by the shared model.

# Proposed Changes

## Authentication API and Session

* Add the Login request model and Login endpoint constant within the existing authentication/core ownership.
* Add an `AuthService` login operation that:

  * posts the email and password to the backend;
  * unwraps the common `ApiResponse` data;
  * establishes the session through `setSession()`;
  * does not persist tokens;
  * leaves cookie handling to the existing interceptor and browser cookie infrastructure.
* Normalize the backend authenticated-user ID to the existing frontend model where necessary.
* Do not add Login-owned token, refresh, CSRF, retry, or restoration state.

## Routing and Homepage Entry

* Add a lazy-loaded `/login` route for the standalone Login component.
* Keep `/` mapped to the current Homepage.
* Replace the disabled Homepage Login control with a router navigation entry.
* After successful authentication, navigate to `/`, the smallest valid existing destination. Do not create a Dashboard or shell solely to receive the Login transition.

## Login Form and States

* Use Angular reactive forms with:

  * required email;
  * valid email format;
  * required password.
* Do not add password complexity or length rules because the Login backend contract only requires a nonblank password.
* Trim and normalize the email before submission consistently with the backend’s case-insensitive email lookup.
* Mark fields appropriately after invalid submission and expose field-level validation feedback.
* Prevent submission when the form is invalid or while a request is active.
* Disable the submit control during the request and expose a signing-in/loading state.
* Render backend validation field violations when returned.
* Render invalid credentials using the backend message for `AUTH_INVALID_CREDENTIALS`.
* Render inactive-account feedback using the backend message for `AUTH_ACCOUNT_INACTIVE`, with the approved warning treatment.
* Render backend-provided messages for other appropriate failures without branching on message text.
* Use HTTP status and stable `errorCode` values for behavior selection.
* Provide a frontend-owned fallback for transport failures that do not contain a usable backend message.
* Preserve focus visibility, semantic labels, alert semantics, keyboard operation, and responsive layout behavior.
* Keep Registration and Forgot Password visual/supporting entries only as represented by the approved Login composition; do not add their routes or flows.

## Visual and Interaction Composition

* Reproduce the routed Login prototype’s branded story panel, Login form panel, hierarchy, feedback placement, action grouping, and responsive transition.
* Preserve the prototype’s direct authentication language and visual relationship to the Homepage.
* Implement production behavior independently from prototype sample credentials, copy, local storage, or simulated delays.

# Backend API Route

Repository: https://github.com/datphamtat2411/iBOM-API
Branch: develop

Endpoint:

* `POST /api/auth/login`

Request body:

```json
{
  "email": "user@example.com",
  "password": "secret"
}
```

Request rules:

* email is required and must be a valid email.
* password is required and must be nonblank.
* Backend normalizes email for case-insensitive lookup.

Successful response:

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "accessToken": "access-token",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "username": "member",
      "role": "MEMBER"
    }
  },
  "timestamp": "..."
}
```

Authentication behavior:

* Successful login sets an HttpOnly, Secure, SameSite Strict `refresh_token` cookie scoped to `/api/auth`.
* Successful login sets a readable, Secure, SameSite Strict `XSRF-TOKEN` cookie scoped to `/`.
* Login itself does not require a CSRF header.
* The existing frontend interceptor must send credentials and preserve these cookies.
* The access token belongs in existing in-memory `AuthService` state and must not be written to browser storage.
* The returned user and access token establish the authenticated frontend session through `AuthService.setSession()`.

Stable error behavior:

* `401 AUTH_INVALID_CREDENTIALS`: invalid or unknown email/password. Display the backend message as the invalid-credentials feedback.
* `403 AUTH_ACCOUNT_INACTIVE`: credentials are correct but the account is inactive. Display the backend message as inactive-account feedback.
* `400 VALIDATION_ERROR`: validation failure. `data.errors` contains field violations with field and message; map email and password violations to their corresponding controls where possible.
* Other failures may use `REQUEST_FAILED` or `INTERNAL_SERVER_ERROR`; use the backend message when usable, otherwise show a frontend fallback.
* Programmatic behavior must use HTTP status, `errorCode`, or structured response data, never human-readable message text.

# Prototype Route

Prototype: `design/ibom-core-prototype.html`
Design reference: `docs/design-reference/login.md`

BUILD should inspect only:

* The `/* Login */` style region.
* `#login-screen`.
* `[data-od-id="login-brand-panel"]`.
* `[data-od-id="login-heading"]`.
* `#login-form`.
* `[data-od-id="login-form"]`.
* `[data-od-id="login-submit"]`.
* `#auth-message`.
* The Login submit handler and success transition into `#app-screen`.
* Login responsive rules under `@media (max-width: 800px)` and `@media (max-width: 430px)`.

Task-specific visual boundary:

* Preserve the Login story/form split, branded authentication transition, feedback placement, action hierarchy, and responsive collapse.
* Treat prototype credentials, local-storage behavior, application-shell transition, and helper copy as non-production implementation evidence.

# File Delta

## Modify

* `src/app/app.routes.ts`
* `src/app/core/auth/auth.models.ts`
* `src/app/core/auth/auth.service.ts`
* `src/app/core/http/api.config.ts`
* `src/app/features/home/home.component.html`
* `src/app/features/home/home.component.spec.ts`

## Add

* `src/app/features/auth/pages/login/login.component.ts`
* `src/app/features/auth/pages/login/login.component.html`
* `src/app/features/auth/pages/login/login.component.scss`
* `src/app/features/auth/pages/login/login.component.spec.ts`
* `src/app/core/auth/auth.service.login.spec.ts`

## Remove

* None

# Focused Tests

* Login component renders email and password controls and the approved Login actions.
* Required and malformed-email validation prevents HTTP submission.
* Validation feedback appears on the relevant fields.
* Submit enters loading state and disables the submit control.
* Repeated submit attempts during an active request produce only one HTTP request.
* Successful response calls the shared session boundary with the returned token and user.
* Successful login navigates to `/`.
* Invalid credentials render backend message and error state.
* Inactive account renders backend message and warning state.
* Structured backend validation errors map to form fields.
* Request failures render backend message or the frontend fallback.
* Login request uses `POST /api/auth/login`, the expected payload, credentials, and no bearer token.
* Homepage Login entry navigates to `/login`.
* Existing auth-service and interceptor tests remain compatible with the added Login operation.

# Out of Scope

* Registration flow.
* Forgot Password flow.
* Reset Password.
* Refresh/session infrastructure changes beyond required Login integration.
* Logout.
* Change Password.
* Change Username.
* Role-based authorization or navigation.
* Application Shell implementation.
* Dashboard implementation.
* Profile or Member data loading.
