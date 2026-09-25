---
name: ibom-taste-skill
description: Visual redesign and UX-polish skill for the iBOM enterprise Angular application. Defines how to audit, redesign, and validate a clean, calm, precise, high-polish product UI without changing business behavior, over-animating the interface, or sacrificing performance.
---

# iBOM Taste Skill

> A redesign skill for an internal enterprise product, not a marketing website.
> The goal is not to make iBOM visually loud. The goal is to make a functionally rich product feel calm, precise, coherent, responsive, and intentionally designed.

---

## 0. CORE NORTH STAR

The target experience is:

**clean + calm + precise + restrained + modern + trustworthy + slightly premium + interaction-aware**

The target is NOT:

**flashy + decorative + cinematic + experimental + animation-heavy + visually loud**

The product may contain many features, forms, tables, filters, dialogs, dashboards, role-specific actions, and dense business data. That complexity is allowed.

The visual system must prevent that functional complexity from becoming visual complexity.

### 0.1 Five governing principles

1. **Functional richness is allowed. Visual noise is not.**
2. **Structure should stay quiet. Data and state may speak louder.**
3. **Clean does not mean empty. Clean means complexity is organized.**
4. **The interface should feel alive, not animated.**
5. **Every visual treatment and every animation must earn its cost.**

A redesign succeeds when users can complete the same work with less visual friction, clearer hierarchy, better feedback, and no meaningful performance regression.

---

## 1. SCOPE AND PRODUCT CONTEXT

This skill is specifically intended for iBOM, an internal enterprise CV/Profile Management application.

Typical product surfaces include:

- authentication and account flows;
- multi-profile management;
- Profile section editing;
- Member search and Member Profile management;
- CV preview and export;
- Master Data management;
- User management;
- dashboards;
- tables, filters, forms, dialogs, status indicators, and role-dependent actions.

### 1.1 Existing technical foundation

Preserve the existing frontend stack unless an explicit task authorizes a change:

- Angular 17+;
- Angular Material;
- Angular CDK where already applicable;
- Chart.js for charts;
- existing routing, forms, services, API integration, RBAC, and feature structure.

**Do not migrate iBOM to React, shadcn/ui, Tailwind, Fluent, Carbon, or another framework merely to obtain their visual style.**

References from shadcn and other ecosystems are visual and interaction references. Translate their principles into the existing Angular Material architecture.

### 1.2 Redesign is not a functional rewrite

Unless the task explicitly says otherwise, preserve:

- routes and navigation meaning;
- business workflows;
- backend contracts;
- validation rules;
- role permissions;
- form field meaning and ordering when requirement-sensitive;
- sorting and filtering semantics;
- confirmation requirements;
- loading, empty, success, and error behavior;
- accessibility behavior already working;
- analytics or stable selectors if they exist.

Visual modernization must not silently change product behavior.

---

## 2. READ THE PRODUCT BEFORE DESIGNING

Do not start redesigning from generic frontend taste.

Before touching code, infer the current context.

### 2.1 Design Read

State one short internal design read before implementation:

> Reading this as: an internal enterprise workflow for repeated daily use, with a clean and calm product language, moderate information density, restrained visual emphasis, and purposeful motion.

Adjust only when the surface genuinely differs.

Examples:

- Authentication: calmer, lower-density, slightly more expressive.
- Dashboard: moderately dense, scan-oriented, status-aware.
- Master Data: compact, predictable, table-first.
- Profile editor: form-heavy, progressive disclosure, low distraction.
- CV Preview: document-first, chrome-light.
- Member search: filter/result efficiency first.

### 2.2 Reference signals

When the user supplies references, screenshots, templates, or live demos:

1. do not copy components literally;
2. identify why the reference feels good;
3. extract spacing, hierarchy, geometry, color restraint, interaction, and composition logic;
4. translate that logic into iBOM's existing system;
5. reject reference details that hurt enterprise usability or performance.

A reference is evidence of taste, not a command to reproduce the same stack.

---

## 3. iBOM DESIGN DIALS

These dials guide global decisions. They are not scores for beauty.

### 3.1 Default configuration

- `VISUAL_VARIANCE: 4 / 10`
  - predictable enough for enterprise workflows;
  - not so rigid that every screen becomes the same rectangular template.

- `MOTION_INTENSITY: 4 / 10`
  - motion is present where it improves feedback, continuity, or understanding;
  - no animation quota and no requirement to animate every element.

- `INFORMATION_DENSITY: 6 / 10`
  - business information remains efficiently visible;
  - grouping and hierarchy reduce perceived complexity instead of hiding useful data.

- `INTERACTION_POLISH: 9 / 10`
  - every important action has clear hover, focus, pressed, loading, success, error, disabled, and selected behavior where applicable.

`PERFORMANCE_PRIORITY` is always effectively `10 / 10` and is not negotiable for decoration.

### 3.2 Surface presets

| Surface | Variance | Motion | Density | Interaction Polish |
|---|---:|---:|---:|---:|
| Authentication | 4-5 | 4 | 3-4 | 8 |
| Dashboard | 3-4 | 3-4 | 6-7 | 9 |
| Profile editor | 3-4 | 3-4 | 5-6 | 10 |
| Member search/results | 3 | 3-4 | 6-7 | 10 |
| Master Data | 2-3 | 2-3 | 7 | 9 |
| User Management | 2-3 | 2-3 | 7 | 10 |
| CV Preview/Export | 3-4 | 2-3 | 4-5 | 8 |
| Dialog/confirmation | 2 | 3-4 | 4 | 10 |

Do not force a surface to match a preset if its real interaction needs differ.

---

## 4. REDESIGN MODE

Every redesign task must be classified before implementation.

### 4.1 Preserve

Use when functionality and product structure are sound and the problem is visual quality.

Preserve IA and behavior. Improve tokens, hierarchy, spacing, surfaces, states, and motion.

This is the default mode for current iBOM visual hardening.

### 4.2 Targeted structural improvement

Use when an individual screen is functionally correct but the composition causes usability problems.

Examples:

- too many nested cards;
- a long editor that needs clearer grouping;
- actions scattered across the screen;
- filters that consume excessive vertical space;
- dialogs overloaded with fields;
- poor responsive collapse.

Change composition only as far as needed to improve the flow.

### 4.3 Overhaul

Use only when explicitly authorized.

An overhaul can replace the visual language substantially, but it still preserves product requirements unless the task says otherwise.

---

## 5. AUDIT BEFORE TOUCHING CODE

Use the sequence:

**Scan -> Diagnose -> Systemize -> Fix -> Verify**

Do not start by randomly restyling individual components.

### 5.1 Scan

Inspect the smallest representative set that reveals the system:

- application shell;
- theme/tokens/global styles;
- typography rules;
- button variants;
- inputs/selects/date controls;
- cards/surfaces;
- table/list patterns;
- dialogs;
- badges/status indicators;
- one form-heavy screen;
- one table-heavy screen;
- one dashboard;
- one complex detail/workspace screen if present.

### 5.2 Diagnose visual debt

Classify each issue under:

- hierarchy;
- spacing/rhythm;
- typography;
- color;
- surfaces/borders/shadows;
- geometry;
- alignment/grid;
- information density;
- component consistency;
- interaction states;
- motion;
- responsive behavior;
- accessibility;
- performance.

Do not report only "this looks old" or "this is not modern." State the mechanism causing the problem.

Bad diagnosis:

> The card looks ugly.

Good diagnosis:

> The card uses a dark border, visible shadow, large radius, and nested inner panel at the same hierarchy level. Four simultaneous enclosure signals make the surface heavier than its content warrants.

### 5.3 Look for systemic causes first

Before fixing 20 screens, determine whether the visual problem originates in 5 shared primitives.

Typical systemic causes:

- Material defaults left visually untouched;
- border color too strong;
- radius scale inconsistent;
- spacing tokens inconsistent;
- all text using only 400 and 700 weights;
- primary color overused;
- field height too large;
- selected state too saturated;
- card primitive too heavy;
- every action rendered as a filled button;
- status badges too loud;
- missing hover/focus/pressed states;
- inconsistent icon size/stroke;
- global layout gutters too tight or too loose.

Fix shared causes before local symptoms whenever safe.

---

## 6. VISUAL LANGUAGE

### 6.1 General atmosphere

The interface should feel:

- calm;
- light without feeling empty;
- structured without feeling boxed;
- modern without chasing trends;
- polished without looking decorative;
- professional without feeling bureaucratic;
- dense enough for work without feeling cramped.

Avoid the sensation of "Angular Material demo with business data inserted into it."

### 6.2 Visual hierarchy

At any moment the user should be able to identify:

1. where they are;
2. the main task on the screen;
3. the primary action;
4. current state/status;
5. supporting information;
6. secondary and destructive actions.

Do not make every label, heading, icon, button, and badge compete at the same contrast.

Use hierarchy in this order before adding decoration:

- position;
- grouping;
- spacing;
- type size;
- type weight;
- text color;
- surface treatment;
- accent color.

Color should not carry the entire hierarchy by itself.

---

## 7. SPACING AND RHYTHM

Spacing is one of the primary sources of perceived quality.

### 7.1 Use a coherent spacing system

Prefer a 4px-based scale such as:

`4, 8, 12, 16, 20, 24, 32, 40, 48`

Do not scatter arbitrary values unless optical adjustment requires it.

### 7.2 Enterprise spacing baseline

Suggested starting ranges, not hard constants:

- icon-text gap: `6-8px`;
- label-control gap: `6-8px`;
- related controls: `8-12px`;
- field groups: `16-24px`;
- card/panel internal padding: `16-24px`;
- major content groups: `24-32px`;
- page section separation: `24-40px` depending on density.

Do not apply marketing-page spacing such as 96-160px between normal application sections.

### 7.3 Rhythm rules

- related things stay closer than unrelated things;
- headings belong visually to the content below them;
- action bars should have stable spacing across modules;
- repeated list/table rows should share a consistent vertical rhythm;
- avoid both cramped forms and oversized empty gaps;
- use optical correction when mathematical centering looks wrong.

---

## 8. TYPOGRAPHY

Typography should do more hierarchy work so borders and color can do less.

### 8.1 Font philosophy

Do not ban a typeface simply because it is popular.

For iBOM, prioritize:

- high legibility;
- neutral but refined appearance;
- Vietnamese character support;
- fast loading;
- stable metrics;
- a limited number of weights.

If the existing font is visually adequate, keep it.

If the current Material-default typography significantly contributes to a generic feel, evaluate a single neutral UI family such as a good system stack, Inter, Geist, Manrope, or another project-approved sans family.

Do not introduce multiple display fonts for personality.

### 8.2 Hierarchy

Use a restrained hierarchy, for example:

- page title: strong but not oversized;
- section title: clearly lower than page title;
- card/panel title: compact and medium/semi-bold;
- body: regular;
- labels: regular/medium;
- metadata/helper text: smaller and muted;
- data metrics: tabular numbers where useful.

Avoid:

- giant 48px+ application page titles;
- bold text everywhere;
- uppercase labels everywhere;
- low-contrast helper text that becomes unreadable;
- too many unrelated font sizes.

### 8.3 Data typography

Use `font-variant-numeric: tabular-nums` where aligned numbers matter:

- counts;
- percentages;
- dates in columns;
- experience years;
- dashboard metrics.

---

## 9. COLOR SYSTEM

### 9.1 Quiet structure

Use neutral surfaces for structural UI.

The app shell, cards, inputs, tables, and navigation should not all compete with the primary brand color.

### 9.2 One interaction accent, semantic exceptions

Use one main interaction/brand accent consistently for:

- primary actions;
- active navigation;
- focus emphasis;
- selected interactive states where appropriate.

Enterprise semantic colors are explicit exceptions:

- success;
- warning;
- destructive/error;
- informational;
- domain statuses when required.

Semantic colors must communicate meaning, not decoration.

This is intentionally different from a marketing-page rule that permits only one accent color total.

### 9.3 Saturation discipline

Prefer tinted semantic surfaces rather than solid saturated fills for passive status.

Example direction:

- selected nav: light accent tint + stronger text/icon;
- success badge: pale semantic surface + readable text;
- destructive button: strong color only when the action genuinely deserves destructive prominence.

Avoid full-strength brand color on every active component.

### 9.4 Theme consistency

Do not randomly introduce dark panels into an otherwise light application merely to create contrast.

Use one coherent light/dark theme system.

If dark mode exists, visual hierarchy and semantic meaning must remain equivalent in both modes.

---

## 10. GEOMETRY

### 10.1 Radius system

Use a small coherent radius vocabulary.

Suggested baseline to evaluate during redesign:

- compact controls: approximately `6-8px`;
- normal panels/cards: approximately `8-12px`;
- dialogs/large containers: approximately `10-16px`;
- full pill: only where the component semantics justify it, such as compact status or segmented control.

Do not make every component pill-shaped.

Do not mix sharp cards, pill inputs, and giant rounded dialogs without a documented geometry rule.

### 10.2 Border discipline

Borders should be structural, not decorative.

Prefer:

- 1px low-contrast separators;
- spacing instead of enclosure where grouping is already obvious;
- a single divider between repeated rows rather than borders around every cell.

Avoid:

- dark gray outlines around every container;
- card within bordered card within bordered section;
- border + shadow + different background on every surface simultaneously.

### 10.3 Shadow discipline

Shadows should be subtle and mostly reserved for true elevation:

- menus;
- popovers;
- dialogs;
- floating/sticky layers when separation is necessary.

Normal page sections usually do not need visible drop shadows.

---

## 11. SURFACES AND CARDS

Cards are not the default answer to grouping.

Use a card when it communicates one of:

- a distinct entity;
- an actionable module;
- elevated hierarchy;
- a reusable information unit;
- a selected/interactive object.

Otherwise prefer:

- whitespace;
- alignment;
- simple section headers;
- subtle dividers;
- open grid composition.

### 11.1 Anti-nested-box rule

Avoid:

```text
page panel
  -> card
     -> inner card
        -> bordered subsection
           -> input group box
```

Flatten hierarchy whenever the outer containers do not provide new meaning.

One strong framing layer is usually better than four weak framing layers.

---

## 12. NAVIGATION AND APPLICATION SHELL

The shell should disappear into the workflow rather than dominate it.

### 12.1 Sidebar/navigation

- active state should be unmistakable but restrained;
- prefer subtle background tint, weight, and icon/text contrast over solid saturated blocks;
- keep icon size and stroke visually consistent;
- group navigation by product meaning, not decorative separators;
- do not use badges/dots unless they communicate actual state or count;
- collapse behavior should preserve location awareness.

### 12.2 Header/toolbars

- keep global chrome compact;
- do not repeat page title in multiple places without purpose;
- avoid excessive icon-only actions;
- secondary utilities should not compete with the screen's primary action;
- preserve stable alignment across modules.

---

## 13. BUTTONS AND ACTION HIERARCHY

Do not render every available action as an equally prominent button.

Use clear hierarchy:

1. primary action;
2. secondary action;
3. tertiary/ghost/text action;
4. destructive action only when needed.

### 13.1 Rules

- normally one visually dominant primary action per local task area;
- labels should remain on one line on normal desktop layouts;
- icon + label spacing must be consistent;
- active/pressed feedback should be immediate;
- disabled state must remain readable;
- destructive actions should not look like primary positive actions;
- icon-only buttons require clear tooltip/accessible label.

Avoid redundant intent such as two adjacent actions that mean essentially the same thing.

---

## 14. FORMS

Forms are one of iBOM's most important visual surfaces.

### 14.1 Form hierarchy

- keep labels persistent and visible;
- do not use placeholder text as the only label;
- validation stays near the affected field;
- group fields by business meaning;
- keep related fields in the same visual region;
- separate long forms into understandable sections;
- use progressive disclosure for advanced/conditional fields;
- do not create a card for every group by default.

### 14.2 Layout

- single-column is preferred for complex reading/editing flows;
- two-column can be used for naturally paired short fields when space allows;
- avoid four-column desktop forms merely to save vertical height;
- field widths should reflect expected content where practical;
- action placement should remain stable across similar editors.

### 14.3 Validation

Invalid state should combine enough signals without becoming visually aggressive:

- clear border/focus state;
- inline message;
- accessible relationship between field and error;
- preserved input value;
- no layout jump larger than necessary.

### 14.4 Dirty state and save flows

Provide obvious feedback for:

- editing;
- saving;
- saved;
- save failed;
- duplicate submission prevention;
- unsaved-change confirmation where required.

The user should never wonder whether Save registered.

---

## 15. TABLES AND DATA-DENSE LISTS

Tables are valid enterprise UI. Do not replace them with decorative cards merely to look modern.

### 15.1 Table quality rules

- column labels concise and readable;
- left-align text, right-align numeric values when comparison benefits;
- status columns remain compact;
- actions do not consume excessive width;
- row height should support scanning without feeling cramped;
- header differentiation should be subtle;
- use one divider system, not boxed cells everywhere;
- hover state should be subtle and useful;
- selected state must be visually distinct but not saturated;
- sorting direction must be clear;
- pagination and row count should be visually secondary to data;
- filters should not overpower the table.

### 15.2 Loading and empty table states

Avoid blank tables or a giant spinner detached from the final layout.

Prefer:

- skeleton rows when the structure is known;
- concise empty state within the table region;
- different copy for "no data exists" and "no results match filters".

### 15.3 Bulk actions

Show bulk actions when selection creates the need for them.

Do not permanently consume toolbar space with inactive bulk controls.

### 15.4 Responsive behavior

Do not blindly convert every table into cards on mobile.

Choose based on task priority:

- controlled horizontal scroll for genuinely tabular comparison;
- hide secondary columns behind details;
- stacked representation only when it preserves comprehension better.

---

## 16. FILTERS, SEARCH, AND TOOLBARS

Filtering should feel like an instrument panel, not a second form page.

- prioritize the most common search/filter controls;
- collapse advanced filters when the filter set is large;
- make active filters visible;
- clearing filters should be obvious when filters are active;
- do not render a colored chip for every filter unless chips materially help scanning;
- debounce search only where appropriate and never hide feedback during API wait;
- preserve filter state if current product behavior expects it.

Avoid a huge bordered filter card above every table.

---

## 17. STATUS, BADGES, AND SEMANTIC COLOR

Badges are for compact state communication, not decoration.

Use them for true states such as:

- ACTIVE / INACTIVE;
- processing states;
- completion states;
- role where compact role display is useful;
- domain-specific statuses.

Do not badge:

- ordinary labels;
- section headings;
- every metadata value;
- actions that should be buttons/links.

Passive badges should usually use tinted backgrounds and restrained contrast.

Semantic states must not rely on color alone when meaning is important.

---

## 18. DASHBOARDS AND CHARTS

A dashboard should optimize scan speed, not maximize card count.

### 18.1 Metrics

- metrics should have meaningful hierarchy;
- numbers should be visually stronger than labels;
- supporting descriptions should be quiet;
- do not give every metric a strong colored icon tile;
- avoid decorative trend arrows when no real trend exists.

### 18.2 Cards

Metric cards are valid, but avoid rows of visually identical boxes when grouping can be simplified.

Use card emphasis according to importance rather than making all modules equally loud.

### 18.3 Chart.js

- keep chart palettes restrained;
- use semantic/brand colors intentionally;
- reduce unnecessary grid lines;
- labels and legends must remain readable;
- do not animate complex charts repeatedly on every small state change;
- chart animation should not delay access to the data;
- respect reduced-motion settings when practical.

---

## 19. DIALOGS, DRAWERS, AND OVERLAYS

Choose the interaction container based on task complexity, not habit.

### 19.1 Dialog

Good for:

- confirmation;
- short focused creation/edit flows;
- blocking decisions;
- destructive actions requiring explicit acknowledgment.

### 19.2 Drawer / side panel

Consider for:

- detail inspection while preserving list context;
- medium-complexity editing where context behind the panel matters.

Do not introduce a new drawer paradigm solely for style if the current workflow is already coherent.

### 19.3 Full page

Prefer for long, multi-section editing where a dialog becomes cramped.

### 19.4 Overlay polish

- entrance/exit should be subtle;
- focus handling must remain correct;
- escape/backdrop behavior must follow product rules;
- dialog actions should have predictable alignment;
- destructive confirmation copy should be direct.

---

## 20. LOADING, EMPTY, ERROR, AND SUCCESS STATES

A polished product is defined heavily by non-happy-path states.

### 20.1 Loading

Use the smallest useful loading treatment.

Preferred order:

1. immediate local pressed/loading feedback;
2. skeleton where layout is known and wait is visible;
3. compact progress indicator when skeleton is inappropriate;
4. full-page loading only for genuinely page-level waits.

Avoid replacing the whole page with a spinner for a small async region.

### 20.2 Empty

Differentiate:

- no data exists yet;
- no search/filter results;
- insufficient permission;
- data unavailable due to error.

An empty state should explain the state and provide the next useful action when one exists.

### 20.3 Error

Use the most local meaningful error level:

- field error for invalid input;
- section alert for local workflow failure;
- toast/snackbar for transient operation feedback;
- page-level error for page-level failure.

Do not use generic "Oops!" language.

### 20.4 Success

Success feedback should be calm and brief.

Do not celebrate routine CRUD operations with excessive animation.

---

## 21. MOTION AND MICRO-INTERACTION

Motion is welcome when it improves UX.

Motion is not welcome merely because a static screen feels visually plain.

### 21.1 Motion quality test

Every non-trivial animation must answer at least one of these:

1. Does it explain a state change?
2. Does it provide useful feedback?
3. Does it preserve spatial continuity?
4. Does it guide attention to something important?
5. Does it improve perceived responsiveness without harming actual responsiveness?

If none apply, remove it.

### 21.2 Motion categories

#### Encouraged

- button pressed/loading feedback;
- menu/popover/dialog enter and exit;
- sidebar collapse/expand;
- accordion expansion;
- tab/selection indicator movement;
- list item insertion/removal when it clarifies change;
- smooth scroll to a user-requested target;
- temporary highlight of the target after navigation;
- skeleton/progress for real asynchronous work;
- compact processing indicators for real background states.

#### Contextual

- route transitions;
- dashboard chart entry;
- reorder animations;
- panel resize transitions;
- first-load reveal of a major region.

Use only when the added motion improves understanding or perceived quality.

#### Avoid by default

- scroll-reveal on every card;
- stagger animation on large tables;
- parallax in business workflows;
- perpetual floating icons;
- animated gradients;
- background particles;
- cursor-follow effects;
- bouncing icons;
- infinite decorative marquees;
- 3D hover physics;
- animation on every navigation event.

### 21.3 Duration guidance

Suggested starting points:

- hover/focus color changes: `120-180ms`;
- pressed feedback: immediate to `120ms`;
- small popover/menu: `140-200ms`;
- panel/dialog transition: `180-260ms`;
- accordion/layout transition: `180-300ms`.

Avoid long 500-800ms transitions for routine enterprise interactions.

### 21.4 Easing

Prefer natural deceleration and restrained spring-like response where it helps.

Do not make basic CRUD controls feel elastic or playful.

### 21.5 Implementation priority

Use the lightest mechanism that achieves the UX goal:

1. CSS transitions/animations;
2. existing Angular/Material/CDK capabilities;
3. Angular animation coordination only when genuinely needed;
4. a new animation dependency only with clear product value and measured cost.

Do not add a large motion library for effects that can be achieved cleanly with CSS.

### 21.6 GPU-safe motion

Prefer `transform` and `opacity`.

Avoid animating layout-heavy properties such as:

- `top`;
- `left`;
- `width`;
- `height`;
- large filter/blur regions.

Use `will-change` sparingly.

### 21.7 Reduced motion

Respect `prefers-reduced-motion`.

Functional state changes must remain understandable with animation removed.

### 21.8 Continuous motion rule

Continuous/infinite animation is allowed only when it communicates a genuinely continuous state, for example:

- recording;
- processing;
- loading;
- active live state.

Even then, keep it visually restrained.

---

## 22. PERFORMANCE GUARDRAILS

Performance is part of visual quality.

A beautiful interaction that causes jank is a failed interaction.

### 22.1 Hard rules

- do not add heavy dependencies for decorative effects;
- do not animate large scrolling containers with blur/filter;
- avoid repeated box-shadow animation;
- avoid continuous JavaScript scroll handlers for visual effects;
- do not trigger Angular change detection on every scroll/pointer frame for decoration;
- lazy-load heavy non-critical assets/features where architecture supports it;
- reserve layout space to prevent visual jumping;
- keep large tables efficient;
- do not stagger hundreds of rows;
- avoid expensive shadows/filters repeated across many list items.

### 22.2 Performance decision rule

When choosing between visual polish and responsiveness:

**responsiveness wins.**

When two implementations look equally good:

**the lighter implementation wins.**

When an animation improves UX but has measurable cost:

**reduce scope before removing the useful feedback entirely.**

### 22.3 Perceived vs actual performance

Use immediate feedback to improve perceived responsiveness, but never use animation to hide a slow interaction.

Good sequence:

```text
click
-> immediate pressed/loading state
-> asynchronous work
-> stable layout
-> success/error feedback
```

Bad sequence:

```text
click
-> decorative 500ms animation
-> request starts late
-> layout shifts
-> user waits longer
```

---

## 23. ANGULAR MATERIAL ADAPTATION RULES

Angular Material is the foundation, not the final visual identity.

### 23.1 Reuse before replacing

Prefer adapting existing Material/CDK primitives for:

- accessibility;
- focus management;
- overlays;
- keyboard interactions;
- dialogs;
- forms;
- tables;
- menus;
- tooltips.

Do not build a parallel component library without a concrete need.

### 23.2 Theme intentionally

Centralize visual decisions through the project's theming/token layer where possible:

- colors;
- typography;
- radius;
- density;
- control sizing;
- elevation;
- spacing conventions.

Avoid large amounts of screen-specific CSS that fight shared primitives.

### 23.3 Avoid brittle internals

Prefer documented Angular Material theming APIs, tokens, component inputs, wrapper classes, and stable selectors.

Avoid depending heavily on private/internal MDC class structure solely to force a visual effect.

### 23.4 Material default tell

A component is not finished merely because it is a working Material component.

Audit whether default Material choices create unnecessary weight:

- filled/outlined field treatment;
- control height;
- strong ripple/overlay;
- default elevation;
- typography;
- tab density;
- table spacing;
- button emphasis;
- active navigation treatment.

Customize coherently rather than applying one-off overrides per screen.

---

## 24. ICONOGRAPHY

Use one coherent icon family already compatible with the project unless there is a strong reason to change.

Rules:

- consistent visual weight;
- consistent default size;
- no mixing multiple icon styles casually;
- icons supplement labels, not replace understandable language;
- avoid decorative icons in every heading/card;
- avoid a colored background tile behind every icon;
- icon-only actions need tooltip/accessibility labels.

Do not hand-roll decorative SVGs when an existing icon is sufficient.

---

## 25. RESPONSIVE DESIGN

Responsive behavior must preserve task completion, not simply shrink desktop UI.

Test representative widths such as:

- `1440px` desktop;
- `1280px` standard laptop;
- `1024px` small laptop/tablet landscape;
- `768px` tablet;
- `390px` mobile when the product is expected to support mobile use.

### 25.1 Collapse rules

- multi-column forms reduce columns before fields become cramped;
- action bars wrap intentionally, not accidentally;
- primary action remains discoverable;
- dialogs fit smaller viewports;
- tables use a deliberate mobile strategy;
- sidebars collapse without losing location awareness;
- no horizontal page overflow;
- long labels do not collide with controls.

Do not solve mobile by reducing body text below readable size.

---

## 26. ACCESSIBILITY

Accessibility is a quality constraint, not a visual compromise.

Require:

- WCAG AA text/control contrast where applicable;
- visible keyboard focus;
- logical tab order;
- semantic labels;
- accessible field errors;
- no meaning by color alone;
- reasonable touch target size;
- reduced-motion support;
- usable zoom/reflow;
- correct dialog focus trapping/restoration;
- status updates announced when necessary.

Do not remove accessible Material behavior while restyling components.

---

## 27. PROGRESSIVE DISCLOSURE AND COMPLEXITY MANAGEMENT

Do not reduce product complexity by hiding necessary information permanently.

Reduce **perceived complexity** by presenting information when it becomes relevant.

Useful techniques:

- tabs for distinct work modes;
- expandable advanced filters;
- accordions for secondary detail;
- drawers for contextual inspection;
- inline edit for small changes;
- dedicated page for large editing tasks;
- summary first, details on demand;
- contextual actions instead of giant permanent toolbars.

Avoid nesting every disclosure mechanism together.

The user should always understand where information went and how to access it.

---

## 28. ANTI-PATTERNS AND VISUAL TELLS

Treat these as likely redesign findings, not universal laws. Keep them only when product context clearly justifies them.

### 28.1 Structure

- every section wrapped in a card;
- cards inside cards inside cards;
- border + shadow + tinted background on the same low-priority block;
- identical card grids everywhere;
- giant header areas consuming useful workspace;
- excessive empty space copied from marketing sites;
- sidebar/header visually heavier than the task content;
- toolbars full of always-visible secondary actions.

### 28.2 Color

- primary brand color used for every active state;
- saturated selected rows;
- decorative gradients;
- generic purple/blue AI glow;
- random colors unrelated to semantics;
- multiple competing accent colors;
- full-color icon tiles everywhere.

### 28.3 Typography

- giant page titles;
- bold text everywhere;
- only regular and bold weights;
- uppercase micro-labels everywhere;
- too many type sizes;
- faint gray text that reduces readability;
- decorative font pairing in utility screens.

### 28.4 Components

- all actions are filled buttons;
- pills used for ordinary text;
- badges for non-status content;
- icon-only actions without clear meaning;
- circular spinner for every loading case;
- modal for every edit;
- heavy default Material appearance left untouched;
- excessive ripple/hover decoration;
- every list row has a full bounding border.

### 28.5 Motion

- animation exists only to make the app "feel premium";
- every card animates on load;
- every screen fades/slides on navigation;
- table rows stagger in;
- perpetual decoration loops;
- parallax inside business workflows;
- heavy animation library added for trivial effects;
- animation reduces responsiveness or causes layout shift.

### 28.6 Content

- vague UI copy;
- success text louder than the action deserves;
- generic "Oops" error language;
- duplicated explanatory text;
- metadata displayed only because data exists, not because users need it.

---

## 29. WHAT NOT TO COPY FROM TASTE-SKILL REFERENCES

The source references contain excellent ideas but are not all suitable for iBOM.

Do NOT import the following as default iBOM rules:

- Awwwards-level asymmetry;
- cinematic scroll storytelling;
- GSAP pinning/horizontal scroll hijacks;
- perpetual micro-animation loops;
- "every section must animate" rules;
- huge marketing whitespace;
- oversized hero typography;
- forced bento layouts;
- double-bezel nesting on every container;
- giant rounded cards;
- decorative grain/noise;
- glassmorphism as a default;
- parallax stacks;
- custom cursor effects;
- font bans based purely on AI trend avoidance;
- requirement that every section use a different layout family;
- replacing tables with cards simply to look less generic.

These patterns may be appropriate for marketing pages, not repeated enterprise workflows.

---

## 30. MODERNIZATION LEVERS

When redesigning iBOM, apply changes in this order unless evidence suggests otherwise.

### Level 1 - Foundation

1. typography hierarchy;
2. neutral/background palette cleanup;
3. spacing scale and page gutters;
4. border/radius/elevation system;
5. icon scale and weight.

### Level 2 - Shared interaction primitives

6. buttons and action hierarchy;
7. inputs/selects/date controls;
8. tabs/navigation selected states;
9. badges/status;
10. focus/hover/pressed/disabled states.

### Level 3 - Shared complex components

11. tables and filters;
12. dialogs/drawers;
13. loading/empty/error/success states;
14. dashboard cards and charts;
15. shared page headers/action bars.

### Level 4 - Product composition

16. form section composition;
17. progressive disclosure;
18. high-complexity workspace/detail layouts;
19. module-specific responsive behavior.

### Level 5 - Motion polish

20. purposeful micro-interactions;
21. spatial transitions where they improve understanding;
22. perceived-performance feedback;
23. reduced-motion verification;
24. performance measurement.

Do not begin with Level 5 while Levels 1-2 are inconsistent.

---

## 31. REDESIGN EXECUTION WORKFLOW

For a full iBOM visual-hardening initiative, prefer this sequence:

```text
1. Audit representative screens
        ↓
2. Build visual-debt map
        ↓
3. Define/refine design tokens
        ↓
4. Polish shared primitives
        ↓
5. Polish application shell
        ↓
6. Validate one representative form-heavy screen
        ↓
7. Validate one representative table-heavy screen
        ↓
8. Validate dashboard/detail workspace
        ↓
9. Propagate patterns across modules
        ↓
10. Add purposeful motion polish
        ↓
11. Responsive + accessibility audit
        ↓
12. Performance verification
        ↓
13. Final cross-screen consistency pass
```

Do not redesign each module independently before the shared visual foundation stabilizes.

---

## 32. AUDIT OUTPUT CONTRACT

When asked to audit existing iBOM UI, do not return a subjective beauty score as the main result.

Return findings with:

- **location/surface**;
- **issue**;
- **why it harms UX or visual quality**;
- **systemic vs local**;
- **severity**;
- **recommended direction**;
- **risk to functionality/performance**.

Severity:

- `High` - materially harms comprehension, workflow, accessibility, consistency, or performance;
- `Medium` - noticeably harms polish or scan efficiency and recurs enough to matter;
- `Low` - local refinement with limited user impact.

Do not label subjective style differences as High unless they create real usability/system inconsistency.

### 32.1 Audit priority

Prefer fixes with high cross-product leverage:

> one token/component fix affecting 30 screens > 30 isolated CSS patches.

---

## 33. IMPLEMENTATION DISCIPLINE

- Work from the current repository state.
- Reuse before replacing.
- Keep changes reviewable.
- Do not mix redesign with unrelated refactoring.
- Do not invent product behavior to make a composition prettier.
- Do not add dependencies without checking existing package metadata and demonstrating need.
- Preserve tests and behavior.
- When a visual fix requires structural markup changes, keep semantic meaning and interaction contracts stable.
- If an existing pattern is visually imperfect but requirement-critical, preserve behavior and restyle around it.

---

## 34. PRE-FLIGHT CHECK

Before calling a redesigned surface complete, every relevant item must be checked honestly.

### Product integrity

- [ ] Existing business flow still works.
- [ ] Backend/API behavior is unchanged unless explicitly in scope.
- [ ] RBAC and permission visibility remain correct.
- [ ] Validation semantics remain correct.
- [ ] Sorting/filtering/pagination behavior remains correct.
- [ ] Requirement-sensitive confirmations remain present.

### Visual hierarchy

- [ ] Current location is clear.
- [ ] Primary task is visually obvious.
- [ ] Primary action is distinguishable from secondary actions.
- [ ] Supporting metadata is quieter than primary content.
- [ ] No unnecessary competing focal points exist.

### Spacing and alignment

- [ ] Screen follows a coherent spacing scale.
- [ ] Related content is grouped by proximity.
- [ ] Major sections have consistent rhythm.
- [ ] Buttons, labels, fields, and table content align cleanly.
- [ ] No accidental one-off gaps or optical misalignment remain.

### Typography

- [ ] Page/section/component hierarchy is clearly differentiated.
- [ ] Bold is not overused.
- [ ] Secondary text remains readable.
- [ ] Numeric comparison uses tabular figures where useful.
- [ ] No unnecessary decorative font treatment appears in utility screens.

### Color

- [ ] Structural surfaces are quiet.
- [ ] Main interaction accent is consistent.
- [ ] Semantic colors communicate real meaning.
- [ ] Selected states are visible without excessive saturation.
- [ ] No random decorative colors compete with data.

### Geometry and surfaces

- [ ] Radius system is coherent.
- [ ] Borders are low-contrast and purposeful.
- [ ] Shadows correspond to real elevation.
- [ ] Nested boxes were reduced where possible.
- [ ] Cards exist because grouping/elevation is useful, not because Card is the default component.

### Components and states

- [ ] Hover state exists where mouse interaction benefits.
- [ ] Visible focus state exists.
- [ ] Pressed/active state gives immediate feedback.
- [ ] Disabled state remains understandable.
- [ ] Loading state is contextual.
- [ ] Empty state is useful.
- [ ] Error state appears at the appropriate level.
- [ ] Success feedback is present but restrained.

### Forms

- [ ] Labels remain visible.
- [ ] Field errors are inline and accessible.
- [ ] Field grouping reflects business meaning.
- [ ] Form density is comfortable for repeated work.
- [ ] Save state/duplicate-submit prevention is clear.
- [ ] Unsaved-change behavior is preserved where required.

### Tables and lists

- [ ] Table remains a table when comparison benefits from tabular layout.
- [ ] Row density supports scanning.
- [ ] Filters are subordinate to results.
- [ ] Selected/hover states are restrained.
- [ ] Long lists do not have excessive bounding boxes.
- [ ] Empty vs no-results states are distinct.

### Motion

- [ ] Every noticeable animation has a UX justification.
- [ ] Routine interactions are not slowed by animation.
- [ ] No animation exists only for spectacle.
- [ ] Continuous animation represents a real continuous state.
- [ ] Large lists/tables do not use staggered decorative motion.
- [ ] Transform/opacity are preferred for animation.
- [ ] Reduced motion is supported.

### Performance

- [ ] No heavy animation dependency was added without strong need.
- [ ] No scrolling container uses expensive persistent blur/filter effects.
- [ ] No visual effect causes obvious jank.
- [ ] No animation causes layout shift.
- [ ] Large data surfaces remain responsive.
- [ ] Perceived responsiveness is improved without delaying actual work.

### Responsive and accessibility

- [ ] Key target widths were tested.
- [ ] No page-level horizontal overflow exists.
- [ ] Controls remain usable on smaller screens.
- [ ] Keyboard navigation works.
- [ ] Focus management works in overlays.
- [ ] Contrast is sufficient.
- [ ] Meaning is not conveyed by color alone.

### Cross-screen consistency

- [ ] The screen looks like the same product as other redesigned modules.
- [ ] Same semantic state uses the same visual treatment.
- [ ] Same component intent uses the same component pattern.
- [ ] No local redesign introduced a competing design system.

If a relevant checkbox cannot be honestly passed, the surface is not finished.

---

## 35. SOURCE DNA AND ADAPTATION NOTES

This skill deliberately combines ideas from multiple references without copying their implementation stack.

### Taste Skill v2

Useful logic retained:

- brief inference before design;
- context over model defaults;
- dial-driven decisions;
- audit-first redesign;
- design-system honesty;
- full interaction states;
- color/shape consistency;
- cards only when hierarchy warrants them;
- performance and reduced-motion guardrails;
- mechanical pre-flight validation;
- explicit anti-patterns instead of vague "make it beautiful" guidance.

Adapted for iBOM:

- dashboard/product UI is the main scope rather than out-of-scope;
- semantic status colors are allowed in addition to the main accent;
- tables/forms are first-class design surfaces;
- variance and motion defaults are lower;
- enterprise density is intentionally higher.

### Taste Skill redesign-skill

Useful logic retained:

- `Scan -> Diagnose -> Fix` mindset;
- typography, surfaces, layout, states, content, components, and code-quality audit;
- high-impact modernization before risky restructuring;
- work with the existing stack;
- do not rewrite from scratch.

### Taste Skill minimalist-skill

Useful ideas retained selectively:

- low-contrast borders;
- restrained shadows;
- color scarcity;
- subtle motion;
- transform/opacity performance discipline;
- typography and spacing as primary polish tools.

Not retained as hard rules:

- editorial serif direction;
- huge marketing whitespace;
- animation on every content block.

### Taste Skill image-to-code

Useful logic retained:

- analyze visual hierarchy systematically rather than by vague vibe;
- anti-nested-box discipline;
- reduce micro-UI clutter;
- inspect typography, spacing, button hierarchy, color, radii, and rhythm as a system.

The mandatory image-generation workflow is not required for ordinary iBOM implementation tasks.

### Taste Skill soft-skill / stitch design

Useful logic retained:

- GPU-safe animation;
- blur constraints;
- z-index discipline;
- tactile pressed feedback;
- consistent visual system.

Explicitly rejected as iBOM defaults:

- perpetual micro-loops;
- every-element entrance animation;
- double-bezel containers everywhere;
- cinematic choreography;
- oversized radii and marketing composition rules.

### Shadcn Space

Reference principles retained:

- less, but better;
- consistency over novelty;
- UI should feel calm, not noisy;
- spacing systems, typography hierarchy, visual balance, and composition matter more than decoration;
- motion should enhance interaction/feedback without compromising structure, accessibility, or maintainability.

### shadcn-admin

Used as a reference for:

- clean application shell;
- compact controls;
- restrained surfaces;
- practical dashboard composition;
- reusable component language.

Do not copy its React/shadcn implementation into Angular.

### SME Meeting Assistant

Used as a complex-product reference showing that a product can contain many workflows, states, tabs, live/processing experiences, data, and AI features while retaining a quiet structural language.

Important lesson:

> Product complexity does not require visual complexity.

### UIAble / Shadcn UI Kit / shadcn.io / HTMLRev

Use these as a pattern library and exploration corpus:

- compare multiple solutions to the same component problem;
- study spacing, composition, variants, and edge states;
- borrow principles, not exact code or visual identity;
- HTMLRev is a broad catalog, not a single design standard.

---

## 36. FINAL DESIGN STATEMENT

The iBOM redesign should not try to impress users before helping them work.

It should feel refined because:

- hierarchy is obvious;
- spacing is deliberate;
- surfaces are quiet;
- controls are responsive;
- states are complete;
- motion explains rather than performs;
- dense workflows remain understandable;
- the system stays fast;
- every module feels like one product.

**The interface should feel alive, not animated.**

**Functional richness is allowed. Visual noise is not.**

**If polish makes the product slower, harder to understand, or less predictable, it is not polish.**
