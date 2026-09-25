# Task 03 — Authentication & Account Experience

## Objective

Redesign iBOM authentication and account surfaces into one coherent form and interaction system while preserving the distinct role of authentication as the product entry experience.

Login, Registration, Forgot Password / recovery, and authenticated Account Settings should feel like parts of the same product rather than separately styled forms.

## Scope

Redesign:

- Login;
- Registration;
- Forgot Password and recovery states;
- Account Settings content;
- shared authentication layout/presentation patterns where current duplication justifies them;
- authentication and account form presentation;
- password reveal and password requirement presentation;
- validation, loading, success, warning, and failure feedback;
- responsive auth composition.

Use the shared tokens, primitives, states, accessibility, and motion foundation established by Task 01.

## Design Intent

Authentication may remain more expressive than operational workspace screens, but it must still follow the iBOM design grammar.

Preserve the existing split-layout concept where it remains useful rather than replacing it with a generic centered login card.

Refine the branded region so it supports rather than competes with the form:

- control headline scale and line length;
- reduce unnecessary decorative dominance;
- preserve a restrained brand moment;
- prioritize the actual authentication task.

Typography, controls, validation, feedback, and actions should use the same shared roles and interaction language as the rest of iBOM.

Serif or other expressive typography may remain as a controlled brand accent, not as the default language for operational form content.

Form quality takes priority over decoration.

Password-related interactions should behave and appear consistently across applicable surfaces.

Motion should remain local, short, and functional. Do not add decorative form entrances or staged animations.

## Account Settings

Account Settings remains an authenticated feature page inside the Application Shell.

Do not apply the guest authentication split layout to it.

Its content should adopt the same field, password, validation, feedback, and action language as Login/Registration/Recovery while retaining normal authenticated-page composition.

Task 02 continues to own the surrounding shell, account menu, and navigation.

## Functional Invariants

Preserve:

- authentication API behavior;
- authentication/session state;
- guest and authenticated guards;
- registration workflow and validation rules;
- password reset/recovery semantics;
- password requirement rules;
- successful-navigation behavior;
- Account Settings update behavior;
- existing browser autofill and password-manager compatibility where supported.

HomePage remains untouched.

## Boundaries

Do not:

- change authentication or account business logic;
- change backend contracts;
- modify route semantics or guards;
- redesign the authenticated Application Shell;
- introduce a generic Material visual identity;
- create page-specific replacements for Task 01 shared controls or feedback patterns;
- add new authentication steps or fields.

Shared auth composition may be extracted where it meaningfully reduces duplication, but do not create abstractions only for architectural symmetry.

## Discovery

Start from:

- Login, Registration, Forgot Password/recovery, and Account Settings implementations and focused tests;
- current authentication routes, guards, validators, and service-facing UI contracts;
- repeated auth layout, form, password, validation, and feedback styling;
- Task 01 shared field, action, feedback, Material/CDK, accessibility, and motion foundations;
- the shell/page-content contract relevant to Account Settings.

Inspect services and validators only far enough to preserve existing UI-facing behavior.

Use `docs/DESIGN.md` as the stable shared design authority.

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

- shared versus page-specific auth composition;
- Login/Registration/Recovery visual relationship;
- responsive split-layout behavior;
- typography and branded-region treatment;
- shared form and password interaction adoption;
- validation/loading/success/error behavior;
- Account Settings alignment without changing shell ownership;
- Material/CDK usage where justified;
- legacy auth styling migration;
- accessibility, autofill, keyboard, and reduced-motion behavior;
- focused verification.

Resolve visual, interaction, and responsive decisions far enough that BUILD implements an approved authentication experience rather than redesigning during implementation.
