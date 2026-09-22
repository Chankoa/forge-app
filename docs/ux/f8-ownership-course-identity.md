# F8 - Ownership, Course Identity & Library UX

## Initial audit

`Mes parcours` is supplied by `listMyCourses` in `lib/courses/learning-repository.ts`. It combines the authenticated user's `enrollments` with `courses.teacher_id`, resolves each course detail, and returns one item per course with its learning state and `isOwner`. Ownership is therefore `courses.teacher_id === auth.uid()`; enrollment is the current user's `enrollments` relation. A course that satisfies both remains one item.

Learning progress comes from the current user's `lesson_progress` records for an enrolled course. `progressPercentage` computes the percentage from the actual course outline and completed lesson IDs. Owner-only courses have no enrollment and must not render learner progress.

`Explorer` is supplied by `listDiscoverableCourses` in `lib/courses/explore-repository.ts`. It reads only `courses` with `status = published` and `visibility = public`, then checks whether the current user is enrolled. It does not calculate owner state or learner progress.

The real course query already joins `domains(name)` in the learning repository. The presentation fallback is now canonicalized as `Sans domaine`; no hardcoded domain labels are used. The Explore query can safely project the same existing `domains(name)`, `description`, and pedagogical metadata fields without a new table or migration.

Before F8, both pages render the same `CourseCard` inside `.course-grid`. This is the direct cause of their catalogue-like visual similarity.

## Backend audits

### Cover

Cover backend support: **NO**. The client contract has only the defensive `hasCourseCover` check. No usable course cover column, upload action, storage operation, bucket policy, or owner upload RLS contract is present in this checkout. Historical references to `course-covers` are not an application contract. F8 keeps the Forge placeholder and does not add a migration or an upload UI.

### Deletion

Course deletion backend support: **PARTIAL / unproven**. `OwnerCourseMenu` intentionally keeps `Supprimer` disabled because course DELETE RLS and all FK/cascade outcomes are unavailable here. Historical F4 evidence only shows that `course_sources.course_id` is `ON DELETE SET NULL`; it does not prove course module, lesson, enrollment, lesson progress, generation, classroom, or storage cleanup behavior. F8 must not enable deletion or create a DELETE action.

## F8 presentation decisions

### Mes parcours vs Explorer

| Mes parcours | Explorer |
| --- | --- |
| personal | public |
| relational | content-first |
| operational | discovery |
| compact horizontal list | editorial grid |
| real learner progress | minimal personal CTA state |
| owner actions when applicable | no owner controls |

`Mes parcours` uses a dedicated, dense row composition with relationship badges, owner publication state, optional real progress, and a primary next action. It has a client-side relation filter; this is a view filter only, never a role switch.

`Explorer` keeps a more spacious card grid and emphasizes course identity, description, pedagogical metadata, and discovery. It does not render owner menus or detailed learner progress.

Shared primitives are limited to `CourseCover`, `DomainLabel`, `RelationPills`, `PublicationStatus`, `ProgressIndicator`, and the existing action semantics. The row and grid-card compositions are separate.

## Implementation status

`CourseLibrary` is the client boundary for the accessible `Tous`, `J’apprends`, and `Je crée` view filters. `matchesCourseRelation` is centralized and includes a dual owner/enrollment course in each applicable filter without duplicating its row. `PersonalCourseRow` and `ExploreCourseCard` are distinct compositions that share only the presentation primitives. `mapExploreCourse` now preserves the existing public `description`, `duration_minutes`, and `domains(name)` projection.

## Responsive and QA intent

Desktop library rows scan left-to-right; tablet compresses supporting metadata; mobile preserves the relation, state, and next-action order in a compact stacked row. Explorer remains a discovery grid at every breakpoint. Both use the established design tokens, visible focus treatment, and calm dark surfaces. Browser QA will cover 1440, 900, 430, and 390 pixels; relation filters, no duplication, owner controls, dark mode, keyboard flow, and console health.

## Browser QA completed

Authenticated local QA found seven library rows and six public discovery cards. `Mes parcours` had no `ExploreCourseCard`; `Explorer` had no personal rows or owner menu. The real dataset currently has no domain values, so `Sans domaine` was visibly used rather than the misleading legacy `Parcours` label. The projection and unit test cover a populated domain.

The `Je crée` filter returned two owner rows. Both were also enrolled, displayed both canonical relation badges, and remained one row each. Their primary action was `Gérer`; the direct secondary learning entry remained available. Learner rows at zero progress showed `Commencer`; the partially completed row showed `Continuer`; no owner-only learner progress was rendered.

The owner menu retained a disabled `Supprimer` action and the cascade/RLS explanation. No delete request is exposed. Dark Explorer cards rendered `rgb(22, 26, 35)` with `rgb(241, 245, 249)` text. At 1440, 900, 430, and 390 pixels, both routes had no horizontal overflow. The browser console had no errors. Filters are semantic native buttons with `aria-pressed` and visible focus; the shared browser runner did not dispatch its synthetic Space activation despite a focused native button, while its native click exercised the state transition.

## Blockers

- No live migration/RLS catalog is available in this checkout, so cover upload and deletion remain deliberately unavailable.
- No database migration is planned or applied for F8.