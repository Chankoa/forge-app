# F2 Create & Edit Audit

## Classification

| Contract | Decision | Forge use |
| --- | --- | --- |
| Owner course creation and owner-membership trigger | PORT | Authenticated creation sets `teacher_id`; existing trigger maintains owner membership. |
| Course/module/lesson writes and ordering | PORT | Server actions validate session and owner, then use existing tables and `display_order`. |
| Capability model | REUSE | Owner grants edit; enrollment independently grants learn. |
| Create, overview and editors | REWRITE | Built in canonical Forge routes and CourseWorkspace. |
| Course sources and storage | DEFER | Existing write policies include a historical global-role condition. F2 does not bypass it. |
| Forge provider execution | DEFER | No provider configuration is available locally. |

## Read-only LearnIt evidence

Consulted: `supabase/migrations/202606220002_lms_core.sql`, `20260907054237_role_neutral_authoring.sql`, `lib/repositories/supabase/teacherCourseRepository.ts`, `lib/forge-ai/service.ts`, `lib/forge-ai/validation.ts` and `lib/forge-ai/provider.ts`.

`courses.teacher_id` is ownership during this transition. The existing `sync_course_owner_membership` trigger creates an active owner membership. Owner RLS permits authenticated course/module/lesson writes scoped to the owner, without Forge using `profiles.role`.

`courses` is created as `draft` and `private`; module and lesson ordering use `display_order`. `course_sources` uses private bucket `course-sources` with a 10 MB and PDF/text/Markdown policy, but its observed storage/source write policy still requires a global role. No migration was created to change it.