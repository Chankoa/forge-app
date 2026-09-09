# F2 Handoff

## DONE

Create accepts a free-form intent and supports manual draft creation. Course overview and lesson routes reuse CourseWorkspace in canonical `?mode=edit`. Owner-gated server actions persist course metadata, modules, lessons and Markdown lesson content. My Courses deduplicates owned and enrolled relationships and labels them on one card.

## VERIFIED BY TEST

F2 tests validate intent constraints/local preview, and the owner-only versus owner-plus-enrollment capability combinations. Existing F0/F1 capability, redirect, mapping and progress tests remain active.

## VERIFIED IN BROWSER

Unauthenticated route protection, light/dark shell, and responsive public/auth surfaces are browser-smoked. Real authoring writes need an authenticated shared Supabase session.

## AUTH SESSION REQUIRED

Use an existing account to create a draft, save metadata, add a module and lesson, save Markdown, reload, and verify My Courses plus Learn/Edit switching when enrolled.

## AI ENV REQUIRED

No provider/model is configured. ForgeRail exposes authoring intents as disabled controls and states that a proposal always needs explicit application. No generated content is written automatically.

## SOURCE PIPELINE STATUS

Deferred. `course_sources` and `course-sources` were audited but their observed authoring policies still rely on a historical global-role check; F2 does not introduce a bypass or RLS migration.

## DEFERRED TO F3

Publication controls, participants, invitations and the complete dual-capability experience.

## DEBT

Provider-backed structured proposals, source-aware authoring, source upload/ingestion, rename/reorder/delete tools and full Markdown preview remain follow-up work. Migration DB: none.