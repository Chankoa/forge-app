# Forge AI reliability and traceability

## Request lifecycle

Conversation and contextual generation follow one bounded path: validated request, server-derived course context and capability check, optional owner-only source resolution, provider call with the configured timeout, strict schema validation, then an answer or an explicit proposal. `runForge` creates an opaque UUID operation ID for each request; it is returned in response metadata and included in structured telemetry. It is diagnostic metadata, never normal UI copy.

Course analysis already uses the plan UUID as its proposal correlation key. Media workflows use their short-lived brief/prompt/image sequence and persist only after explicit acceptance.

## Proposal and apply lifecycle

Generation never writes course data. A proposal is `proposal_ready` until the user applies it. Applying a lesson proposal changes only the local editor draft; the editor then reports **Appliquée au brouillon local**. Only the normal lesson save action makes it **Sauvegardée**.

Course-plan application is different: selected operations are server-persisted sequentially, each re-reading its target and `before` value. The result reports every operation as `success`, `stale`, `failed`, or `skipped`, followed by a verification read.

## Stale handling

Targeted lesson operations validate the selected range at application. Full lesson-content proposals now retain the observed base content and compare it with the current local draft before applying. A mismatch is rejected with: “Le contenu a changé depuis cette proposition. Relancez l’analyse.” No newer local draft is overwritten.

### Local draft / saved context (Sprint 18)

Lesson generation and analysis still read the persisted lesson through the server reader, never the unsaved editor text. The editor bridge now exposes its live draft, last successfully submitted save snapshot, and save-in-progress flag. Its registration is refreshed when these states change, so Forge panels react to typing, local proposal application, and save completion, not just text selection.

All lesson-scoped authoring requests (Analyze tasks, suggestions, Conversation, regeneration/adjustment, and empty-lesson generation) require a clean draft and a completed explicit save. The UI explains the prerequisite and disables the relevant controls; request handlers also recheck live bridge state. The normal save action remains the sole persistence path. Edits made while a save is in flight remain dirty because only the submitted snapshot is acknowledged.

Each successful local result retains a request-time fingerprint of the entire lesson draft in client memory. Later changes to content or lesson information mark proposals and coherence reviews obsolete, including changes made while the provider was running. Saving those edits does not make the old result current again. Obsolete proposals remain readable, but apply is disabled and guarded; a fresh successful request replaces the corresponding baseline. A failed regeneration preserves the previous result and its original baseline. The existing `baseContent` and selected-range checks remain independent application safeguards, including a sticky obsolete state when they report a conflict. The fingerprint is not sent to the server, persisted, logged, or used as an operation ID.

Course-level planning, learning mode, permission checks, publication, provider configuration, output validation, timeouts, and explicit retry policy are unchanged. This is a local UX consistency guard, not a cross-tab or multi-user versioning protocol. See the [Sprint 18 audit and executed scenarios](../audits/sprint-18-local-draft-forge-coherence.md).

## Analyze output contract

Lesson Analyze transformations have a minimal two-field envelope: a complete `rationale` and complete replacement `content`. `title`, `addition`, and `suggestions` are not part of this contract: title changes are out of scope, and additive work uses the separate bounded targeted-operation schema. Diagnostic coherence reviews return a summary plus zero to four findings and never contain a patch. The task instructions and native schema use this same envelope; this removes the contradictory `addition: null` instruction that previously made otherwise usable structured output fail validation.

An incomplete or malformed mutation is never applied. A normal diagnostic review can remain visible when it has passed its own schema. A non-`stop` provider completion with `length` is classified as `truncated_output` and shown as: “Forge n’a pas terminé son analyse. Aucun changement n’a été appliqué.” Other invalid shapes remain a retryable incomplete analysis. Each retry is a new request and emits a new opaque operation ID; no invalid proposal is reused.

For complete structured provider output, the application separately records a safe completion category (`unfinished_list`, `unfinished_ending`, `unclosed_fence`, or `at_limit`) without recording generated text. Short lesson rewrites request a concise proportional result rather than a large fixed-length expansion; the 3,800-character hard limit remains unchanged.

### Analyse recovery diagnostic (Sprint 17.1)

`finishReason: stop` confirms that the provider ended its structured response; it does not itself prove that the pedagogical text is complete. The `content_incomplete_unfinished_ending` category therefore means the strict transformation envelope was valid, but `content` ended without a terminal sentence delimiter. It is neither a transport truncation nor a missing-field/schema failure. Full-transform prompts now explicitly require the final `content` line to end with `.`, `!`, `?`, or `…`; the server-side completion check remains the authority and still refuses incomplete content. A deterministic test covers an incomplete response refusal followed by a new operation, a refreshed server baseline, and explicit local application of the valid replacement. No generated content is retained in telemetry.

## Retry rules

Provider failures and timeouts have an explicit user retry path. Provider adapters set `maxRetries: 0`; retries are always initiated by the user and generate a new operation ID. Apply is deliberately not retried automatically: a network failure can follow a write. Course-plan apply is consumed after its first attempt and requires a fresh analysis before another application.

## Error taxonomy

The canonical Conversation taxonomy is `invalid_request`, `unauthenticated`, `forbidden`, `context_unavailable`, `source_unavailable`, `not_configured`, provider authentication/network/not-found/error, `timeout`, `rate_limited`, `invalid_result`, and `result_too_long`. Provider payloads, secrets, signed URLs, full prompts and private source content are never exposed in UI diagnostics.

## Known limitations

The operation ID is intentionally lightweight rather than durable audit history. It currently correlates Conversation generation and local-proposal handling; course plans use `planId`. Media previews can be accepted into the media library before their reference is saved in a lesson draft; abandoned assets remain manageable in Library. No background job is created: calls remain within the configured provider timeout (default 60 seconds; image calls permit up to 90 seconds).
