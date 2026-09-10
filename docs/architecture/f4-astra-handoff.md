# F4.A Astra Handoff

## IMPLEMENTED BY ASTRA

- Strict Forge request/result contracts, shared Learn/Edit service, session-bound context loading, source resolver, provider adapter, process-local rate limit, Server Action, structural tests, architecture and RLS audit.
- Read-only Forge generation: no provider, repository, context or source module exposes authoring writes.

## ARCHITECTURAL DECISIONS

- `app/app/forge/actions.ts` is the sole generation entry point.
- Context and selected sources are reloaded and authorized server-side. The client sends only slugs, an intent, optional input, and source IDs.
- Learn needs enrollment; Edit needs ownership; no global profile role is used.

## DO NOT REWRITE

- Keep `runForge`, `buildForgeContext`, `resolveForgeSources`, the provider adapter, and the existing authoring mutations as separate responsibilities.
- Generation returns only a proposal for Edit. It never writes course or lesson data.

## SOURCE/RLS FINDINGS

- Current source and Storage policies are relation/capability-based, private Storage is used, and no migration is needed.
- `ready` is insufficient: only real extracted text or an authenticated TXT/MD download is usable. PDFs without extracted text are excluded.

## AI CONFIG

- Server-only configuration uses existing `OPENAI_API_KEY`/`AI_API_KEY`, `OPENAI_MODEL`/`AI_MODEL`, `AI_PROVIDER`, `AI_BASE_URL`, timeout and Forge bounds. No default model or client secret exists.

## KNOWN LIMITATIONS

- The rate limiter is per-process and non-persistent.
- Markdown rendering remains intentionally basic.
- Provider and session E2E require local credentials and an authenticated user.

## TO IMPLEMENT BY TERRA

- Wire the existing rail, source selection, free input, controlled errors and explicit proposal application to the existing editor draft.

## TEST STATUS

- Astra baseline validated: lint, typecheck, test (61), build and `git diff --check` pass.

## BROWSER STATUS

- No authenticated browser/provider smoke was completed in this environment.