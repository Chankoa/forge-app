# Forge Design System 1.1

## Status and references

DS 1.1 is the shared visual foundation for Creator, Teacher and the future Learner experience. The Teacher Authoring Workspace is its first full application.

Official visual direction:

- `docs/design/ds-1.1-reference-light.png`
- `docs/design/ds-1.1-reference-dark.png`

The images define hierarchy, density and visual intent. The semantic tokens in `styles/tokens.scss` and `styles/themes.scss` remain normative.

## Principles

- Calm, editorial and legible before decorative.
- Structure supports navigation, Editor owns the work, Forge assists.
- Space and typography create hierarchy before borders and cards.
- Violet means system, selection, focus and primary interaction.
- Rose means editorial impulse and creation; it is never a second default primary.
- AI is identifiable through one tinted surface, not stacked purple layers.
- Light and Dark share the same component implementation and semantic token names.

## Audit summary

The pre-DS 1.1 system already had a useful spacing scale and a single token entry point, but several issues reduced consistency:

- `--surface-body` and `--text-soft` were consumed without being defined;
- Dark used rose as `--accent-primary`, reversing the system hierarchy;
- `--radius-md`, `--radius-lg` and `--radius-xl` all resolved to the same value;
- strong weights mapped to 750–900 and were used broadly in Teacher surfaces;
- buttons carried large gradients and shadows regardless of contextual priority;
- the Authoring Workspace accumulated compensating, page-specific borders and surfaces;
- Structure actions and lesson rows had more visual weight than their navigation role required;
- the Forge panel tinted both the container and several nested cards.

Global primitives that serve many legacy surfaces were evolved conservatively. Workspace-specific calibration remains scoped under `.teacher-authoring` to avoid a product-wide visual rewrite.

## Color system

### Semantic roles

| Role | Light | Dark | Usage |
| --- | --- | --- | --- |
| `surface-body` | `#fbfafc` | `#0f1117` | application background |
| `surface-panel` | `#ffffff` | `#161a23` | primary work surface |
| `surface-soft` | `#f1f5f9` | `#1d212b` | contextual inset and hover |
| `surface-ai` | `#f8f6ff` | `#17152b` | Forge container |
| `surface-control` | `#ffffff` | `#121722` | inputs and selects |
| `text-primary` | `#0f172a` | `#f1f5f9` | titles and decisive content |
| `text-secondary` | `#475569` | `#cbd5e1` | body copy |
| `text-muted` | `#64748b` | `#9aa5b7` | metadata and supporting copy |
| `border-soft` | `#e2e8f0` | `#2a3142` | default separators |

Compatibility aliases such as `surface-bg`, `surface-muted`, `text-default` and `text-strong` are retained. New work should prefer the semantic roles above when a direct role exists.

### Accents and status

- Violet: `accent-primary`, `accent-primary-strong`, `accent-soft`.
- Rose: `accent-editor`, `accent-editor-soft`.
- Green: success and published.
- Orange: warning, draft and review.
- Red: error and destructive actions.
- Blue: informational state only.

Status colors must not be used decoratively.

## Typography

The body and heading family remain Inter/system sans-serif. No external font was added.

Semantic roles:

| Role | Token | Weight |
| --- | --- | --- |
| Page title | `font-size-page-title` | 700 |
| Object title | `font-size-object-title` | 700 |
| Section title | `font-size-section-title` | 600 |
| Body | `font-size-body` | 400 |
| Label | `font-size-label` | 600 |
| Caption | `font-size-caption` | 400–500 |

The weight scale now resolves to 400 / 500 / 600 / 700 / 750 / 800. `black` and `extrabold` remain compatibility options, not default component choices. Uppercase eyebrows are reserved for rare structural or editorial markers.

## Spacing

The existing 4 px scale remains authoritative:

`4 · 8 · 12 · 16 · 24 · 32 · 40 · 48 · 64`

Intermediate legacy tokens remain available, but new layout choices should use the core sequence when possible.

- Field internals: 8–12 px.
- Related controls: 12–16 px.
- Section groups: 24–32 px.
- Workspace margins: responsive 20–32 px.

## Surfaces

DS 1.1 uses four levels:

1. `surface-body`: application background;
2. `surface-panel`: primary work surface;
3. `surface-soft`: inset, hover or secondary context;
4. `surface-ai`: Forge context.

Normal sections do not receive a shadow. Separators and spacing replace nested cards. `surface-elevated` and the shadow scale are reserved for drawers, dialogs and floating/sticky controls.

## Radius and shadows

Radius scale:

- `xs`: 4 px;
- `sm`: 6 px;
- `md`: 8 px;
- `lg`: 12 px;
- `xl`: 16 px;
- `2xl`: 20 px.

Shadows are limited to `xs`, `sm`, `md`, `lg`, `sticky` and the focus ring. Standard cards use no elevation by default.

## Buttons

Supported variants:

- `Primary`: one decisive action in the current context;
- `Secondary`: important supporting action;
- `Tertiary` / `Ghost`: light contextual action;
- `Icon`: compact action with accessible name and tooltip where needed.

Supported sizes are default (`md`) and `sm`. Buttons use semibold text, a flat system accent and restrained shadow. Coarse-pointer contexts preserve a 44 px touch target.

## Forms

Inputs, selects and textareas share:

- `surface-control` background;
- 8 px radius;
- subtle border and violet focus ring;
- 13 px semibold labels;
- 14 px control text;
- role-based textarea heights rather than one oversized default.

The lesson content textarea remains larger than metadata fields but is capped to preserve context on laptop and mobile.

Lesson resources use two matched contextual panels: link and file. Their headers, fields and actions share the same rhythm, while distinct Lucide icons make the choice scannable. The layout remains two-column only while each form keeps a useful width, then becomes one column on tablet and mobile.

## Tabs

`Informations | Contenu | Ressources` use plain text, a two-pixel violet indicator, medium inactive weight and semibold active weight. On mobile they scroll horizontally instead of wrapping.

## Badges

Badges are compact, semibold and secondary to titles. Their colors communicate real status only. Published, draft, review and destructive/error semantics use the corresponding status tokens.

## Panels

### Structure

Structure behaves as an explorer:

- modules are separated groups rather than cards;
- lessons are compact selectable rows connected by a subtle sequential axis;
- lesson numbers keep a stable, non-semantic alignment on the sequential axis while metadata and status remain secondary;
- the active lesson uses `accent-soft` plus a vertical violet indicator;
- rose marks the editorial module label only;
- reordering and destructive controls stay accessible but visually secondary.

Modules use one local disclosure control whose chevron means expand/collapse only. Arrow icons are reserved for ordering and the trash icon for deletion. A module containing the selected lesson remains expanded so the active object cannot disappear from its context. Badges communicate real editorial status only; lesson numbers never reuse badge styling.

### Editor

The Editor owns `surface-panel`, limits content width to 60 rem and uses a simple sequence: object header, tabs, work surface, sticky save action. Section separation relies on spacing and one-pixel dividers.

### Forge

The Forge panel itself owns the AI tint. Context, actions, status and proposal use mostly neutral internal surfaces. Violet identifies Forge interactions; nested lavender cards are avoided.

On desktop, the Forge panel can be resized from 20 rem to 44 rem, while remaining capped by the viewport and the Editor minimum width. The separator supports pointer and keyboard input. The last width is stored locally in a versioned, non-sensitive preference; responsive drawers do not expose free resizing.

## Responsive

Functional breakpoints remain unchanged:

- desktop large: Structure / Editor / Forge;
- laptop: Forge becomes a drawer;
- tablet: Structure and Forge become temporary panels;
- mobile: Editor occupies the full width.

Mobile tabs scroll horizontally, content padding contracts to 12–16 px, the save action spans the available width, and coarse-pointer icon actions retain 44 px targets.

## Accessibility

- Semantic focus ring shared across themes.
- WCAG-oriented primary and body text contrast.
- Active structure state combines color, weight and an inset indicator.
- Existing `aria-current`, `aria-expanded`, Escape handling and drawer focus trap remain unchanged.
- No interaction depends solely on hover.
- Reduced-motion mode disables decorative transitions.

## Scope and deferred work

DS 1.1 does not refactor every Creator or Learner component. Dashboard, catalogue and authentication inherit the safer global palette, typography weights, radii, buttons and badges; the detailed Workspace calibration stays scoped.

Deferred:

- component catalogue or Storybook;
- automated contrast regression tooling;
- full migration of legacy one-off spacing values;
- Learner-specific composition and content typography;
- Admin visual convergence.
