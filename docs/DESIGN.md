# Design

iBOM is an internal enterprise CV/Profile Management application.

The redesign goal is not to replace the product with a new visual identity or imitate another application. It is to make the existing iBOM experience feel substantially more refined, coherent, responsive, and intentionally designed while preserving its product behavior.

This document defines the stable design direction shared across the frontend.

Detailed composition and page-specific redesign decisions belong to individual redesign tasks.

---

## 1. Design North Star

The target experience is:

**clean + calm + precise + restrained + modern + trustworthy + slightly premium + interaction-aware**

The interface should feel simple without feeling empty, polished without becoming decorative, and structured without becoming rigid.

Functional richness is allowed.

Visual noise is not.

The interface should feel **alive, not animated**.

Every visual treatment and every noticeable animation must earn its place.

---

## 2. Redesign Scope

All product surfaces may be visually redesigned except the existing **HomePage**, which remains unchanged unless explicitly authorized by a future task.

This includes:

- authentication surfaces;
- application shell;
- dashboard;
- Profile management and Profile sections;
- CV Preview and Export;
- Member Management and search;
- Master Data;
- User Management;
- dialogs, overlays, tables, forms, filters, states, and supporting workflows.

Redesign does not imply rewriting every layout.

Preserve a composition when it already works.

Restructure only when the current composition materially limits clarity, usability, responsiveness, or visual quality.

---

## 3. Product Integrity

Visual redesign must not silently change product behavior.

Unless an active task explicitly authorizes otherwise, preserve:

- routes and navigation meaning;
- business workflows;
- backend contracts;
- validation rules;
- RBAC and permission visibility;
- sorting, filtering, and pagination semantics;
- confirmation requirements;
- form meaning and requirement-sensitive ordering;
- loading, empty, success, and error behavior;
- stable selectors and integration contracts where applicable.

The current production application is the primary source of truth for existing behavior.

---

## 4. Reference Philosophy

External products and design references are evidence of taste, not implementation targets.

Do not remake iBOM to look like SME Meeting Assistant, shadcn, Material examples, or another product.

When references are provided:

- identify why they feel good;
- extract hierarchy, spacing, geometry, restraint, interaction, and composition principles;
- translate those principles into iBOM;
- preserve iBOM's own product identity and workflows.

Reference implementation stacks must not drive architectural changes.

---

## 5. Visual Hierarchy

Users should quickly understand:

1. where they are;
2. the main task;
3. the primary action;
4. the current state or context;
5. supporting information;
6. secondary and destructive actions.

Prefer hierarchy through:

**position → grouping → spacing → typography → text contrast → surface → accent color**

Do not use color, borders, cards, or bold text as substitutes for weak hierarchy.

---

## 6. Visual Language

The product should feel:

- light without feeling empty;
- structured without feeling boxed;
- modern without chasing trends;
- polished without looking decorative;
- professional without feeling bureaucratic;
- dense enough for productive work without feeling cramped.

Avoid:

- generic card-heavy SaaS composition;
- excessive nested containers;
- strong borders around every region;
- decorative gradients;
- glassmorphism as a default;
- oversized radii;
- excessive shadows;
- giant application headings;
- decorative icon tiles everywhere;
- visually loud active states.

---

## 7. Typography

Typography should carry a meaningful part of the visual hierarchy.

Use one coherent, highly legible UI type system with strong Vietnamese support.

Keep the number of font families and weights limited.

Prefer restrained application typography:

- page titles are clear but not oversized;
- section titles remain visibly secondary;
- body text stays highly readable;
- labels use regular or medium emphasis;
- helper and metadata text are quieter but still readable;
- numerical metrics may use tabular figures where comparison benefits.

Do not use decorative typography throughout operational screens.

Exact font decisions may be refined by a dedicated redesign task.

---

## 8. Color

Structural UI should remain mostly neutral.

Brand and interaction colors should create emphasis, not dominate the entire interface.

Use one primary interaction accent consistently for important actions, focus emphasis, navigation state, and selected interactive elements where appropriate.

Semantic colors are reserved for real meaning:

- success;
- warning;
- information;
- destructive/error;
- domain status.

Prefer subtle tinted semantic surfaces over large saturated blocks for passive states.

Do not invent unrelated feature-specific color systems.

---

## 9. Geometry, Borders, and Elevation

Use a small, coherent radius vocabulary.

Controls should generally use restrained rounding.

Panels and dialogs may use slightly larger radii when appropriate.

Full pills are reserved for components whose semantics justify them.

Borders should be structural and low contrast.

Prefer:

- subtle separators;
- whitespace;
- alignment;
- restrained enclosure.

Avoid:

- heavy outlines;
- repeated boxed cells;
- border + shadow + tinted background on the same low-priority surface;
- deeply nested card structures.

Shadows represent real elevation and should primarily appear on floating layers such as menus, popovers, dialogs, and necessary sticky surfaces.

---

## 10. Surfaces and Cards

Cards are not the default answer to grouping.

Use a card when it represents:

- a distinct entity;
- an actionable unit;
- meaningful hierarchy;
- an interactive object;
- a genuinely separated information surface.

Otherwise prefer open composition, spacing, alignment, section headings, and dividers.

Flatten visual hierarchy when additional containers do not add meaning.

---

## 11. Application Shell

The authenticated shell should support the workflow without dominating it.

The redesign may introduce a refined **collapsible/expandable sidebar**.

Collapsed navigation must preserve location awareness and provide understandable access to navigation items.

Navigation should use:

- consistent icon size and weight;
- restrained active states;
- compact spacing;
- clear grouping;
- smooth but subtle state transitions.

Header and global chrome should remain compact.

Profile context and managed Member context must stay unmistakable.

The shell should feel stable while page content changes.

---

## 12. Actions and Controls

Do not render every action with equal emphasis.

Use a clear hierarchy:

1. primary;
2. secondary;
3. tertiary / ghost / text;
4. destructive when necessary.

A local task area should normally have one visually dominant primary action.

All important interactive controls should have coherent:

- default;
- hover;
- focus;
- pressed;
- selected;
- disabled;
- loading states.

Interactions should feel immediate and tactile without feeling playful.

---

## 13. Forms

Forms are a primary iBOM surface.

Keep labels persistent and visible.

Group fields by business meaning.

Use spacing and hierarchy before adding containers.

Prefer simple reading/editing flows over visually compressed multi-column layouts.

Use progressive disclosure for advanced or conditional content when appropriate.

Validation stays close to the affected field.

Saving, saved, failed, dirty, and duplicate-submit states should be clearly understandable.

---

## 14. Tables, Lists, and Filters

Tables remain first-class enterprise UI.

Do not replace useful tabular layouts with cards merely to appear modern.

Prefer:

- compact but readable row density;
- subtle headers;
- simple dividers;
- restrained hover and selected states;
- clear sorting;
- visually secondary pagination;
- filters subordinate to the result data.

Large filter areas should not become a second form page.

Progressively disclose advanced filters when useful.

---

## 15. Motion and Micro-interaction

Motion should improve:

- feedback;
- state understanding;
- spatial continuity;
- attention;
- perceived responsiveness.

Good candidates include:

- button feedback;
- menu and popover transitions;
- dialogs and overlays;
- sidebar collapse/expand;
- tabs and selection indicators;
- accordions;
- contextual insertion/removal;
- relevant loading and processing states;
- purposeful scroll or temporary target highlight.

Avoid motion that exists only to make the product look premium.

Do not default to:

- page-wide staggered entrances;
- animated cards on every load;
- parallax;
- bouncing elements;
- animated gradients;
- perpetual decorative loops;
- elaborate 3D interactions.

Prefer CSS transitions and lightweight platform capabilities.

Prefer `transform` and `opacity` for animation.

Respect `prefers-reduced-motion`.

---

## 16. Floating and Sticky UI

Floating or sticky controls may be introduced when they improve a real workflow.

Appropriate uses may include:

- contextual actions;
- persistent save/action areas;
- compact utilities;
- temporary workflow controls;
- overlays or navigation aids.

Floating UI must solve an interaction problem.

Do not add floating elements purely as decoration.

They must not obscure content, compete with primary actions, or create mobile usability issues.

---

## 17. Loading, Empty, Error, and Success

Non-happy-path states are part of the final design.

Use the smallest meaningful loading treatment for the affected region.

Prefer stable layouts and contextual feedback.

Differentiate between:

- no data;
- no search results;
- insufficient permission;
- loading;
- operation failure;
- unavailable data.

Success feedback should be calm and proportionate to the action.

Routine CRUD should not receive excessive celebration or animation.

---

## 18. Product UX Invariants

Redesign must preserve these product-level UX truths:

- selected Profile context is always unambiguous;
- Profile switching must not leak previous Profile data;
- all Profiles retain equivalent editing capability;
- completeness guides users but does not remove sections;
- empty sections expose an appropriate next action;
- Profile mutations invalidate Preview when required by product behavior;
- Export remains unavailable until the current Profile has a valid Preview when required;
- managed Member context stays explicit while navigating that Member's Profiles;
- generated CV content belongs only to the current Profile.

Visual changes must reinforce these invariants rather than obscure them.

---

## 19. Responsive Design

Responsive behavior must preserve task completion, not merely shrink desktop UI.

Layouts should intentionally adapt when space decreases.

Ensure:

- forms reduce columns before fields become cramped;
- action bars wrap intentionally;
- primary actions remain discoverable;
- dialogs fit smaller screens;
- tables use an appropriate responsive strategy;
- sidebar collapse preserves orientation;
- page-level horizontal overflow is avoided.

Do not reduce readable typography simply to make a layout fit.

---

## 20. Accessibility

Accessibility remains a design requirement.

Preserve or improve:

- visible keyboard focus;
- logical keyboard navigation;
- accessible labels;
- meaningful form errors;
- adequate contrast;
- reasonable interaction targets;
- correct dialog focus behavior;
- reduced-motion support;
- meaning beyond color alone.

Visual polish must never remove working accessibility behavior.

---

## 21. Performance

Performance is part of perceived design quality.

Do not add heavy dependencies for decorative effects.

Avoid expensive persistent blur, filter, shadow, scroll, or layout animation.

Large tables and data-heavy pages must remain responsive.

Immediate feedback may improve perceived responsiveness but must never delay actual work.

When visual polish and responsiveness conflict:

**responsiveness wins.**

---

## 22. Cross-product Consistency

Every redesigned page must still feel like the same product.

The same intent should normally use the same visual pattern.

The same semantic state should use the same treatment.

Shared primitives should be improved before repeatedly solving the same problem inside individual pages.

Local redesign must not create a competing design system.

At the same time, pages do not need identical compositions.

Their layout should reflect their actual workflow.

---

## 23. Design Authority

This document defines the stable shared design direction.

It intentionally does not specify exact page layouts, detailed measurements, exact component composition, or task-specific motion.

For redesign work, authority is:

1. active task requirements;
2. current product behavior and source;
3. this `DESIGN.md`;
4. applicable product and integration documentation;
5. supplied references as taste evidence.

Page-specific redesign decisions belong in the active task and `plan.md`.

There is no required prototype or page-specific design-reference routing.

Do not rediscover or reproduce obsolete prototype composition.

---

## 24. Final Design Principle

iBOM should not look refined because it contains more decoration.

It should feel refined because:

- hierarchy is obvious;
- spacing is deliberate;
- surfaces are quiet;
- controls respond naturally;
- states are complete;
- motion explains rather than performs;
- complex workflows remain understandable;
- the interface remains fast;
- every page feels like part of one product.

**The beauty of iBOM should come from simplicity, precision, consistency, and interaction quality.**