# Agent Rules

Work from the current repository state.
Source, tests, configuration, package metadata, and provided design assets are the primary implementation context.
The active task prompt owns task-specific requirements.
Repository docs preserve stable project context and constraints.
Keep work focused.
Avoid unrelated refactoring, speculative abstractions, future work, unnecessary dependencies, and invented behavior.

## Documentation

Do not read repository or project docs by default.
Read docs only when the active prompt or PLAN requires them for discovery, or work cannot proceed safely without them.

Use the smallest relevant context set:
* product/domain context → `docs/PRODUCT.md`
* frontend structure/boundaries → `docs/ARCHITECTURE.md`
* UI/UX context → `docs/DESIGN.md`
* frontend/backend conventions → `docs/INTEGRATION.md`
* verification conventions → `docs/TESTING.md`

Do not read all project docs for every task.
Do not copy large documentation sections into `plan.md`.
Carry forward only task-critical rules and decisions.

## PLAN

PLAN owns discovery and task-specific decisions.
Inspect only task-relevant source, tests, configuration, package metadata, documentation, and design references.

For UI work, PLAN must use `docs/DESIGN.md` to identify the relevant
page-specific design reference.

Follow that reference into the approved prototype:
`design/ibom-core-prototype.html`

Inspect only the prototype regions routed by the relevant design reference.
Do not inspect the full prototype or unrelated pages by default.

Keep `plan.md` concise.
Prefer:
* Repository Findings
* Relevant Code
* Proposed Changes
* Implementation Context
* Prototype Route when UI fidelity depends on the prototype

Add Risks or Verification only when useful.

PLAN must carry forward the context BUILD needs.
Do not require BUILD to rediscover project documentation.

When UI work depends on the prototype, `plan.md` must identify the
smallest exact prototype regions BUILD should inspect.

Do not replace routed prototype evidence with prose alone.
BUILD must be able to revisit the same prototype regions during implementation.

Do not modify implementation files unless explicitly requested.

## BUILD

BUILD owns implementation, not discovery or review.

Read `plan.md` and the files directly affected by it before editing.
Do not repeat PLAN discovery.

Do not reread project documentation by default.
Use the task-specific rules and decisions already carried forward in `plan.md`.

For frontend UI work, the approved prototype is a required visual implementation
reference when `plan.md` provides a Prototype Route.

Inspect the exact prototype regions routed by `plan.md` before implementing
the corresponding UI.

This is not rediscovery.
Use those regions to preserve visual fidelity, composition, hierarchy,
spacing, and interaction behavior.

Do not scan the full prototype or inspect unrelated pages.
Expand beyond routed regions only when affected source requires it or `plan.md` explicitly allows it.

Expand other context only when:
* additional source is required to implement the change; or
* affected source directly contradicts `plan.md`.

Implement only the approved scope.
Add or update tests only when relevant to changed behavior and approved by the active prompt or `plan.md`.

Run only the focused verification required by the active prompt or `plan.md`.
Prefer the narrowest verification command that meaningfully covers the change.
Do not run verification before implementation unless reproducing a reported failure is required.

If focused verification passes:
* do not run broader verification;
* run one final `git status --short`;
* report and stop.

If focused verification fails:
* investigate only the task-related failure;
* make one corrective pass;
* rerun the same focused verification once;
* if it still fails, report the blocker and stop.

Do not by default:
* scan or rediscover the repository;
* reread project docs during BUILD;
* read the full design prototype;
* run the full frontend test suite or production build;
* start the development server or browser automation;
* investigate unrelated environment failures or dependency internals;
* perform REVIEW work.

Broader verification requires explicit justification in the active prompt or `plan.md`.

BUILD reports only:
* changes made;
* focused verification result;
* blockers or deviations.

## Git

Git inspection is phase-specific.
PLAN may inspect Git history only when materially required for discovery.

BUILD may run the final `git status --short` defined above.
Do not otherwise inspect Git history or diffs unless explicitly required by the active prompt or `plan.md`.

REVIEW may inspect the relevant Git diff and related read-only Git state.
Do not perform Git write operations unless explicitly requested.