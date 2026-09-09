# F1 Discover & Learn Audit

## Port classification

| Element | Decision | Forge use |
| --- | --- | --- |
| `courses`, modules and lessons | PORT | `lib/courses/learning-repository.ts` reads the established course hierarchy. |
| Enrollment and progress relationships | PORT | Session-scoped repository reads and server actions write established tables. |
| Progress and resume rules | PORT | `lib/learning/progress.ts` is the deterministic Forge adapter. |
| Course overview, lesson reader, cards | REWRITE | Canonical Forge routes and DS1 surfaces replace historical UI. |
| Forge Learning provider and source retrieval | DEFER | Provider environment is not configured; no mock generation is presented. |

## Observed backend contract

LearnIt migrations consulted read-only: `202606220002_lms_core.sql`, `20260903091000_harden_enrollment_rls_helpers.sql`, `20260903100000_course_memberships_foundation.sql`, and `20260903110000_role_neutral_learning_access.sql`.

- `courses`: `id`, `domain_id`, `slug`, `title`, `subtitle`, `description`, `status`, `visibility`, `duration_minutes`.
- `course_modules`: `id`, `course_id`, `slug`, `title`, `display_order`.
- `lessons`: `id`, `course_id`, `module_id`, `slug`, `title`, `description`, `content`, `objectives`, `duration_minutes`, `display_order`.
- `enrollments`: unique `(user_id, course_id)` and learning status/current lesson fields.
- `lesson_progress`: unique `(user_id, lesson_id)`, completed state and timestamps.

RLS is enabled. Existing policies permit a signed-in person to manage their own enrollment and progress. The hardened role-neutral policies permit reads of enrolled published course content; public published courses remain browseable. F1 does not apply any database migration or policy change.

`content_path` is metadata in LearnIt. The active reading contract is `lessons.content` Markdown, with title, paragraphs, headings, lists and objectives rendered in F1.