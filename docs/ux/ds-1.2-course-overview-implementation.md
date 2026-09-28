# DS 1.2 UJ05 — course overview convergence

## Scope and mapping

| Production element | UJ05 pattern | Decision |
| --- | --- | --- |
| Owner course root opened the Information cockpit tab | Course identity and overview first | Root now opens the overview; `?mode=edit` keeps the existing Information cockpit, its Structure and Sources tabs, and save actions. |
| Shared course title, status, domain and role markers | Editorial course identity | Reused `CourseWorkspace`, `Badge`, `DomainMetadata` and real course description; restrained atmosphere is scoped to the owner overview. |
| Context navigation | Compact course actions | Reused existing permission-derived destinations; editing is primary, while Learn, Preview and Publication remain secondary when allowed. There is no Share action in production. |
| Modules, lessons and duration | One metadata row and compact module list | Derived counts from the existing outline, shown duration only when stored or calculable from known lesson durations, and retained exact lesson and module edit routes. |
| Publication checklist | Items to finalize | Reused `getPublicationReadiness`; blocking and recommended messages stay distinct. A missing-content recommendation links to the first affected lesson. |
| Existing Forge rail | Contextual Forge panel | Kept the same course context, content and collapsed/docked/focus behaviour. |

## Files and behaviour

`app/app/courses/[courseSlug]/page.tsx` selects the owner overview on the canonical root route and passes the existing readiness result to `CourseEditor`. `components/course/OwnerCourseOverview.tsx` renders the summary, module rows and readiness items. `components/authoring/CourseEditor.tsx` retains the editing tabs and opens Structure for existing `?mode=edit#module-…` links. `components/course/CourseWorkspace.tsx` and `CourseContextNavigation.tsx` adapt only the owner overview header and action group. `WorkspacePanels.tsx` starts Structure compact on the overview and restores its normal state on editing routes. Styles are scoped in `styles/globals.scss`.

At 1279 px and below, existing Structure and Forge drawers remain in use. At mobile widths the primary course action leads the horizontally scrollable action row. The bottom-navigation inset from DS1.2-A.1 remains active.

## Data constraints and intentional differences

The current model supplies no preparation percentage, last-update value, sub-domain, module readiness status or source count for this screen. None is simulated. The current publication rule blocks only a course without lessons and recommends filling empty lesson content; the reference's three specific issues and score are not represented. Publication remains on its existing route. No `from=publication` return parameter exists in the current production flow, so this sprint does not introduce one.

Further page convergence for Learn, Edit, Publication and other User Journey screens is deferred to their own sprints. No Supabase, schema, RLS, API, AI SDK or publication rule was changed.
