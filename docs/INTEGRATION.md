# Integration

## API Boundary

iBOM UI communicates with the backend through HTTP APIs under `/api`.

Backend contracts are the source of truth for request and response data.
Feature-specific endpoints and payloads remain task-specific.

## Response Format

Backend responses use the common wrapper:

```json
{
  "code": 200,
  "message": "Success",
  "data": {},
  "timestamp": "..."
}
```

Error responses may additionally include a stable machine-readable `errorCode`:

```json
{
  "code": 401,
  "errorCode": "AUTH_INVALID_CREDENTIALS",
  "message": "Invalid email or password",
  "data": null,
  "timestamp": "..."
}
```

`errorCode` is optional at the transport level and is included when the backend provides a stable application error classification.

Frontend transport models should preserve this common wrapper instead of inventing feature-specific envelopes.

## Error Handling

Use backend `message` for backend-owned user-facing error feedback when appropriate.

Do not duplicate or reinterpret backend error messages unless the frontend owns that copy, such as client-side validation or UI guidance.

Do not branch application behavior on human-readable `message`.

Programmatic behavior must use stable signals such as:

* HTTP status;
* `errorCode`;
* explicit response data.

When the backend returns structured validation details in `data`, feature code may map those details to the relevant form fields.

Frontend-owned validation and UI guidance may use frontend-owned copy.

## Authentication

Access tokens are sent as:

```text
Authorization: Bearer <access-token>
```

Keep the access token in application session state, not `localStorage` or `sessionStorage`.

Refresh tokens use the backend-defined HttpOnly cookie flow and are not read directly by frontend code.

Cookie-dependent authentication requests must send credentials as required by the backend.

Refresh and logout requests must follow the backend CSRF contract.

## HTTP Ownership

Application-wide HTTP and authentication infrastructure belongs under `core/`.

Centralize API base configuration, access-token attachment, cookie credentials, common response/error handling, and refresh coordination when implemented.

Feature services own feature-specific API operations.

Do not duplicate common authentication or HTTP plumbing inside individual features.

## Authorization

Frontend guards and visibility controls improve navigation and UX only.

Backend authorization remains the final authority for protected operations and data access.

## Contract Ownership

Frontend types model the backend API contract needed by the feature.

Do not couple frontend code to backend persistence entities or database structure.

Do not silently compensate for unclear or contradictory backend contracts.

## Boundary

This file defines stable frontend/backend integration conventions only.

Exact endpoints, DTO fields, validation rules, error codes, refresh behavior, and feature-specific API workflows belong to the active task, `plan.md`, current frontend source, and implemented backend contract.
