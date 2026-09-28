# Forge — User Journey & DS 1.2 Visual References

These references define the target visual and interaction journey for the canonical LearnIt / Forge experience.

They are not decorative inspiration. They define the expected structure, hierarchy, proportions, density, component placement, interaction patterns and visual language of Forge, subject to real product, accessibility and responsive constraints.

---

## 1. Scope

### Authenticated product journey

00 — Public home  
01 — Workspace home  
02 — Create / intent  
03 — Generated path  
04 — My paths  
05 — Course overview  
06 — Learn  
07 — Edit  
08 — Publish & collaborate  
09 — Profile  
10 — Classroom  
11 — Library / Resources  
12 — Explore  
13 — Course detail  
14 — Team  
15 — Settings  

### Public product pages

PUB01 — Features  
PUB02 — Pricing  
PUB03 — Resources  
PUB04 — Examples  

The authenticated User Journey and the public product pages share the same Forge identity, but they do not have the same density or interaction requirements.

---

## 2. Authority order

When references disagree, use this order of authority:

1. Product behaviour, security, accessibility and real data constraints
2. Existing validated routing/state behaviour
3. Design System 1.1 foundations
4. Design System 1.2 product patterns and shell
5. Canonical User Journey mockup for the current screen
6. DS 1.2 Interactive Reference site
7. Existing visual implementation

Do not change business logic, data ownership, permissions, routing or persistence only to reproduce a mockup.

Do not freely reinterpret the references unless required by responsive behaviour, accessibility, real data, technical constraints or an already validated interaction that is stronger than the static mockup.

---

## 3. DS 1.1 vs DS 1.2

### DS 1.1 — foundations

DS 1.1 remains the base layer for:

- design tokens
- light / dark themes
- typography scale
- spacing scale
- radii
- borders and shadows
- buttons
- fields
- tabs
- focus states
- touch targets
- editor readability
- accessible contrast

Relevant implementation files currently include:

- `styles/tokens.scss`
- `styles/themes.scss`
- `styles/globals.scss`
- `styles/app.scss`

DS 1.1 should not be discarded or duplicated.

### DS 1.2 — product language

DS 1.2 extends DS 1.1 with product-level patterns:

- dark collapsible global navigation rail
- atmospheric hero treatment on selected overview / entry screens
- domain and sub-domain as first-class metadata
- reusable contextual structure rail
- reusable Forge AI rail / panel
- Forge AI states: `collapsed`, `docked`, `focus`
- refined list-based object libraries
- restrained editorial markers
- publication readiness patterns
- Classroom teaching patterns
- Library / source reuse patterns
- collaboration patterns
- consistent Creator / Learner sibling layouts

DS 1.2 is a convergence layer, not a rewrite of the product architecture.

---

## 4. Canonical visual references

Use the following screens as primary references when implementing cross-product patterns.

### UJ05 — Course overview

Canonical reference for:

- authenticated Forge visual maturity
- course identity
- domain metadata
- course-level hierarchy
- readiness state
- module rows
- relationship between main content and Forge AI

UJ05 is the main density and course-shell reference.

### UJ07 — Edit

Canonical reference for:

- Creator workspace
- Structure / Editor / Forge architecture
- selection hierarchy
- lesson editing density
- Forge contextual suggestions
- long-session usability

### UJ06 — Learn

Canonical reference for:

- Learner workspace
- sibling relationship with UJ07
- reading density
- progress and lesson navigation
- contextual Forge assistance for learners

### UJ10 — Classroom

Canonical reference for:

- teaching / facilitation cockpit
- group progression
- learner attention signals
- pedagogical Forge assistance
- operational information without KPI-dashboard styling

### UJ11 — Library

Canonical reference for:

- reusable sources and resources
- dense vertical resource list
- resource detail panel
- provenance and usage context
- Forge assistance applied to a selected resource

---

## 5. Forge Shell 1.2

The Forge shell should support two global navigation states.

### Global rail

`expanded`
- icon + label
- dark surface
- clear active state

`collapsed`
- icon only
- preserves navigation context
- maximizes workspace width

The rail must remain structurally light and must not dominate the working surface.

### Contextual structure rail

Used where the product needs object hierarchy, especially:

- course
- module
- lesson

Selection should prioritize:

- pale violet selected surface
- narrow violet indicator
- restrained editorial pink marker only where useful

Avoid card stacking inside the structure rail.

---

## 6. Forge AI interaction model

Forge AI is contextual, not a generic chatbot.

Forge always relates to the active object:

- course
- module
- lesson
- resource
- classroom
- learner group
- publication context

Forge AI supports three canonical states.

### `collapsed`

Minimal vertical rail / trigger.

Purpose:
- preserve maximum workspace width
- keep Forge available without visual pressure

### `docked`

Contextual side panel, typically around 320–360 px.

Purpose:
- suggestions
- quick analysis
- contextual actions
- short explanations
- related resources

### `focus`

Expanded side workspace or modal.

Purpose:
- compare alternatives
- work on longer AI output
- analyse a module or course
- review several sources
- perform tasks that are too large for the docked rail

Closing `focus` should restore the previous state and keyboard focus.

`Escape` should close focus / drawer states where appropriate.

---

## 7. Atmospheric hero

Use atmospheric hero treatment only on screens where identity and orientation benefit from it.

Recommended examples:

- UJ00 — Public home
- UJ01 — Workspace home
- UJ02 — Create
- UJ03 — Generated path
- UJ05 — Course overview
- UJ09 — Profile
- UJ12 — Explore
- UJ13 — Course detail

Dense workspaces should remain mostly neutral:

- UJ06 — Learn
- UJ07 — Edit
- UJ10 — Classroom
- UJ11 — Library

Hero treatment should use subtle off-white / lavender / diluted pink atmosphere.

Avoid strong gradients behind dense controls or long-form work.

---

## 8. Domain metadata

Domain and sub-domain are first-class course metadata.

Examples:

- `Intelligence artificielle · Numérique`
- `Photographie · Arts visuels`
- `Écologie alpine · Environnement`
- `Escalade · Activités de pleine nature`

Domain metadata should appear wherever it improves:

- identification
- filtering
- discovery
- course context
- library reuse
- Forge contextual understanding

Do not reduce course identity to title + description alone.

---

## 9. Visual rules

Forge should feel:

- calm
- precise
- editorial
- contemporary
- dense without feeling crowded
- distinctive without becoming decorative

Prefer:

- typography
- alignment
- spacing
- quiet separators
- compact controls
- thin outline icons
- neutral surfaces
- restrained violet
- sparing editorial pink

Avoid:

- unnecessary card stacking
- large KPI-card dashboards
- strong shadows
- oversized controls
- hover translation
- decorative AI gradients
- generic chatbot bubbles
- large purple decorative areas
- inconsistent icon weights

Primary interaction targets should remain accessible and generally at least 44 px.

---

## 10. Responsive behaviour

Static mockups are desktop references, not fixed layouts.

Responsive implementation may adapt the composition while preserving hierarchy and context.

Existing validated behaviour should be preserved where stronger than the static reference, including:

- collapsible rails
- drawer fallback
- focus return
- Escape handling
- selection preservation
- route / query-state preservation
- sticky save behaviour where appropriate

Do not use responsive adaptation as a reason for unrelated visual reinterpretation.

---

## 11. Interactive reference site

Interactive DS 1.2 reference:

`https://forge-ds-1-2-interactive-reference.chandra-josephus.chatgpt.site/`

Use the Site primarily as a behavioural reference for:

- global navigation rail states
- contextual structure rail
- Forge `collapsed / docked / focus`
- Course overview
- Edit
- Learn
- Classroom
- Library

The Site is a prototype / living specification.

Do not copy its code architecture into the production Forge application.

Implementation must map validated interaction patterns onto the existing Next.js application, routes, components, state model and data layer.

---

## 12. Implementation guardrails

When using Codex to implement DS 1.2:

- inspect the existing implementation before editing
- reuse existing components where appropriate
- preserve routes and selection state
- preserve `courseId`, `moduleId`, `lessonId` and publication return context
- preserve Supabase behaviour and RLS
- preserve AI SDK behaviour unless explicitly in scope
- avoid schema changes for purely visual work
- avoid speculative backend work
- do not implement future product features merely because a visual reference exists
- add reusable components only when they reduce duplication or clarify the system
- document necessary divergences from the references

Every implementation sprint should define its own functional scope and stop condition.

---

## 13. Validation expectations

For DS 1.2 implementation work, validate at minimum:

- targeted tests
- typecheck
- production build
- no browser console errors
- keyboard focus
- Escape / close behaviour for panels and focus mode
- current route and selection preserved through rail changes
- 1440 px reference comparison
- intermediate desktop width
- mobile / drawer fallback where relevant

Visual validation should compare:

1. canonical PNG reference
2. interactive reference behaviour
3. real application constraints

The goal is convergence, not pixel-copying at the expense of the product.

---

## 14. Current implementation strategy

Recommended implementation sequence:

1. DS1.2-A — Forge Shell Foundation
2. DS1.2-B — UJ05 Course overview
3. DS1.2-C — UJ07 Edit + UJ06 Learn
4. DS1.2-D — UJ01 → UJ04 + UJ08
5. Phase 2 — UJ11 Library, UJ12 Explore, UJ13 Course detail
6. Future functional work — UJ09 Profile, UJ10 Classroom, UJ14 Team, UJ15 Settings

Future screens must not trigger backend or schema implementation until their product model is explicitly scoped.

---

## 15. Current sprint reference

For `Sprint 10.DS1.2-A — Forge Shell Foundation`, this README is the governing DS 1.2 reference.

The sprint must stop after the shell foundation is complete.

Do not continue into page-level redesigns unless explicitly requested.
