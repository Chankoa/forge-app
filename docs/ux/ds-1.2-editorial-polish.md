# DS 1.2 E — Editorial polish

## Scope and files

- `app/app/page.tsx`, `components/forge/PublicIntentExperience.tsx`: moved the existing intention and proposal flow to the top of Workspace Home. The real course continuation list remains directly below it; Create and Explore links remain available.
- `components/course/CoursePresentation.tsx`, `components/course/DomainMetadata.tsx`: separated My Paths relationship, progress, publication state, and actions into stable columns; course domains now render as editorial metadata without a redundant field label. Explicit labels remain available to callers that need them.
- `components/course/CourseWorkspace.tsx`: moved real domain metadata above the course title, including the UJ05 identity area. Status, description, permissions, and routes remain unchanged.
- `components/authoring/CourseEditor.tsx`, `styles/globals.scss`: added a visible chevron to native module disclosures; refined their focus, inline rename fields, lesson rows, editor tabs, objective panel, and Markdown field. Native disclosure and save semantics remain unchanged.
- `components/learning/LessonContent.tsx`, `styles/globals.scss`: gave the existing learner renderer a bounded reading hierarchy, readable lists and quotations, distinct inline and block code, and a quiet objective callout. First-level Markdown headings now render as headings instead of raw text; code blocks scroll horizontally.
- `tests/domain-metadata.test.ts`, `tests/lesson-content.test.ts`: protect domain presentation, empty-data behavior, and semantic lesson rendering.

## Responsive choices

The My Paths grid uses aligned desktop columns, moves progress below identity at intermediate widths, and stacks metadata and actions beside the cover on mobile. The intention composer keeps a labelled Forge action on desktop and an accessible icon control on narrow screens. Existing shell drawers and bottom navigation are untouched.

## Reference differences and limits

The Home hero uses Forge's existing intention form and generation semantics, rather than prototype examples or unsupported actions. Learner quotations use the existing Markdown blockquote syntax; there is no reliable note/warning semantic in the current parser, so no such callouts were inferred. Creator rename fields retain explicit form submission instead of introducing inline autosave. Course data, progress, publication states, and domains remain real values.

The interactive reference could not be loaded during this pass. The governing README, canonical PNGs, and existing implementation notes informed the layout. Browser interaction and viewport verification remain pending because the local browser automation surface denied access to `localhost` in this session.

## Deferred

Structural reordering or deletion, richer semantic lesson blocks, new Forge actions or structural analysis, and unrelated DS 1.2 Phase 2 views remain outside this sprint.
