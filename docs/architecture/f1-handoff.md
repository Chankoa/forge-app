# F1 Handoff

## DONE

Explore reads enrollment state, supports idempotent self-enrollment, and redirects to the Forge overview. My Courses reads actual enrolled relationships. Overview and lesson routes read the actual course hierarchy; lesson completion persists through the existing `lesson_progress` and `enrollments` tables. Resume is shared and deterministic.

## VERIFIED BY TEST

Capabilities, safe redirects, Explore mapping, progress percentage and resume resolution are covered by `node:test`.

## VERIFIED IN BROWSER

Unauthenticated/public surfaces can be inspected locally. Authenticated enrollment and persisted progress require a valid existing Supabase session.

## AUTH SESSION REQUIRED

Validate the full sequence with a user account that can access the shared LearnIt Supabase project: enroll, start, complete, reload and resume.

## AI ENV REQUIRED

ForgeRail receives true course/lesson context. It exposes its learning intentions but clearly disables them while no server AI provider configuration is present. No client key, mock answer or anonymous provider call exists.

## DEFERRED TO F2

Forge provider execution, source-aware retrieval, full Markdown/callout parity, authoring and creation workflows.

## DEBT

Course detail reads return a conservative unavailable state for an RLS/query failure; F1 deliberately does not expose backend error detail to users. No `profiles.role` exception was required. Database migration: none.