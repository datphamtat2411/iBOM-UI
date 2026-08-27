# Architecture

## Frontend Shape

iBOM UI is an Angular frontend organized around business modules using standalone Angular components.

Application-level configuration stays at the root.
Business implementation is grouped by feature under `features/`.

## Business Modules

Main frontend areas include:

```text
Home
Auth / Account
Dashboard
Profile
CV
Master Data
Member Management
User Management
```
Business UI follows a **module-first structure**.

Each feature owns its pages, components, services, models, state, and routes when those concerns are feature-specific.

Example:

```text
src/app
├── core
│
├── features
│   ├── home
│   │   ├── home.component.*
│   │   └── profile-card
│   ├── auth
│   │   ├── pages
│   │   ├── components
│   │   ├── models
│   │   └── services
│   ├── profile
│   │   ├── pages
│   │   ├── components
│   │   ├── models
│   │   ├── services
│   │   └── profile.routes.ts
│   ├── ...
│   ├── ...
│
├── shared/
│
├── models/
│
├── app.component.ts
├── app.config.ts
└── app.routes.ts
```

Create feature subfolders only when needed.
Do not force identical folder trees on small features.

## Module Boundaries

Feature-specific pages, components, services, models, and state stay inside their owning feature.

Do not place feature-specific models or services in root-level shared folders.

`shared/` is reserved for UI primitives, directives, pipes, and utilities genuinely reused across features.

`core/` is reserved for application-wide infrastructure such as authentication context, HTTP behavior, and route guards.

Business behavior must not be moved into `shared/` or `core/` only for reuse convenience.

When features collaborate, prefer explicit public services or shared application context instead of reaching into another feature's internal implementation.

## Angular Boundaries

Standalone components are the default.

Top-level routing is composed from `app.routes.ts`.
Prefer lazy loading for routed feature entry points.
Feature-specific routes may remain inside the owning feature when useful.

Route guards control frontend navigation and UX only; backend authorization remains the final authority.

## State

Keep state with the smallest owner that needs it.

Component-only state stays local.
Feature workflow state stays inside the feature.
Only genuinely application-wide context belongs in `core/`.

Do not introduce a global state library without a demonstrated project need.

## Boundary

This file defines stable frontend architecture and ownership rules.

Exact components, subfolders, services, state mechanisms, and route structure remain task-specific unless established by the current repository.

Create abstractions only when the implemented feature requires them.
