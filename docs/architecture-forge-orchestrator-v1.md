# Forge Orchestrator V1

## Capability registry and provider boundary

The Forge course-workflow registry defines three capabilities:

- `analyze_course` produces structured course observations.
- `propose_course_changes` returns a structured, reviewable change plan.
- `apply_course_changes` is the explicit, human-approved persistence boundary.

Capabilities own their input/output schemas, supported target kinds, mutation mode, and approval requirement. The orchestrator depends on a read-only provider interface; it cannot mutate course data. The provider adapter and model are resolved from Forge configuration and capability environment overrides rather than selected in product logic. Provider/model metadata is logged server-side and is not part of the UI contract.

## Bounded course context

The server repository builds a bounded context from course metadata, module and lesson IDs/titles/positions, lesson objectives, duration, content length, media presence, and source count. It does not send lesson bodies, human discussion, email, profile data, or storage URLs to the model. Repository limits cap the context at 100 modules and 500 lessons, and the serialized prompt is checked against the configured input limit.

## Analysis and change plan

Analysis is structured as a summary plus observations with explicit IDs, category, severity, target, explanation, evidence, and possible actions. Evidence values must exactly match the referenced course-context field. Unsupported or out-of-course targets and invalid structured results are rejected before the plan is shown.

Plans contain explicit operation IDs, targets, reasons, `before` and `after` values, selection state, editability, dependencies, and references to analysis observations. The server validates operation type, target kind and course membership, allowed fields, proposed values, exact `before` values, uniqueness, dependencies, and analysis references. Editable values are validated again at apply time.

### Applicable operations in V1

- `rename_course`
- `update_course_summary`
- `rename_module`
- `rename_lesson`
- `update_lesson_objective`

Adding, removing, moving, or reordering modules or lessons remains a recommendation only. Media, cover, image, audio, and video changes are out of scope.

## Apply boundary, stale safety, and partial results

Analysis and proposal are read-only. A person reviews the plan, may edit allowed `after` values, selects operations, and explicitly applies them. Applying persists changes immediately, including on published courses; it is not a local draft operation.

The server authenticates the caller and checks the existing course authoring capabilities on the server. Owners and active editors with the existing authoring permissions may analyze, propose, and apply. Viewers, learners, inactive members, and unrelated users cannot apply. The client cannot grant itself permissions.

Immediately before every selected write, the repository reloads the course under the authenticated user, verifies the target and its parent relation, and compares the current field to the operation's `before` value. The database write is also conditional on that exact value and is scoped to the course and (for a lesson) its module. A missing target, changed parent, changed value, or compare-and-set conflict is reported as `stale`; it is never overwritten. The UI tells the user: “Le parcours a changé depuis cette analyse. Relancez ou ajustez le plan.”

Operations are applied sequentially, not transactionally. Each operation reports `success`, `failed`, `stale`, or `skipped`; unselected operations and dependent operations skipped after a prerequisite failure are explicit. Independent selected operations may still complete after an individual stale or failed result. Successful writes are not rolled back if a later operation fails. The final response verifies persisted values and reports partial or unverifiable outcomes rather than claiming atomic success.

## Deferred behavior

There is no plan table, migration, realtime synchronization, workflow engine, autonomous loop, or automatic apply. Chat can pass an instruction to the existing proposal path to revise the shared plan; it cannot apply a plan. Suggestions, analysis, and chat revision use the same client-side course-plan state. The following remain deferred recommendations: `add_module`, `add_lesson`, `move_lesson`, reorder, `remove_module`, and `remove_lesson`.
