# F7 — URL sources and provenance

## Audit before implementation

The observed `course_sources` catalog is documented in `f4-forge-intelligence-architecture.md` (read-only live audit, 2026-09-10). It has `type=web`, `source_kind=url`, `original_url`, `extracted_content`, `extraction_status=pending|ready|error`, `extraction_error`, `metadata` JSONB, and nullable file storage fields. A ready non-file record requires nonblank extracted content. URL rows already existed in the audited backend. **DB migration: NO.** Runtime schema is not independently re-audited in this checkout.

RLS observed in F4 enables owner insert/read/update/delete when `teacher_id=auth.uid()`, the account is active, and `teacher_owns_course(course_id)`; enrolled learners can read ready sources for published courses. Runtime uses the authenticated Supabase SSR client and owner check, with no service role.

Current path: Resources tab uploads TXT/MD through `uploadForgeSourceAction` into private Storage and `course_sources`; `listForgeSourcesAction` exposes RLS-visible choices to `ForgeRail`; selected IDs reach `buildForgeContext` → `resolveForgeSources` → `boundForgeContext` → JSON `knowledge.sources` in `forgeMessages` → AI SDK provider. `runForge` derives `sourcesUsed` from the final bounded nonempty `context.sources`, not from selected IDs or provider output. Existing resolver intentionally excludes `web/url` rows.

`package.json` has no direct HTML parser dependency; no `parse5`, `htmlparser2`, or `cheerio` package is installed. The F7 implementation must add a small parser or use a carefully bounded extraction strategy. Next 16.3.4 Server Action guidance in `node_modules/next/dist/docs/01-app/02-guides/server-actions.md` was read: action inputs require server-side auth, authorization and validation.

## Architecture and persistence

The existing Resources tab offers File and URL. `addForgeUrlSourceAction` validates the URL again on the server, authenticates via Supabase SSR, checks `courses.teacher_id === user.id`, fetches and extracts text, then inserts one `course_sources` row through the session client. It writes `type=web`, `source_kind=url`, final canonical `original_url`, MIME type, nonblank `extracted_content`, `extraction_status=ready`, and `metadata.rawChars` / `metadata.extractedChars`. There is no Storage object. A failed fetch, extraction, or insert leaves no ready row. The schema's `error` status could support a persisted failure, but F7 avoids persisting an unusable URL. No migration is needed or applied.

The URL resolver accepts only `web/url` rows with ready, nonblank extracted text. The existing TXT/MD paths remain intact. `boundForgeContext` caps each source at 4,000 characters within `FORGE_AI_MAX_INPUT_CHARS`; `contextCharsUsed` depends on the final shared context budget and is therefore not claimed in ingestion metadata. `runForge` derives `sourcesUsed` only from the final bounded, nonempty source array forwarded to the provider. It means “provided to Forge”, not verified sentence citations.

## Security model

Only HTTP(S), no credentials. Localhost, obvious internal suffixes, single-label names, private/reserved IPv4, loopback, link-local, ULA, multicast, unspecified and mapped IPv6 are rejected. Each hop resolves all DNS answers and rejects the whole hostname if any answer is nonpublic. The HTTP(S) connection uses a custom lookup callback pinned to one previously validated public address, keeping the checked address equal to the connected address despite DNS rebinding. Redirects are handled manually, with a maximum of three, relative `Location` resolution, full URL/DNS revalidation, and loop rejection. This prevents redirect hops to private targets. A 10-second total deadline covers DNS and connection/body transfer. The body is streamed with an actual 2 MiB byte cap independent of `Content-Length`.

Allowed response MIME types are `text/html`, `text/plain`, and `application/xhtml+xml`; PDF, media, JSON, binaries and archives fail. HTML extraction removes scripts, styles, noscript, SVG, nav, header, footer, aside, forms and obvious hidden elements, preserves rough heading/paragraph/list line breaks, decodes common and numeric entities, and stores at most 100,000 extracted characters. It does not execute remote JavaScript. The bounded extraction is intentionally not a full HTML parser: malformed HTML, complex visibility CSS, and semantically dense navigation may reduce quality. A parser dependency installation was attempted but did not complete in this network restricted workspace; no dependency was added.

The system prompt already says all `knowledge`, including sources, is untrusted data. Source text is JSON encoded in the user prompt, separate from system behavior. A hostile instruction in source text cannot become a system instruction through prompt construction; model compliance cannot be guaranteed absolutely. `sourcesUsed` is server derived, never provider supplied.

## Verification and known limits

Unit tests cover URL protocol/host/IP/credential rejection, extraction, empty content, ready/failed source resolution, and hostile source placement. Existing Forge tests cover owner capabilities, TXT/MD paths, bounded context and provenance. A real `https://example.com` fetch was attempted locally and returned `fetch_failed` in the restricted environment, so authenticated source persistence, real provider generation, mobile/browser QA and console checks are **not verified**. The live schema/RLS audit is historical F4 evidence, not a fresh live F7 catalog check. No browser claim should be marked PASS without an authenticated session and network access.
