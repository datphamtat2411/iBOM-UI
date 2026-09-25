# Design

iBOM is an internal enterprise CV/Profile Management application.

The redesign goal is to make the existing product substantially more refined, coherent, responsive, and intentionally designed while preserving its business behavior.

This document defines only the **stable design rules shared across redesign tasks**.

Detailed page composition, workflow-specific interaction, and task-specific visual decisions belong to the active Task Specification and `plan.md`.

---

## 1. Design North Star

The target experience is:

**clean + calm + precise + restrained + modern + trustworthy + slightly premium + interaction-aware**

Functional richness is allowed.

Visual noise is not.

The interface should feel simple without feeling empty, structured without feeling boxed, and polished without becoming decorative.

The interface should feel **alive, not animated**.

Every visual treatment and noticeable animation must earn its place.

---

## 2. Redesign Scope

All product surfaces may be redesigned except the existing **HomePage**, which remains unchanged unless explicitly authorized.

Redesign is not a functional rewrite.

Preserve working compositions when they already serve the workflow well.

Restructure only when doing so materially improves clarity, usability, responsiveness, interaction quality, or visual coherence.

---

## 3. Product Integrity

Visual redesign must not silently change product behavior.

Unless explicitly authorized by the active task, preserve:

- routes and navigation meaning;
- business workflows;
- backend contracts;
- validation and confirmation rules;
- RBAC and permission visibility;
- sorting, filtering, and pagination semantics;
- requirement-sensitive form meaning;
- integration and stable behavior relied on by the product.

The current production application is the source of truth for existing behavior.

---

## 4. Reference Philosophy

External products and design systems are **taste and system references**, not implementation targets.

Learn from their strengths in:

- hierarchy;
- spacing;
- typography;
- composition;
- density;
- interaction states;
- motion;
- restraint;
- component consistency.

Do not clone another product or allow a reference library to become iBOM's visual identity.

Translate useful principles into iBOM's own workflows and character.

---

## 5. Shared Design Grammar

The redesign is governed by:

**tokens + spacing + typography + composition + restraint + states + motion + consistency**

Different workflows may use different compositions, but every surface must feel built from the same underlying system.

The same intent should normally produce the same visual pattern.

The same semantic state should use the same treatment.

Prefer system-level solutions when the same problem appears across multiple screens.

---

## 6. Visual Hierarchy and Composition

Users should quickly understand:

1. where they are;
2. the main task;
3. the primary action;
4. current context or state;
5. supporting information;
6. secondary and destructive actions.

Prefer hierarchy through:

**position → grouping → spacing → typography → contrast → surface → accent**

Do not compensate for weak hierarchy with excessive borders, cards, color, bold text, or decoration.

Structure should generally be **felt rather than visually announced everywhere**.

Prefer open composition, whitespace, alignment, and subtle separation over unnecessary enclosure.

Cards and elevated surfaces should communicate real hierarchy or interaction, not act as the default grouping mechanism.

---

## 7. Typography and Color

Use one coherent, highly legible typography system with strong Vietnamese support.

Typography should carry hierarchy so borders and color can remain quieter.

Keep font families, weights, and sizes deliberately limited.

Use technical or monospaced typography only where its role is meaningful rather than as the default treatment for operational labels.

Structural UI should remain mostly neutral.

Use a restrained primary interaction accent and reserve semantic colors for actual meaning such as success, warning, information, and destructive/error states.

Passive semantic states should generally use subtle treatment rather than large saturated surfaces.

---

## 8. Geometry, Surface, and Elevation

Use a small, coherent vocabulary for:

- radius;
- border strength;
- surface treatment;
- elevation.

Borders should be low-contrast and structural.

Elevation should represent actual layering.

Menus, popovers, dialogs, and necessary floating or sticky layers may use stronger separation than normal page content.

Avoid repeatedly combining:

**strong border + shadow + tinted background + nested container**

when spacing and hierarchy already communicate the relationship.

---

## 9. Interaction States

Important controls must have coherent and understandable:

- default;
- hover;
- focus-visible;
- pressed;
- selected;
- disabled;
- loading;
- success;
- error states where applicable.

Interactions should feel immediate and tactile without becoming playful.

Disabled states must remain readable.

Keyboard focus must remain visible and intentional.

State changes should not depend on color alone.

---

## 10. Motion Grammar

Motion exists to improve:

- feedback;
- state understanding;
- spatial continuity;
- orientation;
- perceived responsiveness.

Prefer short, restrained transitions.

Use motion where relationships between before and after states benefit from continuity.

Avoid motion used primarily as decoration, including excessive page entrances, card staggers, parallax, bouncing elements, perpetual effects, or unnecessary cinematic transitions.

Prefer:

1. CSS and Tailwind transitions;
2. Angular/CDK capabilities when coordination is required;
3. GSAP only when simpler mechanisms cannot provide clear product value.

Prefer `transform` and `opacity` when appropriate.

Respect `prefers-reduced-motion`.

Animation must never delay the underlying action.

---

## 11. Technical UI Foundation

### Styling and system layers

- **Tailwind CSS** is the primary styling language for layout, spacing, typography, color usage, geometry, responsive behavior, interaction states, and lightweight transitions.
- **Design tokens** are the semantic source of truth for color roles, surfaces, typography, spacing, radius, borders, elevation, focus treatment, and motion.
- **Angular Material** may be used selectively where mature component behavior and accessibility provide clear value. Its default visual language is not the iBOM design target.
- **Angular CDK** is the preferred foundation for behavior-oriented primitives such as overlays, focus management, accessibility, portals, keyboard interaction, and related infrastructure.
- **Shared iBOM primitives** should provide the reusable product-facing language for controls and patterns such as buttons, fields, dialogs, menus, tooltips, badges, tabs, tables, notices, and common states.
- **Motion grammar** should prefer CSS and Tailwind transitions first, use Angular/CDK when interaction requires coordination, and reserve GSAP for cases with clear product value that simpler mechanisms cannot provide.
- **Page composition** should compose from the shared system instead of inventing an independent visual language for each feature.

Implementation tools may differ underneath, but equivalent user intent must produce equivalent visual and interaction behavior.

Material, CDK, Tailwind, or any other library is implementation infrastructure rather than product identity.

**iBOM owns the appearance.**

### System coherence

Shared decisions should be established once and reused.

Do not independently redefine common values or behaviors inside feature pages when an appropriate shared token, primitive, or pattern exists.

A redesign task may introduce a new shared pattern when the workflow genuinely requires one, but it must extend the existing system rather than create a competing local design language.

Prefer system-level improvements when the same visual or interaction problem appears across multiple surfaces.

## 12. Responsive, Accessibility, and Performance

Responsive design must preserve task completion and information hierarchy rather than merely shrink desktop layouts.

Accessibility is part of visual quality.

Preserve or improve:

- keyboard navigation;
- visible focus;
- accessible labels;
- meaningful validation;
- adequate contrast;
- appropriate interaction targets;
- dialog and overlay focus behavior;
- reduced-motion support.

Performance is part of perceived design quality.

Avoid heavy dependencies or expensive visual effects for decoration.

Data-heavy workflows must remain responsive.

When visual polish and responsiveness conflict:

**responsiveness wins.**

---

## 13. Design Authority

This document defines stable cross-product design direction.

It intentionally does not define:

- exact page layouts;
- task-specific component composition;
- exact measurements;
- workflow-specific sticky or floating controls;
- detailed responsive behavior;
- individual animation decisions.

For redesign work, authority is:

1. active Task Specification;
2. current product behavior and source;
3. this `DESIGN.md`;
4. applicable product and integration documentation;
5. supplied references as taste evidence.

The Task Specification owns detailed design intent.

`plan.md` resolves that intent into implementation decisions.

BUILD implements the approved plan rather than redesigning during implementation.

---

## 14. Final Principle

iBOM should not feel refined because it contains more decoration.

It should feel refined because:

- hierarchy is obvious;
- spacing is deliberate;
- typography is coherent;
- surfaces are quiet;
- controls respond naturally;
- states are complete;
- motion explains rather than performs;
- workflows remain understandable;
- every page feels like part of one product.

**The beauty of iBOM should come from simplicity, precision, consistency, and interaction quality.**
