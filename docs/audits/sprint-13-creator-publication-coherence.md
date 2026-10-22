# Sprint 13 — Creator → publication coherence audit

## Canonical lifecycle contract

- `courses.status` is the only lifecycle state: `draft`, `published`, or `archived`.
- `courses.visibility` is independent discoverability: `public` enters the public catalogue only when the course is published; `private` remains available to enrolled learners only when published.
- `courses.published_at` records active publication. `availability` is the existing presentation field (`preview`/`complete`), not a second lifecycle model.
- Archive is an explicit, separate existing transition: it moves a draft or published course to archived/private/preview and restore moves it to draft/private/preview. It does not delete enrollments, progress, course resources, media, or discussion data.

## Canonical creator map

| Surface | Route / component | Server action / repository | Capability | Fields and RLS boundary |
| --- | --- | --- | --- | --- |
| Create and course brief | `/app/create`, `CreateCourseForm` | `createCourseAction` | authenticated creator | `courses`, modules, lessons; creator insert policy |
| Creator overview and metadata | `/app/courses/[courseSlug]`, `CourseEditor` | `saveCourseMetadataAction`, `learning-repository` | owner/editor metadata; visibility owner-only | `courses.title`, `subtitle`, `description`, `domain_id`, `visibility`; editor trigger limits fields |
| Structure | `CourseStructureEditor` | module/lesson add, rename, move actions | owner/editor bounded authoring | `course_modules`, `lessons`; editor RLS and triggers |
| Lesson editor and preview | `/app/courses/[courseSlug]/lessons/[lessonSlug]` | `saveLessonAction`, media actions | owner/editor lessons | `lessons.content`; media metadata RLS; directives retain IDs only |
| Cover | `CourseCoverManager` / `CoverStudioView` | cover actions / cover repository | owner cover management | course cover fields and Storage policy |
| Pedagogical resources | resource routes and Library | resource actions / resource repository | owner resource management; enrolled published learner read | `resources`; learner resource RLS |
| Forge sources | `ForgeSourceResources` | Forge source repository/actions | owner only | source metadata and Storage are owner-only |
| Publication | `PublicationPanel` | `publishCourseAction`, `unpublishCourseAction` | owner only | `status`, `visibility`, `availability`, `published_at`; action and RLS owner checks |
| Archive / restore / delete | availability destination | archive, restore, delete actions | owner only | lifecycle fields; delete preflight uses draft + zero enrollments + zero storage refs |
| Public detail and Explorer | `/courses/[courseSlug]`, Explorer | public-course repository / public discovery RPC | public reader | published + public projection only |
| Learner access | `/app/courses/[courseSlug]` and lesson route | learning repository / completion action | enrolled learner | published status required; enrollment and progress persist when unpublished |

## Actual readiness contract

Only one condition blocks publication: at least one lesson must exist. Empty lesson content is advisory, with a deep link to the exact first incomplete lesson. The server recomputes readiness from the canonical course detail before publication; the client button is not trusted.

## Findings and targeted repair

The previous actions overwrote visibility to public on publish and private on unpublish, contradicting the separate visibility field and preventing public courses from returning public after an unpublish/republish cycle. Sprint 13 now preserves the saved owner visibility through both transitions; its current value is shown and editable in metadata. Publication and unpublication also reject invalid lifecycle transitions server-side and revalidate lesson routes so learner access updates without a hard refresh.

## Browser QA limitation

The local application redirects to authentication and no safe QA creator account was supplied. No account was created and no production data was modified. Browser checks requiring owner/editor/viewer/learner sessions therefore remain `PARTIAL` or `N.A.`; static/component and server-contract coverage is recorded by the test suite.
