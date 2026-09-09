# F3 Publish & Dual Capability Audit

## Classification

| Element | Decision | Forge implementation |
| --- | --- | --- |
| Course publication fields and owner update policy | REUSE | `status`, `visibility`, `availability`, and `published_at` are updated through an authenticated server action. |
| Module/lesson publish state | PORT | Existing statuses are moved to `published`, except `locked` records. |
| Public discoverability | PORT | Explore reads only `status = published` and `visibility = public`. |
| Enrollment and ownership aggregation | REUSE | Owner and enrollment remain independent relationships, aggregated by course id. |
| Publication UI | REWRITE | A compact CourseWorkspace surface replaces legacy authoring UI. |
| Participants | DEFER | Existing RLS does not justify an owner-visible enrollment list in Forge. |

## Existing backend contract

Read-only LearnIt references: `supabase/migrations/202606220002_lms_core.sql`, `20260903110000_role_neutral_learning_access.sql`, `20260907054237_role_neutral_authoring.sql`, and `lib/repositories/supabase/teacherCourseRepository.ts`.

`courses.status` supports `draft`, `published`, and `archived`; `visibility` supports `public`, `private`, and `unlisted`; `availability` supports `preview`, `complete`, and `coming-soon`; `published_at` is set only when publishing. Owner update RLS validates `teacher_id = auth.uid()` and an active account. Public reads require published/public. Self-enrollment requires the same published/public condition, so an owner can explicitly enroll in their public course with the normal user-session flow.

F3 uses no service role, no new table, migration, trigger, or policy. Readiness blocks only courses with no lesson. Empty lesson content is a recommendation, not a publication blocker.