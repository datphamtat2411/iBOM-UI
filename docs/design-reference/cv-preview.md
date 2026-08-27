# CV Preview

## Context

CV Preview renders the currently selected Profile as a document before export.

Preview and export are Profile-specific and must follow the current Preview validity state.

## Stable Rules

- Preview content belongs only to the currently selected Profile.
- Profile data changes invalidate the previous Preview when applicable.
- Export is unavailable until the current Profile has a valid Preview.
- Empty CV sections are omitted.
- Valid collection records are rendered from the current Profile data.
- Project content may span multiple document pages.
- Generated CV presentation is document-first and print-oriented.
- Responsive behavior scales the document preview rather than redesigning the CV itself.

## Prototype Route

Prototype: `design/ibom-core-prototype.html`

Do not read the full prototype.

### Styles

Search:
- `/* Preview */`

### Markup

Search only as relevant:
- `#page-preview`
- `[data-od-id="cv-preview-export"]`
- `#preview-banner`
- `.preview-layout`
- `.preview-tools`
- `.document-stage`
- `#document-pages`
- `#generate-preview`
- `#export-pdf`
- `#export-docx`

### Behavior

Search only as relevant:
- `cvProjectMarkup()`
- `cvPages()`
- `fitDocumentPages()`
- `renderPreview()`
- `#generate-preview` handler
- `runExport()`

Inspect supporting CV rendering helpers only when required by the task.

### Responsive

Inspect Preview-related rules only in:
- `@media (max-width: 1050px)`
- `@media (max-width: 800px)`
- print rules when export/print presentation is relevant

## Boundary

Do not infer final CV branding, final section order, fixed page count, backend export implementation, or production document requirements from prototype-only choices.

Exact CV content rules, export contracts, and acceptance criteria belong to the active task, `plan.md`, current source, and confirmed product context.
