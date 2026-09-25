# iBOM UI Redesign Audit

## 1. Executive Design Read

iBOM has a distinctive **technical-workspace** character: warm off-white canvases, a near-black application rail, orange primary actions, restrained green/red status, thin ink-colored rules, sans-serif operational text, and monospaced system metadata. Profile editing and management surfaces are generally quiet and data-first rather than card-heavy. Authentication adds a much more editorial serif headline and grid treatment, so the product identity shifts noticeably at the sign-in boundary.

The strongest existing decisions are the Profile-specific completeness/navigation model, explicit document-current and managed-Member status, compact table-first management pages, labeled forms, inline validation, and empty states that explain the missing data and offer a next action. The current UI is already functionally mature and has useful product-specific structure to preserve.

The most consequential friction is not a need for a new visual identity. It is the combination of **lost Profile awareness during long scrolls**, **number-only navigation at the 1024px breakpoint**, a **Member search filter surface that pushes results far down the page**, and control feedback that changes abruptly. Repeated shell/page titles and tiny uppercase metadata add a more mechanical feel. The highest-leverage redesign direction is to retain iBOM’s own warm, technical palette while clarifying context continuity, readable hierarchy, responsive navigation, shared interaction states, and data density.

Audit coverage: authenticated shell, personal and managed Profile workspaces, Profile switching, Dashboard and Manager Dashboard, Preview/Export, Member search and no-result state, User Management, Master Data, representative dialogs, account/profile menus, login and required-field validation. Desktop evidence was gathered at approximately 1440px and 1280px, with representative checks at 1024px. HomePage was excluded from redesign recommendations as requested. No application data was saved or changed. No artificial network failure was induced; loading/failure treatments therefore remain unverified beyond the states visible during normal, fast seeded-data reads.

Selected browser evidence: [login](.playwright-mcp/page-2026-09-25T08-20-33-042Z.png), [Profile workspace at long scroll](.playwright-mcp/page-2026-09-25T08-53-47-217Z.png), [Member search at 1280px](.playwright-mcp/page-2026-09-25T08-24-01-975Z.png), [Preview/Export](.playwright-mcp/page-2026-09-25T08-17-42-513Z.png), and [Dashboard at 1024px](.playwright-mcp/page-2026-09-25T08-39-56-235Z.png).

## 2. Cross-Product / Systemic Findings

### 2.1 Navigation loses meaning at the compact-sidebar breakpoint

- **Surface / Location:** Authenticated application sidebar at approximately 1024px; all routes.
- **Issue:** The sidebar automatically contracts from a labeled 236px rail to a 76px rail. At that width, items display only sequence numbers (`01`, `02`, `03`, `04`); Workspace/Management group labels and navigation names disappear. The account footer contracts to an initial. There is no visible expand control, and the sampled navigation links have no tooltip or accessible name beyond their number.
- **Why it matters:** Route meaning and current location become difficult to recognize visually and by assistive technology. This is a real navigation and orientation issue, not just a compact styling preference. On the compact rail, two separate groups each begin at `01`, so the number itself is ambiguous.
- **Systemic or Local:** Systemic — shared shell and responsive navigation behavior.
- **Severity:** High.
- **Recommended Direction:** Make compact navigation an intentional, understandable mode: provide a visible expand/collapse control, preserve meaningful accessible names, and expose full labels through a reliable tooltip or equivalent when collapsed. Use consistent, distinguishable iconography or remove the numbering when it no longer carries useful meaning. Keep selected-route and group state unmistakable in both modes.
- **Functionality / Performance Risk:** Preserve the current routes, grouping, and role-based visibility. A light CSS width/opacity transition is sufficient; do not add a dependency or make navigation waits depend on animation.

### 2.2 Profile identity leaves the viewport during Profile work

- **Surface / Location:** Personal Profile Workspace during vertical navigation through About Me, Education, Languages, Certificates, Projects, and Skills.
- **Issue:** Clicking a section scrolls the long workspace to that section. The section navigation remains available, but the selected-Profile control and Profile name scroll out of view. At the Certificates/Projects/Skills position, edit and add actions remain visible without the active Profile name or an in-view context label.
- **Why it matters:** Users can lose confidence about which Profile they are editing and must return to the top to switch Profiles. This conflicts with iBOM’s important invariant that selected Profile context remains unambiguous and increases the cost of moving between sections and versions.
- **Systemic or Local:** Local to the long Profile Workspace composition, with implications for other Profile-dependent screens.
- **Severity:** High.
- **Recommended Direction:** Keep a compact selected-Profile identity/control available while scrolling, coordinated with the sticky section navigation rather than adding a second large header. Keep the name and switch action legible at narrower widths and in keyboard navigation.
- **Functionality / Performance Risk:** Preserve Profile switching semantics and ensure a context change still loads only the new Profile’s data. The persistent cue should not obscure section headings or consume a large portion of the viewport.

### 2.3 Management pages repeat the current page title in shell chrome

- **Surface / Location:** Member Management, User Management, Manager Dashboard, and Master Data pages.
- **Issue:** A 72px shell strip names the current page (for example, “Member Management”), followed immediately by a breadcrumb and a second, larger identical page title. Master Data similarly repeats its module title before the subpage title.
- **Why it matters:** The repeated title adds vertical chrome without adding location information. On task-heavy pages it delays the first useful content and creates two competing places for page-level hierarchy.
- **Systemic or Local:** Systemic — shared shell/page-header contract.
- **Severity:** Medium.
- **Recommended Direction:** Reserve the global strip for persistent account and Profile/managed-Member context. Let the page breadcrumb and page heading own route location and task hierarchy; retain a compact module identifier only where it provides genuinely different orientation.
- **Functionality / Performance Risk:** Low. Keep breadcrumbs, routes, page headings, and direct access to global context; avoid changing authorization or navigation meaning.

### 2.4 Shared controls feel abrupt; disabled primary actions lose legibility

- **Surface / Location:** Buttons, section navigation, filters, menus, accordions, and dialogs across the product.
- **Issue:** Hover treatment does change the button surface, but the sampled shared button style has a computed `0s` transition. Section selection and expanded project details also appear as immediate state changes. Primary buttons often combine a saturated orange fill with a hard dark offset shadow, while disabled primary actions retain that color and are faded with opacity; the disabled “Add Language” control is visibly pale with white text. Keyboard focus is present, but the sampled control uses a thin default-style outline rather than a consistent product focus treatment.
- **Why it matters:** The interface communicates states but does little to connect them spatially or tactilely, contributing to a static/mechanical feel. The washed-out disabled label is harder to read, while repeated hard shadows make primary actions visually heavier than the quiet page surfaces around them.
- **Systemic or Local:** Systemic — shared control and state styling.
- **Severity:** Medium.
- **Recommended Direction:** Define clear default, hover, focus-visible, pressed, disabled, and loading treatments. Use restrained, short transitions for color/border and purposeful expansion or menu/dialog entry; make pressed feedback immediate. Give disabled controls a readable dedicated foreground/background pair instead of relying on opacity over the enabled primary style. Reserve the strongest offset shadow for a small number of truly dominant actions, with elevation otherwise tied to floating layers.
- **Functionality / Performance Risk:** Preserve action priority, disabled/loading semantics, and keyboard focus. Keep motion to inexpensive CSS color/opacity/transform behavior, respect reduced motion, and never delay the action to play feedback.

### 2.5 Small monospaced metadata is used for too many working labels

- **Surface / Location:** Sidebar group labels, table headers, timestamps, counters, and small status/eyebrow text across authenticated screens.
- **Issue:** The compact monospaced uppercase treatment is a recognizable part of the iBOM identity, but when applied to frequent navigation labels and table headings at very small sizes it makes everyday content resemble system instrumentation. Muted metadata also sits close to the lower edge of comfortable scan readability.
- **Why it matters:** Users need to scan labels before data. When labels are more compressed and low-contrast than the values beneath them, hierarchy depends too heavily on position and users must spend extra effort reading dense lists.
- **Systemic or Local:** Systemic — typography scale and role assignment.
- **Severity:** Medium.
- **Recommended Direction:** Keep the technical mono treatment for genuine metadata, identifiers, and numeric alignment. Use the primary UI sans at a readable size/weight for navigational labels, table headings, and helper text; establish a small consistent type scale and maintain contrast for secondary copy.
- **Functionality / Performance Risk:** Low. Avoid increasing every label indiscriminately; check table density and wrapping at 1280px and 1024px, and preserve tabular figures where comparison benefits.

### 2.6 Enclosure and accent signals can compete on complex screens

- **Surface / Location:** Large filter panels, tables, empty-state boxes, primary actions, and the dark shell rail.
- **Issue:** The product often pairs a strong near-black outline or divider with an orange CTA, an offset dark shadow, and (in the Member filter) further internal separators plus a dashed selected-conditions box. Individual treatments are consistent, but several are applied together to low-priority regions, making complex surfaces feel more boxed and mechanically assembled than the underlying open Profile sections.
- **Why it matters:** Multiple enclosure and emphasis cues flatten the hierarchy: a filter subregion or passive empty state can compete with the result list and task action. Repeated dark rules also make the page feel visually denser than its actual data volume.
- **Systemic or Local:** Systemic treatment with local concentration on Member Management and form-heavy regions.
- **Severity:** Medium.
- **Recommended Direction:** Use spacing, alignment, and subtle separators before adding another panel boundary. Keep one clear framing layer for a real work surface, use dashed treatment only when it communicates a distinct state, and reserve strong accent/elevation for actions or floating layers.
- **Functionality / Performance Risk:** Low. Preserve grouping, table semantics, focus boundaries, and meaningful empty-state affordances; reducing borders must not reduce discoverability.

## 3. Application Shell

- **Sidebar and navigation:** At 1440px and 1280px the two navigation groups, current-account footer, and orange/charcoal selected state are easy to scan. At 1024px the automatic collapse removes the labels and context, as detailed in finding 2.1. The numeric prefixes feel more like inventory indexing than wayfinding at full width and become the only cue when compact.
- **Header and page hierarchy:** The global top strip is compact and stable, but management routes repeat the page name in both shell and page header. Personal routes instead place the selected-Profile switcher at the top; this is valuable context and should remain distinct from route title.
- **Account controls:** The account menu exposes account email, Account Settings, and Sign out in a clear anchored menu. The current user and role are visible in the expanded rail; compact mode reduces this to an initial and hides the role.
- **Selected Profile context:** The selector clearly identifies “My Profile,” shows the selected Profile name, and opens a radio-style list of Profiles with useful identity metadata and create/copy actions. Switching Profiles updated the route and displayed the selected Profile’s own section data. Keep this explicit distinction and preserve data isolation.
- **Managed Member context:** The managed workspace states “Viewing Member,” names the managed Profile, provides a route back, and repeats a clear managed-context status within the workspace. This is reassuring and important. The information may be consolidated visually, but the Member identity and scope must remain unmistakable while editing or previewing.
- **Collapse and responsive behavior:** A user-controlled expanded/collapsed state would be more understandable than the current breakpoint-only label removal. The compact variant needs both tooltips and accessible labels; the selected item should remain clear without relying only on an orange edge.
- **Navigation interactions:** Profile switching, account menu, and Master Data submenu expose understandable menu items and selected state. Route changes are immediate; the sampled controls provide little transition continuity. Small feedback on menu and section state would improve orientation without adding page-wide animation.

## 4. Page-by-Page Findings

### Authentication — Login and recovery

- **What already works:** Persistent Email/Password labels, password visibility control, direct recovery/registration routes, and required-field errors beside the affected fields. Blank submission produced clear “Email is required” and “Password is required” feedback without losing layout.
- **Friction:** The left panel’s large editorial serif headline, grid background, and corner geometry create a markedly different visual language from the sans/mono authenticated workspace. At 1280px the login headline wraps across three lines; the recovery view at 1024px confirms the brand column narrows to roughly 301px, forcing similarly large serif copy into four lines. The form itself remains readable and centered.
- **Composition opportunity:** Keep a distinct, calm authentication entry, but tune headline scale/line length and decorative geometry to the product’s restrained operational identity. The split composition is a useful brand anchor; it does not need to become a marketing hero.
- **Motion / interaction:** Keep validation immediate and local. Use the same focus and disabled button language as authenticated forms; avoid decorative entrances.
- **Behavior to preserve:** Login, required validation, password reveal, registration, forgot-password, and recovery code flows.

### Dashboard

- **What already works:** The selected Profile and document state are visible near the top; “Open Workspace,” “Preview CV,” and “Open document” provide direct paths into the current work. Section completeness explains which Profile areas need attention, and the My Profiles list visibly distinguishes the selected version.
- **Friction:** No page-specific structural defect stood out at 1440px/1280px. At 1024px the Profile summary and state cards reflow into a wider, readable stack; the completeness list and Profile selector remain usable. Existing shell collapse, title duplication on management pages, and shared control treatments still apply.
- **Composition opportunity:** Preserve the summary-first layout. Keep the current document state and section completion scan-oriented rather than adding more metric cards or decorative charting.
- **Motion / interaction:** Profile switching and section review should give clear selected/target feedback; keep data updates immediate and avoid card entrance sequences.
- **Behavior to preserve:** Profile context, completeness guidance, readiness/preview state, and direct navigation to workspace/document.

### Profile Workspace and sections

- **What already works:** The section index pairs section names with completeness contribution, long-form content is organized by business section, empty Certificates/Skills states give a next action, project detail is disclosed inline, and edit forms use persistent labels with paired short fields and full-width narrative fields. The About Me editor’s sticky bottom status/action area keeps Save and Cancel available during a long form.
- **Friction:** The selected Profile identity is lost after section navigation scrolls the page, despite section navigation remaining available. At 1024px, the “Add project” action wraps into two lines and grows taller than neighboring section actions. Some empty sections repeat the same Add action in both the section header and empty panel.
- **Composition opportunity:** Retain the long-workspace pattern and the useful section index, but keep the active Profile context in view and normalize section-header action sizing. Consider using one contextual add action per empty section unless the duplicated placement solves a demonstrated reachability need.
- **Motion / interaction:** Section jumps should preserve orientation and briefly indicate the target; project detail expansion is a good candidate for a short, restrained expand/collapse transition. Save feedback should remain local and immediate.
- **Behavior to preserve:** Equivalent editing capability for each Profile, independent Profile data, completeness contributions, empty-section next actions, unsaved-change protection, and Preview invalidation rules.

### CV Preview / Export

- **What already works:** The preview includes an explicit valid/current explanation, identifies the Profile in the page subtitle, groups filename format with PDF/DOCX export, and shows last-exported time. Export controls are visibly associated with the current document.
- **Friction:** The generated document sits inside a dark browser PDF viewer with its own dense toolbar and thumbnails. In the sampled view it rendered at 39% zoom, so the document’s text was small relative to the large viewer chrome. The route’s top strip shows “Create Profile” rather than a persistent current-Profile control, leaving the Profile name primarily in the page subtitle/status area.
- **Composition opportunity:** Make the document the dominant, readable surface, with compact export/filename utilities and a clear fit-to-width or full-view affordance where supported. Keep browser/native controls available if they remain useful; avoid duplicating every PDF viewer control in the app.
- **Motion / interaction:** Loading/refresh feedback belongs to the preview surface and should not replace the whole shell. Any zoom or fit transition should be immediate enough for document work.
- **Behavior to preserve:** Backend-generated current Preview, explicit validity, selected-Profile identity, filename-format selection, and valid-preview gating for export.

### Member Management and search

- **What already works:** The “Match all filters” model explains that account criteria and Profile conditions combine with AND semantics and that Profile criteria match within the same Profile. The language/skill tabs, selected-condition count, applied-filter summary/reset, backend-ordered table, and matching Profile evidence are clear. A no-result search gives a concise explanation and reset action.
- **Friction:** The filter surface is 564px tall in the sampled 1280px view and remains fully open even when no Profile conditions are selected. Results begin around y=795 and the table around y=832, so the result list has low first-screen priority. At 1280px/1024px the 1086px table is intentionally contained in a horizontal-scroll wrapper; the right-side Manage Profiles action is outside the initial visible portion.
- **Composition opportunity:** Keep the account search and status filter immediately available, and consider progressive disclosure for Profile conditions with a visible selected-filter summary. Preserve the same-profile constraint and count/clear affordances. For the table, protect the most-used identity and action columns or provide an equally discoverable compact details strategy while retaining tabular comparison.
- **Motion / interaction:** Filter application should show immediate pending feedback only when the request is perceptible, followed by the applied-filter state. Keep row hover subtle and avoid animating full table refreshes.
- **Behavior to preserve:** AND combination, same-Profile matching semantics, current filters until applied, reset behavior, matching evidence, and Member-to-managed-Profile navigation.

### Managed Member context

- **What already works:** The context header names the managed Member and Profile, provides a clear back action, and the workspace status states that actions are limited to the selected Member context. Profile completeness and sections remain visible inside that context.
- **Friction:** Member identity is repeated in the context line, page subtitle, and status banner. Repetition currently adds reassurance but costs vertical space and can be streamlined if context stays visible throughout long work.
- **Composition opportunity:** Use one persistent, compact managed-context header plus a concise status explanation; carry the Member/managed state into Preview and relevant menus. Avoid reusing the personal Profile switcher in a way that blurs ownership.
- **Motion / interaction:** Keep route transitions and context changes spatially stable; a compact temporary confirmation of Member changes may help if existing behavior supports it.
- **Behavior to preserve:** Managed Member identity, scope of available management actions, and the route back to personal Profiles.

### User Management

- **What already works:** Search and role filters are compact relative to the results. The table keeps username, email, role, status, and action aligned. The Create User dialog has a clear vertical field sequence, password requirements, show/hide controls, role choice, and predictable Cancel/Create actions. The self-deactivation restriction is explicit.
- **Friction:** No page-specific composition problem was strong enough to separate from shared shell/control findings. Deactivate actions are appropriately secondary; no destructive action was triggered during the audit.
- **Composition opportunity:** Preserve this compact search-to-table flow. Keep password guidance adjacent to the password field and avoid expanding the dialog into an unnecessarily card-heavy form.
- **Motion / interaction:** Dialog entry/exit and validation should be calm and consistent with other overlays; preserve focus handling and error placement.
- **Behavior to preserve:** Role filtering, directory search, create validation, password visibility/requirements, permission restrictions, and account deactivation confirmation behavior.

### Master Data

- **What already works:** Skills and File Name Formats remain table-first, with search/create actions near the relevant data. The Add Skill dialog is short and focused, and disabled pagination for a one-page result set is understandable. Master Data’s expandable navigation exposes a small, discoverable subnavigation.
- **Friction:** The shell repeats “Master Data” above the breadcrumb/page title on its subpages. Otherwise, no local issue rose above the shared typography, surface, and control findings.
- **Composition opportunity:** Keep the compact CRUD/table model and make the active Master Data subsection easy to recognize in both expanded and collapsed shell modes.
- **Motion / interaction:** A restrained submenu and dialog transition is sufficient; avoid row entrance effects.
- **Behavior to preserve:** Existing master-data categories, table search, edit/delete/create actions, filename formats, and pagination semantics.

### Manager Dashboard

- **What already works:** Completion progress, skill/category charts, data source, refresh time, and refresh action make the analytics provenance visible. The chart regions have accessible names and companion lists with counts, so meaning is not carried only by color.
- **Friction:** In the seeded view, one eligible Profile produces a single horizontal bar and a full 100% doughnut, while the chart containers remain large. This is not enough evidence to treat the production layout as defective, but it identifies a sparse-data case worth designing deliberately.
- **Composition opportunity:** Consider a compact count/list presentation when a distribution has one category or too few records to benefit from a chart, without suppressing the underlying data.
- **Motion / interaction:** Refresh should indicate real refresh work locally and avoid replaying large chart animations for minor updates.
- **Behavior to preserve:** Eligibility rules, API provenance, counts/percentages, refresh semantics, and accessible chart descriptions.

## 5. Design Opportunities

These are **Candidate Opportunities** for Human Intent review, not approved requirements.

### 5.1 Persistent, user-controlled shell context

- **Idea:** Add an explicit, user-controlled sidebar collapse state with labeled tooltips/accessibility names, while keeping selected Profile or managed Member identity in a compact shell context strip during long work.
- **Why it may improve iBOM:** It recovers useful width without turning navigation into unlabeled numbers and reduces context loss during repeated Profile edits.
- **Where it applies:** All authenticated routes; strongest on Profile Workspace and managed Member flows.
- **Risk / trade-off:** The shell must not crowd page actions or blur personal and managed contexts. Preserve role-based navigation and keyboard access in both states.
- **Confidence:** High.

### 5.2 Compact-by-default Member query with expandable Profile criteria

- **Idea:** Present username/email and account status first, then disclose language/skill criteria on demand while showing a compact count/summary when criteria are active.
- **Why it may improve iBOM:** Results become visible earlier, while advanced same-Profile matching remains available without becoming a second form page.
- **Where it applies:** Member Management search.
- **Risk / trade-off:** Hidden criteria must remain discoverable, keyboard operable, and included in an always-visible applied-filter summary. No backend/query semantics should change.
- **Confidence:** High.

### 5.3 Document-first Preview composition

- **Idea:** Offer a larger fit-to-width document stage and a compact, clearly grouped export utility area; optionally provide a focused full-view mode if it works with the existing PDF integration.
- **Why it may improve iBOM:** The generated CV is the central object in this workflow, while native PDF toolbar chrome currently competes with it and reduces the visible document scale.
- **Where it applies:** CV Preview / Export.
- **Risk / trade-off:** Native browser PDF affordances are useful and accessible; do not replace them with an incomplete custom viewer or duplicate controls unnecessarily.
- **Confidence:** Medium.

### 5.4 Data-aware analytics presentation

- **Idea:** Adapt chart emphasis to data volume: retain charts for meaningful distributions and use a concise summary/list for zero or very sparse groups.
- **Why it may improve iBOM:** Prevents a large chart surface from implying a rich distribution when the data contains one category, while keeping counts and provenance visible.
- **Where it applies:** Manager Dashboard.
- **Risk / trade-off:** Thresholds can obscure comparison if chosen poorly; all underlying values and accessible descriptions must remain available.
- **Confidence:** Exploratory.

### 5.5 Contextual section/save feedback

- **Idea:** Pair Profile section jumps with a restrained active-section/target cue and make the sticky editor action area clearly communicate dirty, saving, saved, and failed states.
- **Why it may improve iBOM:** Long editors become easier to orient within, and users gain confidence that Save registered without animation unrelated to the task.
- **Where it applies:** Profile sections and other long forms.
- **Risk / trade-off:** Avoid persistent banners that consume form space or duplicate status; respect reduced motion and retain existing unsaved-change protections.
- **Confidence:** Medium.

## 6. Recommended Redesign Themes

- **Visual foundation:** Keep iBOM’s warm neutral and dark-ink identity; refine type scale, label contrast, spacing rhythm, border strength, radii, and elevation so structure recedes behind the work.
- **Shell and context continuity:** Make navigation understandable at every width and keep personal Profile versus managed Member context explicit through long workflows.
- **Control and interaction polish:** Standardize focus, hover, pressed, selected, disabled, and loading states; use short, purposeful transitions that improve feedback without slowing actions.
- **Surface simplification:** Reduce stacked enclosure cues on filter/form surfaces; rely more on proximity, alignment, and subtle dividers where those communicate grouping adequately.
- **Data-density refinement:** Bring Member results forward, make table actions discoverable at laptop widths, and keep filters/pagination secondary to the data.
- **Workflow-specific composition:** Let Profile editing remain a structured long-form workspace and make Preview more document-first; adapt analytics presentation to actual data density.
- **Authentication coherence:** Retain a distinctive entry experience while aligning its typography and visual weight more closely with the operational product.

## 7. Preserve List

- Preserve iBOM’s own technical, warm-neutral identity and restrained orange interaction accent; refine it rather than replacing it with another product’s visual language.
- Preserve the dark grouped sidebar, the clear distinction between Workspace and Management routes, and the anchored account controls—while making the compact state understandable.
- Preserve the selected-Profile picker’s name, selected radio state, profile identity metadata, and create/copy entry points.
- Preserve explicit managed-Member context and the distinction between personal and managed Profile workflows.
- Preserve section-level Profile completeness and the dedicated Profile-section navigation; these are valuable orientation and progress cues.
- Preserve visible form labels, business-meaning field grouping, inline validation, sticky save/cancel access on long forms, unsaved-change protection, and accessible password reveal controls.
- Preserve native table structures for Member, User, and Master Data comparison; do not replace them with cards for cosmetic reasons.
- Preserve useful empty states that explain why a section is empty and provide an appropriate next action, as well as the explicit applied-filter and no-result feedback.
- Preserve the calm semantic document states (“current,” “valid,” “needs attention”), export gating, filename format selection, and last-export information.
- Preserve manager analytics provenance, eligibility information, and chart descriptions/companion values; refine their composition only where the data density warrants it.
- Preserve route meaning, RBAC visibility, filtering/sorting/pagination semantics, confirmation requirements, backend contracts, and all current business behavior through visual redesign.
