# Agent Rules

Work from the current repository state.
Source, tests, configuration, package metadata, and provided design assets are the primary implementation context.
The active task prompt owns task-specific requirements.
Repository docs preserve stable project context and constraints.
Keep work focused.
Avoid unrelated refactoring, speculative abstractions, future work, unnecessary dependencies, and invented behavior.

## BUILD

If focused verification passes:
* do not run broader verification;
* run one final `git status --short`;
* report and stop.

If focused verification fails:
* investigate only the task-related failure;
* make one corrective pass;
* rerun the same focused verification once;
* if it still fails, report the blocker and stop.

BUILD reports only:
* changes made;
* focused verification result;
* blockers or deviations.

## Git

Git inspection is phase-specific.
PLAN may inspect Git history only when materially required for discovery.

BUILD may run the final `git status --short` defined above.

REVIEW may inspect the relevant Git diff and related read-only Git state.
Do not perform Git write operations unless explicitly requested.
