# Testing

Frontend testing uses:

- Jasmine
- Karma
- Angular TestBed

Follow the repository's established test structure and conventions where they exist.

## Test Scope

Test behavior relevant to the active task.

Depending on the feature, consider:

- user-visible behavior;
- component state and interaction;
- form validation;
- routing and guards;
- HTTP/service behavior;
- loading, empty, error, and disabled states;
- accessibility state relevant to the interaction.

Exact test scenarios belong to the active task context.

## Component Tests

Use component tests for UI behavior such as:

- rendered state;
- user interaction;
- inputs and outputs;
- conditional content;
- form behavior;
- keyboard or accessibility state;
- independent component state.

Prefer testing observable behavior over internal implementation detail.

Use Angular `TestBed` where consistent with the existing project.

## Service and HTTP Tests

Use isolated tests for services and application logic when behavior does not require full component rendering.

For HTTP integration code, test request behavior relevant to the contract, such as:

- method and URL;
- request payload;
- headers or credentials when required;
- response mapping;
- error handling.

Mock external boundaries when the goal is to isolate frontend behavior.

Do not mock the behavior being tested.

## Routing and Guards

Test route or guard behavior when the active task changes navigation or access behavior.

Frontend guards are UX controls only; tests must not treat them as backend authorization guarantees.

## Regression

When fixing a meaningful bug, add or update a focused test that reproduces the failure when practical.

Keep tests close to the source they verify and follow existing `*.spec.ts` placement.

## Verification

Run the narrowest test command that meaningfully covers the changed behavior.

Broader verification is required only when the active task or `plan.md` justifies it.

## Boundary

This file defines stable frontend testing conventions, not feature-specific test cases.

Exact scenarios, mocks, fixtures, commands, and coverage expectations belong to the active task, `plan.md`, and current repository state.
