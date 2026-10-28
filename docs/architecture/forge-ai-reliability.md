# Forge AI reliability and traceability

## Request lifecycle

Conversation and contextual generation follow one bounded path: validated request, server-derived course context and capability check, optional owner-only source resolution, provider call with the configured timeout, strict schema validation, then an answer or an explicit proposal. `runForge` creates an opaque UUID operation ID for each request; it is returned in response metadata and included in structured telemetry. It is diagnostic metadata, never normal UI copy.

Course analysis already uses the plan UUID as its proposal correlation key. Media workflows use their short-lived brief/prompt/image sequence and persist only after explicit acceptance.

## Proposal and apply lifecycle

Generation never writes course data. A proposal is `proposal_ready` until the user applies it. Applying a lesson proposal changes only the local editor draft; the editor then reports **Appliquée au brouillon local**. Only the normal lesson save action makes it **Sauvegardée**.

Course-plan application is different: selected operations are server-persisted sequentially, each re-reading its target and `before` value. The result reports every operation as `success`, `stale`, `failed`, or `skipped`, followed by a verification read.

## Stale handling

Targeted lesson operations validate the selected range at application. Full lesson-content proposals now retain the observed base content and compare it with the current local draft before applying. A mismatch is rejected with: “Le contenu a changé depuis cette proposition. Relancez l’analyse.” No newer local draft is overwritten.

## Analyze output contract

Lesson Analyze transformations have a minimal two-field envelope: a complete `rationale` and complete replacement `content`. `title`, `addition`, and `suggestions` are not part of this contract: title changes are out of scope, and additive work uses the separate bounded targeted-operation schema. Diagnostic coherence reviews return a summary plus zero to four findings and never contain a patch. The task instructions and native schema use this same envelope; this removes the contradictory `addition: null` instruction that previously made otherwise usable structured output fail validation.

An incomplete or malformed mutation is never applied. A normal diagnostic review can remain visible when it has passed its own schema. A non-`stop` provider completion with `length` is classified as `truncated_output` and shown as: “Forge n’a pas terminé son analyse. Aucun changement n’a été appliqué.” Other invalid shapes remain a retryable incomplete analysis. Each retry is a new request and emits a new opaque operation ID; no invalid proposal is reused.

For complete structured provider output, the application separately records a safe completion category (`unfinished_list`, `unfinished_ending`, `unclosed_fence`, or `at_limit`) without recording generated text. Short lesson rewrites request a concise proportional result rather than a large fixed-length expansion; the 3,800-character hard limit remains unchanged.

## Retry rules

Provider failures and timeouts have an explicit user retry path. Provider adapters set `maxRetries: 0`; retries are always initiated by the user and generate a new operation ID. Apply is deliberately not retried automatically: a network failure can follow a write. Course-plan apply is consumed after its first attempt and requires a fresh analysis before another application.

## Error taxonomy

The canonical Conversation taxonomy is `invalid_request`, `unauthenticated`, `forbidden`, `context_unavailable`, `source_unavailable`, `not_configured`, provider authentication/network/not-found/error, `timeout`, `rate_limited`, `invalid_result`, and `result_too_long`. Provider payloads, secrets, signed URLs, full prompts and private source content are never exposed in UI diagnostics.

## Known limitations

The operation ID is intentionally lightweight rather than durable audit history. It currently correlates Conversation generation and local-proposal handling; course plans use `planId`. Media previews can be accepted into the media library before their reference is saved in a lesson draft; abandoned assets remain manageable in Library. No background job is created: calls remain within the configured provider timeout (default 60 seconds; image calls permit up to 90 seconds).
