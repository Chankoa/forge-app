# Forge AI reliability and traceability

## Request lifecycle

Conversation and contextual generation follow one bounded path: validated request, server-derived course context and capability check, optional owner-only source resolution, provider call with the configured timeout, strict schema validation, then an answer or an explicit proposal. `runForge` creates an opaque UUID operation ID for each request; it is returned in response metadata and included in structured telemetry. It is diagnostic metadata, never normal UI copy.

Course analysis already uses the plan UUID as its proposal correlation key. Media workflows use their short-lived brief/prompt/image sequence and persist only after explicit acceptance.

## Proposal and apply lifecycle

Generation never writes course data. A proposal is `proposal_ready` until the user applies it. Applying a lesson proposal changes only the local editor draft; the editor then reports **Appliquée au brouillon local**. Only the normal lesson save action makes it **Sauvegardée**.

Course-plan application is different: selected operations are server-persisted sequentially, each re-reading its target and `before` value. The result reports every operation as `success`, `stale`, `failed`, or `skipped`, followed by a verification read.

## Stale handling

Targeted lesson operations validate the selected range at application. Full lesson-content proposals now retain the observed base content and compare it with the current local draft before applying. A mismatch is rejected with: “Le contenu a changé depuis cette proposition. Relancez l’analyse.” No newer local draft is overwritten.

## Retry rules

Provider failures and timeouts have an explicit user retry path. Provider adapters set `maxRetries: 0`; retries are always initiated by the user and generate a new operation ID. Apply is deliberately not retried automatically: a network failure can follow a write. Course-plan apply is consumed after its first attempt and requires a fresh analysis before another application.

## Error taxonomy

The canonical Conversation taxonomy is `invalid_request`, `unauthenticated`, `forbidden`, `context_unavailable`, `source_unavailable`, `not_configured`, provider authentication/network/not-found/error, `timeout`, `rate_limited`, `invalid_result`, and `result_too_long`. Provider payloads, secrets, signed URLs, full prompts and private source content are never exposed in UI diagnostics.

## Known limitations

The operation ID is intentionally lightweight rather than durable audit history. It currently correlates Conversation generation and local-proposal handling; course plans use `planId`. Media previews can be accepted into the media library before their reference is saved in a lesson draft; abandoned assets remain manageable in Library. No background job is created: calls remain within the configured provider timeout (default 60 seconds; image calls permit up to 90 seconds).
