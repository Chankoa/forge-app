# Forge media capabilities V1.1 — course cover generation

Extends the Forge Orchestrator (see `architecture-forge-orchestrator-v1.md`) with a first multimodal workflow. No second AI architecture: same capability registry, same server-side provider configuration, same injected-dependency services.

## Chain

```
course context (owner only, bounded)
 → generate_cover_brief   → VisualBrief           (proposal)
 → generate_cover_prompt  → CoverPrompt           (proposal)
 → generate_cover_image   → transient image       (transient_asset)
 → human review
 → "Utiliser cette image" → acceptGeneratedCoverAction → existing cover pipeline
```

Every step is an explicit user action. Nothing is generated on render, reopen, theme change or text edit. No automatic variants, no batch: one image per user action.

## Capabilities

Registered in `lib/forge/intelligence/capabilities.ts` (`mediaCapabilityDefinitions`, `resolveMediaCapability`). Each declares id, label, required context, input schema, output schema, mutation type, supported target (`course`), model resolver and `humanApproval: true`. Unknown capabilities are rejected; course-plan capabilities and media capabilities do not resolve each other.

## Provider separation

Capability ≠ provider ≠ model. Models are server-side environment configuration only, with no user-facing picker:

- text capabilities: `FORGE_COVER_TEXT_MODEL`, falling back to the default Forge model;
- image capability: `FORGE_COVER_IMAGE_MODEL`, **no fallback** (a text model is never used for images). When unset, generation reports "Forge n’a pas pu générer cette image."

Provider calls live in `lib/forge/intelligence/provider.ts` (`createCoverTextProvider`, `createCoverImageProvider`, AI SDK `generateImage`, `n: 1`). Services only see the `CoverTextProvider` / `CoverImageProvider` ports.

## Course context

Title, subtitle, description, domain, level, objectives (≤12), module titles (≤12). Excluded: discussions, emails, profile data, storage URLs, lesson bodies. Loaded by `createCoverRepository` and only for the course owner.

## VisualBrief

`subject, educationalIntent, audience, visualDirection, mood, composition, keyConcepts[1..6], preferredMetaphors[≤4], avoid[≤8], paletteDirection, imageStyle, textInImage (none|minimal), aspectRatio (3:2|16:9), accessibilityIntent, imageIntent (decorative|instructional)`. Strict schema; strings containing UUIDs, URLs, `undefined`/`null` are rejected. Covers default to `decorative`; `instructional` is reserved for future lesson illustrations.

## Prompt contract

Input: validated brief + course identity (title, subtitle, domain). Output: `prompt, avoid, aspectRatio, styleNotes, accessibilityNotes, altText`. The brief is authoritative: its aspect ratio is enforced and its avoid list is always merged in. No internal IDs.

## Image contract

Input: validated prompt + aspect ratio. The image is inspected from its bytes (PNG/JPEG/WebP signature, dimensions 256–8192 px, size/type through `validateCourseCoverUpload`). Output: `status, mimeType, size, width, height, previewUrl` (data URL). Provider metadata stays server-side. Failures are normalised to `provider_error | invalid_result | validation_error | permission_denied`; raw provider details are never returned.

## Transient generation

The preview is a base64 data URL held in client state only. No storage write, no table, no column. Cancelling discards it.

## Human approval and persistence boundary

Only `acceptGeneratedCoverAction` (`app/app/courses/cover-actions.ts`) persists. It re-inspects the uploaded bytes (the declared client type is not trusted), then calls the same `storeCover` used by manual upload (`setCourseCoverAction`): same bucket `course-covers`, same size/type rules, same path convention, same fields (`cover_storage_path`, `cover_mime_type`, `cover_file_size`), same cleanup on DB failure and same replacement semantics.

## Permissions

The existing cover contract is **owner-only** (`teacher_id === user.id`). Generation and acceptance follow it: owner yes; editor, viewer, learner and unrelated users no. Identity always comes from the server session. Extending to editors would change the existing cover contract and is deliberately out of scope.

## Cost control and observability

Separate process-local rate limiters for text and image (image ≤ 10/hour). Safe log lines: capability, provider, model, duration, validation result, image dimensions. No keys, no course content.

## Accessibility

An alt-text suggestion is shown in review. The product has no persisted cover alt-text field, so it is not stored (future readiness).

## Deferred

Video, storyboard, audio/voice, lesson illustration persistence, editor-level cover management, persistent alt text, a ForgeRail suggestion to start a cover.

## V1.2 � Lesson illustrations (figurative / conceptual)

**Visual purposes.** `cover` (existing, owner-only, unchanged), `figurative` (concrete scene/object/situation, no identifiable person) and `conceptual` (symbolic/abstract). Pedagogical diagrams are deferred.

**Capabilities.** `generate_visual_brief`, `generate_visual_prompt`, `generate_visual_image` (target `lesson`) reuse the cover schemas (`VisualBrief`, `CoverPrompt`, `CoverImageResult`), the text/image provider adapters and the same process-local rate limiters (image = 10/hour, shared with covers; the actions live in `cover-workflow-actions.ts`). The brief is normalised to landscape 16:9, no text in image.

**Context bounds.** Course title/subtitle/domain/level, module title, lesson title/description/objectives (= 8) and a body excerpt = 1500 characters with directives, URLs and UUIDs stripped. No discussions, learner data, emails, profiles, storage URLs or other lessons.

**Models.** The image model is `FORGE_COVER_IMAGE_MODEL` (no fallback; a text model is never used for images). The text model is `FORGE_COVER_TEXT_MODEL`, falling back to the default model. The UI never names a model. Prompts do not impose the Forge design system (no violet/lavender/SaaS branding).

**Lifecycle.** Generate ? transient data-URL preview (nothing persisted) ? explicit "Utiliser cette image". Regenerate re-runs only the image call with the same prompt; cancel persists nothing; there is no history.

**Accept and insertion.** `acceptGeneratedLessonImageAction` revalidates auth, lesson ownership in the course and permission, sniffs the bytes (PNG/JPEG/WebP, size, dimensions), requires alt text, then reuses `uploadCourseMediaAction` (bucket `course-media`, row in `course_media_resources`). The existing `:::image` directive (resource id + alt + optional caption) is inserted into the **local draft**; the lesson is persisted only through the usual **Save**. Compromise: the file and media row exist from acceptance, so abandoning the draft leaves an unreferenced media row (same as the manual upload flow).

**Alt text.** Proposed from the prompt (`altText`), editable, required. Caption is optional and never generated.

**Permissions.** Owner and active editor (`canEditLessons` + `canUploadMedia`); viewers, learners and unrelated users are denied on generate and accept.

**Course non-cover illustration.** Deferred: no canonical persistence slot exists besides the cover.
