# Task Plan

- Replace the Angular starter screen with a routed, feature-oriented iBOM homepage at /.
- Keep AppComponent as the router-outlet application shell.
- Convert the prototype into standalone Angular components, local typed demo data, SCSS, bindings, and lifecycle-managed interactions.
- Retain GSAP only for the prototype’s pinned, scrubbed profile-to-multiple-profiles scroll sequence.

## Repository Findings

- The repository is an Angular 17 standalone application with strict TypeScript and template checking.
- AppComponent currently contains the default Angular starter UI plus RouterOutlet; app.routes.ts is empty while app.config.ts already provides routing.
- Global styles are effectively empty. The CLI uses SCSS and has a 4 KB per-component production style error budget, which is too restrictive for the planned locally scoped homepage and profile-card SCSS.
- The test runner is Angular CLI Karma/Jasmine, configured in angular.json; there is no separate Karma config. The only existing test is the default AppComponent starter test.
- No existing application domain source, API layer, auth implementation, or profile data exists.
- homepage-sample.html is located at the repository root, rather than the requested references/ path. It is the supplied visual reference.
- The reference uses Tailwind CDN, Google font links, GSAP/ScrollTrigger CDN scripts, global DOM queries, inline handlers, four duplicated profile cards, and unsupported/demo product wording including seniority levels and unrelated concurrency claims.

## Proposed Changes

### Application routing and shell:

- Replace the starter markup in AppComponent with only the application router outlet.
- Register a lazy standalone homepage route for /.
- Update the document title to the iBOM product name.
- Make the Login control a normal route link to /login only if it can be rendered without a navigation error; otherwise render it as a clearly unavailable, non-actionable control rather than a broken link.

### Homepage feature structure:

- Add a features/home standalone homepage component responsible for page composition, header clock, hero narrative, marquee, footer, and the scroll scene lifecycle.
- Add one feature-local reusable profile-card component because the source hero card and three resulting independent-profile cards share the same profile identity, tabs, status, summary, skills, export readiness, and visual treatment.
- Keep profile-card variants limited to layout size and color theme rather than duplicating card markup or introducing a broader design system.
- Define typed, immutable local homepage demo data in the home feature for the source profile and its three independent profile versions. Use product-appropriate descriptions and remove arbitrary L1/L2/L3/L4 seniority labels.
- Preserve supported product concepts: independently maintained profiles, completion state, preview-before-export, and PDF/DOCX output. Keep all data demonstrative and local.

### Visual styling:

- Replace Tailwind utilities with semantic Angular templates and SCSS class names.
- Define global foundation rules only in styles.scss: box sizing, body/page reset, font stacks or font imports, shared color/font CSS custom properties, and reduced-motion defaults.
- Keep homepage layout, radio-display effects, brutalist shadows, marquee, card themes, responsive breakpoints, and component-specific interaction styles within the feature/component SCSS files.
- Preserve the paper, editorial serif, terminal mono/radio display, black borders, orange/blue/green accents, scanlines, and offset-shadow visual language.
- Adjust the existing production component-style budget only as needed to accommodate the intentionally detailed local SCSS, without otherwise changing Angular CLI configuration.

### Testing:

- Replace obsolete starter assertions for title and “Hello, ibom-ui.”
- Test the application shell renders a router outlet and the / route renders the homepage.
- Add focused profile-card tests for independent tab state and tab-panel changes.
- Test the homepage clock initialization/lifecycle through controllable timer behavior where practical.

## UI and Interaction Behavior

- Render a sticky terminal status bar with a digital local-time clock, an editorial iBOM navigation row, and a product-focused hero statement.
- Manage the clock as homepage component state: initialize immediately, update every second, and clear its interval with Angular destruction cleanup.
- Render the source profile card and the three independent profile versions from local typed data. Each card owns its active overview, skills, or export tab through Angular state and accessible button semantics.
- Render the reference actions as disabled/demo controls or concise informational controls because preview, export, and duplication are out of scope; they must not imply a working backend feature.
- Implement pointer tilt through profile-card pointer bindings scoped to that card. Set/reset component-local CSS variables or styles only for the interacted card, avoiding document-wide queries; disable it for touch/coarse-pointer contexts and reduced-motion users.
- Use CSS animation for the looping marquee and card float effects; pause or remove nonessential motion under prefers-reduced-motion.
- Use GSAP ScrollTrigger for the central desktop/tablet hero transformation because the prototype’s pin-and-scrub sequence cannot be reproduced comparably with static CSS: fade/move the editorial copy, compress the source card into the roll, then reveal the three independent cards.
- Initialize GSAP after the browser view is available, scope selectors to the homepage host, run setup outside Angular change detection, refresh on relevant size changes, and revert the GSAP context/ScrollTrigger on component destruction.
- Skip pinning and show the independent cards in a normal responsive flow on small screens, coarse pointers, and reduced-motion environments so the page stays accessible and usable.

## Dependencies

- Runtime: add gsap as a normal npm dependency to support the core pinned scroll transformation and ScrollTrigger; do not retain CDN scripts.
- Development: None.
- Do not add Tailwind, a Tailwind configuration, or any data/API/auth dependency.

## File Delta

### Modify

- package.json
- package-lock.json
- angular.json
- src/index.html
- src/styles.scss
- src/app/app.component.html
- src/app/app.component.spec.ts
- src/app/app.routes.ts

### Add

- src/app/features/home/home.component.ts
- src/app/features/home/home.component.html
- src/app/features/home/home.component.scss
- src/app/features/home/profile-card/profile-card.component.ts
- src/app/features/home/profile-card/profile-card.component.html
- src/app/features/home/profile-card/profile-card.component.scss
- src/app/features/home/profile-card/profile-card.component.spec.ts
- src/app/features/home/home.component.spec.ts

### Remove

- None

## Focused Verification

- npm test -- --watch=false

## Out of Scope

- Login and registration implementation.
- Authentication state, tokens, guards, interceptors, and API/HTTP integration.
- Profile CRUD, preview/export generation, PDF/DOCX generation, dashboard, or manager/admin features.
- Fake backend services or global design-system work.
- Tailwind adoption, unrelated Angular cleanup, repository restructuring, and documentation work.