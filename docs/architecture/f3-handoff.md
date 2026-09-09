# F3 Handoff

## DONE

Publication is a canonical `?mode=publication` surface in CourseWorkspace. It checks real course structure, publishes the existing object as `published/public/complete`, records `published_at`, and invalidates Explore, My Courses, and the overview. Depublish returns it to `draft/private/preview` without deleting modules, lessons, enrollments, or progress.

## VERIFIED BY TEST

Readiness, owner publication capability, enrollment-only restriction, and owner-plus-enrollment aggregation are tested alongside earlier F0-F2.1 contracts.

## VERIFIED IN BROWSER

Public shell, authenticated-route redirect, dark theme, and mobile no-overflow are smoke-tested. The real publish/enroll sequence needs a shared Supabase authenticated session.

## AUTH SESSION REQUIRED

Validate draft -> publish -> Explore -> self-enroll -> `J'apprends · Je crée` -> Learn/Edit -> reload using a real active account. No password was requested or simulated.

## PUBLICATION MODEL

Discoverable means `status = published` and `visibility = public`. Unpublish is non-destructive and does not create or remove enrollments.

## DUAL CAPABILITY

Relationships aggregate by `course.id`; owner grants edit/publish and enrollment grants learn. Owner alone can publish/edit but cannot learn; self-enrollment is explicit after publication.

## PARTICIPANTS STATUS

Deferred: no enrollment list is exposed because the existing RLS surface was not proven suitable for it.

## DEFERRED

Sources, storage, provider-backed Forge, collaboration, invitations, versioning, and marketplace remain outside F3.

## DEBT

The known partial Markdown renderer and occasional non-F3 authoring refresh issue remain. Migration DB: none.