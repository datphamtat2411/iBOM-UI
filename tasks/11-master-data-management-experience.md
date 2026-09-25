# Task 11 — Master Data Management Experience

## Objective

Redesign Master Data Management into a compact, consistent, table-first administration experience across Skills, Seniority, Languages, and File Name Formats.

Routine CRUD should become predictable across resources while preserving each resource's domain-specific validation, deletion protection, and editing semantics.

## Scope

Redesign:

- Skills management;
- Seniority management;
- Languages management;
- File Name Format management;
- resource headings and actions;
- applicable search controls;
- management tables;
- Create/Edit dialogs;
- delete confirmations;
- loading, empty, error, success, and pagination states;
- Seniority range editing;
- File Name Format controlled builder;
- responsive Master Data behavior.

Use Task 01 shared controls, fields, tables, dialogs, feedback, and states. Reuse applicable table/search patterns established by Tasks 09 and 10.

## Design Intent

Treat Master Data as a **dense, predictable governance surface**.

The four independently managed resources are:

- Skills;
- Seniority;
- Languages;
- File Name Formats.

Skill Category remains a controlled classification consumed by Skills and must not become an independent CRUD resource.

All resources should share a recognizable management grammar:

- clear resource heading;
- contextual Add action;
- compact search where supported;
- table-first records;
- predictable Edit/Delete actions;
- shared editor and confirmation behavior.

Consistency must come from shared presentation patterns rather than forcing different domain models into one generic CRUD component.

## Resource-specific Requirements

### Skills

Preserve Skill Name and controlled Category selection.

Search remains server-backed and follows existing trim, case-insensitive, and name-matching semantics.

Referenced Skills must remain protected from deletion.

Do not introduce Skill Category Create/Edit/Delete operations.

### Seniority

Preserve:

- Level Name;
- Minimum Experience;
- Maximum Experience or Unlimited;
- half-open range semantics `[min, max)`;
- non-overlapping ranges;
- current Unlimited-range rules;
- backend-authoritative conflict and deletion behavior.

Do not infer Seniority usage from Profile data in the frontend.

### Languages

Keep Language management as a simple named-master workflow with server-backed search, uniqueness validation, and referenced-data deletion protection.

### File Name Formats

Keep Pattern editing as a controlled builder, never unrestricted free text.

Allowed placeholders remain:

- `LastName`;
- `FirstName`;
- `Role`;
- `Date`.

Preserve placeholder uniqueness, ordering, separators, minimum-one-placeholder validation, pattern preview, and existing legacy-pattern safety.

`Role` continues to mean Profile Job Title rather than application role.

Preserve the current `isDefault` indicator and default-format deletion protection. Do not invent Set Default behavior without an approved API contract.

## Functional Invariants

Preserve:

- MANAGER/ADMIN management permissions;
- Member read access through existing consuming flows;
- current APIs and validation rules;
- duplicate-name protections;
- referenced-data deletion protections;
- current sorting and pagination semantics;
- server-backed Skill/Language search;
- current stale-record handling;
- current success/error flows;
- File Name Format legacy-pattern protection.

HomePage remains untouched.

## Boundaries

Do not:

- add new Master Data resources;
- create Skill Category CRUD;
- convert Project Programming Languages or Tools into Master Data;
- add search where no current product requirement supports it;
- change Seniority domain rules;
- introduce frontend-only referential checks as business authority;
- add unrestricted File Name Format editing;
- invent default-format management APIs;
- redesign Master Data navigation owned by Task 02;
- create a universal metadata-driven CRUD framework.

## Discovery

Start from:

- Master Data routes and workspace;
- Skill Management;
- Seniority Management;
- Language Master Management;
- File Name Formats and `FileNameFormatEditor`;
- related models, services, and focused tests;
- current deletion/error handling;
- Task 01 shared form/table/dialog foundation;
- applicable Task 09/10 table, search, loading, and pagination patterns.

Use `docs/DESIGN.md` and relevant Master Data requirements/acceptance criteria as design and behavioral authority.

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

- shared Master Data page/table grammar;
- Skills/Languages search composition;
- Create/Edit dialog consistency;
- delete-confirmation integration;
- Seniority range presentation and validation feedback;
- File Name Format builder composition and reorder interaction;
- default/reference protection presentation;
- loading, empty, stale, error, success, and pagination states;
- responsive table/dialog behavior;
- legacy styling migration;
- accessibility and focused verification.

Resolve visual and interaction decisions far enough that BUILD implements one approved Master Data management language while keeping resource-specific business logic explicit.
