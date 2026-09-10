# F4 Forge Intelligence & Sources Handoff

## ASTRA BASELINE

Recovered on `f4-forge-intelligence-sources` from `9820bed`; Astra's uncommitted Forge files were preserved. Lint, typecheck, 61 tests, build and diff check passed before Terra work.

## IMPLEMENTED BY TERRA

- `ForgeRail` now invokes `generateForgeAction` for all Learn/Edit intents and a free question (`explain` with `input`).
- The rail presents loading and all stable response errors without affecting `CourseWorkspace`.
- A source metadata action returns only RLS-visible source labels/types/usability. The resolver remains the server authorization boundary.
- Edit results are clearly proposals. Explicit Apply opens and populates the local existing lesson form only; it never calls a save mutation.

## FORGE LEARN

Learn buttons use the persisted course/module/lesson context loaded by `runForge`. Free questions use the same action and request contract.

## FORGE EDIT

Edit results are rendered as `Proposition Forge`; content, summary and objectives can be applied to the local lesson form. Structural-outline proposals remain review-only.

## HUMAN APPROVAL

Generate has no mutation capability. Apply changes a browser form field; `saveLessonAction` remains the distinct persistence action.

## PROVIDER

No AI configuration was detected in `.env.local`. `.env.example` lists the server-side configuration names. Provider real smoke: AI ENV REQUIRED.

## SOURCES

The existing `course_sources` schema is reused. The UI labels only RLS-visible sources and marks usable text/markdown content separately from not-ready, unsupported, or unextracted content.

## SOURCE-AWARE

Selected IDs are revalidated by the existing resolver and only source text actually forwarded can populate `sourcesUsed`. Real source/provider E2E: BLOCKED BY DATA AND AI ENV.

## PDF STATUS

PDF extraction is deferred. PDFs with no extracted text are excluded and shown as not exploitable.

## RLS

Role-neutral source and Storage policy audit is recorded in `f4-forge-intelligence-architecture.md`. Migration: NONE.

## RATE LIMIT

The limiter is process-local, non-distributed and non-persistent; it is suitable only as a prototype guard.

## MARKDOWN

Stored lesson Markdown and Forge response rendering remain basic text-safe rendering; no raw HTML is used.

## VERIFIED BY TEST

Existing 61 tests validate request boundaries, capability combinations, source filtering, provider errors, output validation and no-write service behavior. Final command verification is required after this handoff.

## VERIFIED IN BROWSER

NOT VERIFIED: authenticated session and AI environment were unavailable.

## AUTH SESSION REQUIRED

Yes, for live Learn/Edit/source flows.

## AI ENV REQUIRED

Yes, for real provider smoke.

## DEFERRED

- PDF extraction/ingestion.
- TXT/MD upload: no upload UI was added because a real safe upload smoke was not available.
- Distributed rate limiting and citation-level source attribution.

## DEBT

- Replace the local proposal bridge when the F2 editor is refactored to controlled draft state.
- Add a sanitized shared Markdown renderer for richer lesson/proposal previews.