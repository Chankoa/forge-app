# F4.A — Forge Intelligence & Sources

Architecture pass, 2026-09-10. Branch `f4-forge-intelligence-sources`, initial HEAD `9820bed`.
F0–F3 routes, shells, authoring mutations, publication and capabilities are preserved.
No commit, push, deployment or database mutation was performed.

## Canonical flow

`CourseWorkspace → ForgeRail → generateForgeAction → session auth → runForge → buildForgeContext → resolveForgeSources → provider → ForgeResult → human review → existing save action`.

The single entry point is `app/app/forge/actions.ts`, a non-streaming Server Action matching existing forms/actions. Next's origin and body-size protections apply; the action independently validates input and authenticates with `auth.getUser()`. Streaming, HTTP route duplication and a chat history store are unnecessary for F4.A. The rail receives identifiers and display labels only; interaction wiring remains F4.T.

`repository.ts` and `provider.ts` are `server-only`. The injectable policy/service modules contain no environment access or client-authoritative state. Production instantiation happens exclusively in the action with the authenticated Supabase client. `ForgeReader` exposes SELECT/download operations only. No service-role key, new RPC, generation log mutation or pedagogical write is used.

## Contracts

`lib/forge/contracts.ts` is the client-safe canonical contract, separate from F2's unchanged `authoring-contracts.ts`.

- `ForgeRequest`: discriminated Learn/Edit modes with valid intent per mode, `courseSlug`, optional `lessonSlug`, optional normalized `input` (2,000 raw characters maximum), unique UUID `sourceIds` (0–4). Unknown fields are rejected, including userId, capabilities, content and client-supplied context. No arbitrary surface is needed: target field derives from intent. Empty source selection means no sources, not automatic opt-in.
- Learn intents: explain, clarify, rephrase, example, quiz. Only explain permits course scope without a lesson.
- Edit intents: structure, improve, rephrase, simplify, summarize, objectives. Only structure, summarize and objectives permit course scope. Rephrase is shared vocabulary with mode-specific output.
- `ForgeContext`: canonical course id/title/summary, optional module, actual current lesson title/summary/content/objectives, overview outline, normalized source text and explicit warnings. Never sent wholesale to the rail.
- `ForgeRailContext`: mode, courseSlug, lessonSlug, courseTitle, lessonTitle. `availability` is separately supplied by the server. Buttons remain disabled until F4.T wires their requests; configured state does not falsely claim the provider is absent.
- `ForgeResponse`: `{ok:true,result}` or `{ok:false,error}`. Raw backend/provider errors, credentials, request bodies and Storage paths never enter response metadata.
- `ForgeResult`: Learn is `kind: answer`; Edit is `kind: proposal`, with a server-derived course/lesson target, field, suggestedContent/objectives and `application: explicit_only`. Both include text, source identities/titles and warnings. Provider output cannot choose targets, kind, capabilities or sourcesUsed.

## Access and context

The existing `resolveCourseCapabilities` is reused. Ownership alone grants Edit; enrollment alone grants Learn; both relationships grant both. The enrollment read explicitly filters **course_id AND user_id**: live RLS also permits owners to read other enrollments, so an unscoped enrollment lookup would be unsafe here. No global profile role is used. `teacher_id` is the existing owner FK name, not a global-role check.

The course is reloaded under RLS before reading lesson/source data. A requested lesson is queried by slug AND course_id, checked again for membership and matched to a module from the same course. Query failure is controlled, never a fallback to client content. Overview requests read module/lesson titles; lesson requests include the current persisted lesson, not all lesson bodies. Unsaved editor changes are intentionally absent: Terra must require Save before generation or label that saved content is used.

Authorization remains an additional gate over session RLS, not a replacement. For Learn with requested sources, unpublished courses are rejected even for an owner+enrollment user: owner RLS must not accidentally bypass the published-course source-learning policy. No changes to F3's non-destructive unpublication flow.

## Provider and errors

One adapter uses installed AI SDK 7 `generateText` + `Output.object` and `@ai-sdk/openai` Chat Completions, allowing OpenAI-compatible endpoints. No model is silently selected. No tool calls or automatic mutations. `maxRetries: 0` bounds calls; `AbortSignal.timeout` bounds provider execution; only `finishReason: stop` plus valid structured output succeeds. Schema-invalid, partial, filtered or unknown completion is `invalid_result`.

Reuse LearnIt's config precedence: `OPENAI_API_KEY ?? AI_API_KEY`, `OPENAI_MODEL ?? AI_MODEL`. `AI_PROVIDER` accepts openai/openai-compatible/ai-sdk, all through the same adapter, and does not enable historical mocks. `AI_BASE_URL` is server configuration only. Missing/invalid provider configuration gives `not_configured`, without breaking workspace rendering. No AI secret is `NEXT_PUBLIC_*`.

Defaults: timeout 60,000 ms; max serialized input 30,000 characters; output 4,000 tokens; 20 generations/hour/user. Bounds and defaults are centralized in `config.ts`; invalid numeric settings revert to documented defaults. UI receives availability only, never config.

Error codes: invalid_request, unauthenticated, forbidden, context_unavailable, source_unavailable, not_configured, provider_error, timeout, rate_limited, invalid_result. All are stable UI codes. The service maps known errors; unexpected context errors are redacted. Provider HTTP 429 is rate_limited, timeout is distinct, raw provider diagnostics are not exposed or logged.

The quota is process-local, shared across modes/intents and consumed immediately before generation, including failed attempts. Expired entries are removed, map capacity is bounded. This is a local architecture guard, **not a durable multi-instance production quota**. Before deploying F4, replace the limiter behind the same port with an atomic shared implementation; do not call the current guard a distributed guarantee. Supabase reads/downloads are not covered by the provider timeout.

## Sources and limits

The resolver queries selected IDs with course_id using the caller's authenticated client. Missing/RLS-hidden/foreign IDs fail the whole request with the same source_unavailable code. Visible non-ready rows are excluded with not_ready warnings. RLS may hide a non-ready row entirely for an enrolled user; that case is source_unavailable. No discovery of foreign source titles.

Initial support is existing text/markdown/pdf records with source_kind text/file. URL/web and DOCX records are deliberately excluded, even though present in the historic schema. Text already in extracted_content is used; otherwise TXT/MD files are downloaded from the private course-sources bucket through session RLS, capped at 10 MiB metadata and actual blob size. No signed or public URL is created. Download denial fails the request. PDF is usable only when real extracted_content exists. A PDF filename/metadata placeholder is never counted as source content.

One `boundForgeContext` function cleans NUL/CRLF and applies explicit deterministic truncation. Half the configured serialized-input budget is reserved for content strings, leaving space for JSON and instructions. Limits: course title 260, summary 2,000; module/lesson titles 220; lesson summary 1,000; up to 8 objectives of 300; lesson body 60% of remaining text budget; up to 4 selected sources with at most 4,000 text characters each; overview up to 20 modules × 30 lesson titles. Shared remaining budget can reduce these maxima. Sources reduced to empty text are omitted. Every cut emits a truncated warning. The fully serialized system+user messages are checked before provider invocation; excessive escaping/structural overhead returns context_unavailable instead of silently dispatching too much. This character limit excludes AI SDK schema/protocol overhead and is not a token guarantee.

Database extracted text is read before bounding; this pass does not add ingestion infrastructure or a database substring RPC. Historical files can be up to 10 MiB; a future ingestion pass should store bounded usable extraction to reduce repeated downloads.

`sourcesUsed` means sources **provided to the model**, not verified citations. It is constructed from the final bounded context after successful dispatch, never from client claims or generated IDs. Terra should label it “Sources fournies à Forge”; do not imply every sentence is supported by them.

## Prompt and approval boundary

`prompts/index.ts` separates system principles, mode behavior, intent instructions and JSON context serialization. Source/lesson titles and content stay in the user-message knowledge object, never in the system prompt. JSON escaping makes boundaries explicit even for malicious delimiter-like text. This reduces prompt-injection ambiguity; it does not prove semantic immunity. No provider tools, secrets or write capability are available to exploit.

Learn requires suggestedContent/objectives null. Edit requires the appropriate suggestion shape; summaries match existing save limits (lesson 1,000/course 4,000), objectives match 8 × 300, content matches 20,000. Structure is a Markdown outline recommendation, **not a module mutation plan**. Its explicit application can remain manual in F4.T; do not treat it as lesson content.

Terra flow: display proposal and target → explicit Apply to local editor draft → existing Save mutation with current ownership/RLS checks. Apply and Save are separate user acts; discard/revert must remain possible. Never invoke save in a generation effect. Ignore late results after target/mode navigation; do not overwrite unsaved input or apply a result after a subsequent edit without renewed review. This pass provides no cross-session versioning/conflict guarantee; that remains outside scope.

## Real schema / RLS audit

Live catalog inspected read-only on `ncpksogybugetwozbjmj`, 2026-09-10, with Supabase MCP SELECTs. Reproducible queries: `f4-source-audit.sql`. No user source bodies, storage object names, credentials or signed URLs were dumped. Catalog visibility was used for audit, not to impersonate session-based runtime authorization.

### course_sources columns observed

| Column | Type | Nullable / default |
| --- | --- | --- |
| id | uuid | no; gen_random_uuid() |
| teacher_id | uuid | no; FK profiles(id), delete cascade |
| course_id | uuid | yes; FK courses(id), delete set null |
| title | text | no |
| type | text | no; pdf/text/markdown/docx/web |
| file_name | text | yes |
| storage_bucket | text | yes; course-sources |
| storage_path | text | yes; unique |
| mime_type | text | no |
| file_size | integer | yes; positive when present |
| metadata | jsonb | no; {} |
| created_at, updated_at | timestamptz | no; now() |
| source_kind | text | no; file default; file/url/text |
| original_url | text | yes |
| extracted_content | text | yes |
| extraction_status | text | no; pending default; pending/ready/error |
| extraction_error | text | yes |

File records require file name/size/bucket/path. URL records require original_url. Text records require extracted_content. The ready-content constraint permits **file records with no extracted text**, whereas non-file ready records need nonblank content. No chunks/embedding columns exist in this table. The consulted LearnIt retrieval uses paragraph snippets and keyword scoring, not vector infrastructure; Forge does not import that retrieval stack.

Live aggregate: 5 ready web/url rows with extracted text, 1 ready text/text row with extracted text; no file rows in the audited inventory. Thus live TXT-file download and PDF extraction are **not** claimed verified. No new URL ingestion was ported.

### Storage observed

RLS enabled on public.course_sources and storage.objects. course-sources is **private**, 10,485,760-byte bucket limit, MIME allowlist application/pdf, text/plain, text/markdown. Other buckets observed: uploads private, resources private, course-covers public (covers only, outside source scope). Every inspected storage.objects policy was bucket-scoped; no generic authenticated policy opened course-sources. Object content was not downloaded during the catalog audit.

### Exact current policies

public.course_sources:

- `Owners can read their course sources`
- `Owners can create their course sources`
- `Owners can update their course sources`
- `Owners can delete their course sources`
- `Users can read enrolled ready course sources`

The four owner policies require active account, source teacher_id = auth.uid(), and either course_id null or teacher_owns_course(course_id). UPDATE uses both USING and WITH CHECK. The learning SELECT requires ready, a non-null course and can_read_enrolled_published_course.

storage.objects:

- `Owners can read their source files`
- `Owners can upload source files`
- `Owners can update their source files`
- `Owners can delete their source files`
- `Users can read enrolled course source files`

Owner policies require bucket course-sources and can_author_source_path(name). The helper requires active account; path first segment auth.uid(); second segment brief or an owned course; no linked source owned by another user or attached to a non-owned course. Learning SELECT requires a matching ready course_sources row by bucket/path and enrolled published course access. Existing upload path remains `{userId}/{courseId}/{unique-filename}`; brief paths are historical and not needed for F4 course uploads.

The four inspected private helpers are existing SECURITY DEFINER functions with empty search_path. `is_active_account` reads profiles.status = active, **not role**; `teacher_owns_course` compares courses.teacher_id to auth.uid(); `can_read_enrolled_published_course` requires published course plus enrollments.user_id = auth.uid(), not public visibility or global role. can_author_source_path uses the relations described above. No helper was created or changed. Editor currently means owner; this does not establish collaborator access.

### Historical debt reconciliation — MIGRATION NONE

Historical problematic source policies were `Teachers can read their course sources`, `Teachers can create their course sources`, `Teachers can update their course sources`, `Teachers can delete their course sources`; Storage equivalents `Teachers can read their source files`, `Teachers can upload source files`, `Teachers can update their source files`, `Teachers can delete their source files`. These are replaced in LearnIt's `20260907054237_role_neutral_authoring.sql`, and the replacement owner policies/helpers are confirmed live. Historical learning names `Learners can read enrolled ready course sources` and `Learners can read enrolled course source files` were replaced by `20260903110000_role_neutral_learning_access.sql`.

F2's recorded debt is stale for the audited backend. **No current problematic global-role source policy was found. MIGRATION NONE. Migration applied: NO.** Do not replay the old migration from this frontend. No migration-specific transactional tests are required because no migration is proposed. Session-level RLS upload/read regression remains a Terra smoke task, not a claimed PASS from catalog inspection.

## Read-only LearnIt references

Root verified: `C:/Users/Chand/Desktop/Dev-web/Learnit-project`. No files changed there.

- `lib/repositories/supabase/forgeSourceRepository.ts`: schema mapping, session reads, uploads, attach/delete and legacy ready-file behavior.
- `lib/forge-ai/retrieval.ts`: TXT/MD download, paragraph snippets, source selection; PDF placeholder deliberately not ported.
- `lib/forge-ai/source-files.ts`: private bucket, 10 MiB, supported MIME types and path structure.
- `lib/forge-ai/config.ts`, `lib/config/runtime.ts`, `.env.example`: provider configuration names/precedence (no secret env files read).
- `lib/forge-ai/provider.ts` (AI SDK adapter excerpt), `structured-output.ts`: finishReason checks and structured validation.
- `lib/forge-ai/rate-limit.ts`, `validation.ts`, `prompts.ts` (relevant excerpts): constraints, human-review rule, local quota.
- `supabase/migrations/20260817083313_course_sources.sql`, `20260830090000_course_source_urls.sql`, `20260903092000_harden_learner_course_source_access.sql`, `20260903110000_role_neutral_learning_access.sql`, `20260907054237_role_neutral_authoring.sql` (source sections).

No legacy shell/component/route was copied. Official verification references: installed Next 16.3.4 `server-actions.md` / `data-security.md`; installed AI SDK structured-generation docs/source; [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control). Changelog markdown fetch was unavailable; current Storage documentation and live catalogs were used for this audit.

## Known UI debts and validation

`LessonContent.tsx` splits blank lines and recognizes only basic heading/list prefixes, so inline Markdown, code fences and adjacent block forms remain raw. Keep Markdown as stored format; later use one sanitized Markdown renderer for Learn/proposal preview, with raw HTML disabled. No renderer replacement in F4.A.

`saveLessonAction` / metadata actions persist but do not invalidate paths; LessonEditor uses uncontrolled defaultValue. Terra should add canonical revalidatePath or server refresh after successful Save, and synchronize local draft deliberately. A router refresh alone does not reset uncontrolled mounted inputs. Handle only the Apply→Save path; do not refactor all F0–F3 forms.

Structural tests use injected read/provider ports, not live AI or artificially privileged database writes. `tests/forge.test.ts` covers A–L plus strict validation, enrollment user scoping, foreign lesson, PDF exclusion, real text forwarding, source omission, unpublished source learning, bounds, incomplete results, JSON data separation and quota. Existing F0–F3 tests remain unchanged. Full command results and remaining browser work are recorded in `f4-astra-handoff.md`.
