# F0 Handoff

## DONE

Canonical PublicShell, AppShell and CourseWorkspace; DS1 SCSS tokens/themes; capability contract; auth/session boundary; canonical routes; real Supabase Explore repository; explicit DEV workspace fixture.

## VERIFIED BY TEST

Capabilities and safe redirect have focused `node:test` coverage. Final command results are recorded in the sprint report.

## VERIFIED IN BROWSER

Pending local development-server smoke validation.

## ENV REQUIRED

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the existing LearnIt project in `.env.local`. No keys are committed. Without them, Explore and auth label the requirement and Workspace protection remains permissive for local UI review.

## DEFERRED TO F1

Course detail repository mapping, real relations in My Courses, enrollment, progress and live lesson content.

## DEBT

The exact LearnIt `courses` column schema requires a focused contract port before live course pages replace the explicit DEV fixture. `profiles.role` has no Forge runtime use and no compatibility adapter was needed in F0.

## Migration record

Ported: only reimplemented Supabase, auth, safe redirect and relationship-capability concepts. Rewritten: all UI, shells, navigation, course rail and Forge rail. Deliberately abandoned: historical learner/teacher shells, routes and CSS.