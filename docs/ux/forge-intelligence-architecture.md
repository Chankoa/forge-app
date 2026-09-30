# Forge intelligence architecture — Sprint 10.DS1.2-G

## Architecture

`lib/forge/intelligence/capabilities.ts` resolves a named capability to its prompt, context policy, result schema and optional model setting. `service.ts` validates the request, invokes the specialized provider, rejects non-stop or malformed output, and checks every returned course/module/lesson ID against the supplied context. `provider.ts` uses the existing AI SDK provider and default Forge model. `FORGE_SUBJECT_DISCOVERY_MODEL` and `FORGE_CURRICULUM_ANALYSIS_MODEL` may override the model independently later; neither is required or set by this sprint. Existing Forge lesson/course proposal and public preview paths remain separate and unchanged. Both new capabilities are read-only: analysis → structured suggestion → human decision.

## Subject Discovery

Create exposes an optional comparison before generation. The server action authenticates the user, queries only `published` and `public` courses through the session-bound Supabase client, and applies a second visibility check before bounded lexical ranking. At most 80 recent public rows are examined and 12 plausible metadata candidates enter the model context. The context contains intent, audience, objective, format, domain and each candidate's ID, slug, title, description, domain and level. It contains no private drafts or lesson bodies. The result classifies qualitative relationships and is joined back to the real candidate metadata. A zero-candidate result does not invoke the model. Users may inspect a related course and may generate their own proposal regardless of a match. No remix or course copy is implied.

## Curriculum Architect

The course Structure tab exposes an advisory analysis to the course owner. The server checks `teacher_id` and loads the course identity, domain, objective/subtitle, all ordered modules and lesson titles, brief descriptions and up to two lesson objectives. Full lesson bodies, sources, progress and notes are excluded. If this metadata exceeds the existing input limit, analysis returns an explicit unavailable state instead of silently omitting modules or lessons. Findings have a restrained type/severity, explanation, suggestion and validated object IDs. Links point to the relevant module or Creator lesson. Running or retrying analysis invokes no authoring mutation; a failed rerun leaves the previous usable findings visible.

## Contracts and safeguards

Each capability owns a strict Zod output schema. Both require a normal completion reason and valid references; invalid output returns `invalid_result` with a user-safe message. Provider errors are classified without exposing provider text. Telemetry records capability, model, outcome, finish reason on validation failure, and elapsed time; it never logs course content. Inputs are bounded by the existing Forge input character limit. Subject Discovery is capped at 1,800 output tokens and Curriculum Analysis at 3,000, both within the existing configured maximum. The existing process-local rate limiter is reused. No global model, provider, generation budget or AI SDK migration is made.

In an authenticated browser check, Subject Discovery returned two real published courses and their links opened correctly. Curriculum Analysis returned five advisory findings for a real 6-module, 18-lesson course; a lesson reference opened the exact Creator lesson. A subsequent run returned `invalid_result`, which the UI displayed as an incomplete analysis with a retry action. Model output quality remains variable; invalid results are never shown as complete findings. Duplicate object IDs within a valid finding are displayed once per link.

## Future map and deferred product decisions

Future capabilities may include course review, lesson improvement, source analysis, learner explanation and publication review, each with its own context and schema. Semantic retrieval, embeddings, ranking and personalized recommendations are deferred. Original/remix provenance, collaboration roles and course dependencies require explicit data and permission design. If a course later has learners, progress, notes, remixes, collaborators or dependencies, archive/unpublish may be safer than hard deletion; this sprint does not change deletion rules or add those entities. The current analysis never calls the manual structure controls from Sprint F.
