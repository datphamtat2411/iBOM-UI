# Task 10 — User Management Experience

## Objective

Redesign User Management into a compact, predictable administrative directory for finding users, creating accounts, and managing account status.

Improve hierarchy, table density, dialogs, feedback, and operational states while preserving existing authorization, account, filtering, password, and status semantics.

## Scope

Redesign:

- User Management page composition;
- username/email search and role filtering;
- applied-filter presentation;
- User results table;
- Create User dialog;
- password and validation presentation;
- role selection;
- ACTIVE/INACTIVE status presentation;
- activation/deactivation actions and confirmations;
- self-deactivation-unavailable presentation;
- loading, empty, error, success, and pagination states;
- responsive User Management behavior.

Use Task 01 shared controls, tables, dialogs, feedback, and states. Reuse Task 03 password interaction language and applicable search/table patterns established by Task 09.

## Design Intent

Treat User Management as a **table-first enterprise administration surface**.

Keep search and role filters compact so the User directory remains the primary content.

Preserve the unified User directory rather than introducing account-group tabs without a concrete need. Search supports username/email and multiple role selections.

Maintain the distinction between draft and applied filters. Results and pagination continue to represent the last explicitly applied query.

The table should prioritize confirmed User-level data:

- Username;
- Email;
- Role;
- Account Status;
- Actions.

Do not derive Full Name, Job Title, or similar User-level information from an arbitrary Profile because their authoritative source remains unresolved.

## Create User

Keep Create User as a focused dialog.

Preserve:

- Email;
- Username;
- Password;
- Confirm Password;
- Role;
- current password requirements and validators;
- field-specific backend validation;
- supported roles `MEMBER`, `MANAGER`, and `ADMIN`;
- no-email-verification behavior for Manager/Admin-created accounts.

Do not introduce dynamic Role Management.

## Account Status

ACTIVE and INACTIVE are account states, not deletion states.

Both activation and deactivation must continue to require confirmation. Self-deactivation must remain unavailable and protected at both UI and backend-error-handling levels.

Status actions should remain explicit and subordinate to the User data rather than becoming dominant row controls.

## Functional Invariants

Preserve:

- MANAGER/ADMIN authorization;
- User list, create, and status APIs;
- username/email search;
- multi-role filtering;
- draft versus applied filters;
- supported roles exactly as currently defined;
- account-creation validation and password rules;
- activation/deactivation semantics;
- self-deactivation protection;
- inactive-user data retention;
- success/error behavior;
- default page size of 10 and pagination;
- page-recovery behavior.

HomePage remains untouched.

## Boundaries

Do not:

- invent Profile-derived User fields;
- add dynamic Role CRUD;
- merge or remove existing roles;
- redesign authentication/session architecture;
- change account creation or status business rules;
- replace the User table with card-based presentation;
- introduce live filtering that changes current explicit Apply semantics.

## Discovery

Start from:

- User Management page and focused tests;
- `ManagedUserCreationComponent`;
- `AccountStatusConfirmationComponent`;
- User Management models and service contracts;
- current authentication identity used for self-deactivation protection;
- Task 01 shared table/dialog/feedback foundation;
- Task 03 password patterns;
- applicable Task 09 search/table patterns.

Use `docs/DESIGN.md` and relevant User Management requirements/acceptance criteria as design and behavioral authority.

## Plan Contract

Create `plan.md` with no implementation changes and keep it concise, ideally within 150 lines.

Use exactly:

1. `Repository Findings`
2. `Relevant Code`
3. `Proposed Changes`
4. `Implementation Context`
5. `File Delta`
   - `Add`
   - `Modify`
   - `Delete`
6. `Verification`

Use `None` for an empty File Delta category.

`File Delta` must list concrete expected paths and each file's responsibility.

The plan must resolve:

- compact search/filter composition;
- draft/applied-filter feedback;
- User table density and responsive behavior;
- role/status visual treatment;
- Create User dialog composition;
- password guidance and validation presentation;
- shared dialog adoption;
- activation/deactivation confirmation hierarchy;
- self-account treatment;
- loading, error, empty, success, and pagination presentation;
- legacy styling migration;
- accessibility and focused verification.

Resolve visual and interaction decisions far enough that BUILD implements an approved User Management experience rather than redesigning during implementation.
