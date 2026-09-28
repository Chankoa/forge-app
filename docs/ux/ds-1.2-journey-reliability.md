# DS 1.2 D.1 — Journey reliability and publication

## Corrective mapping

| Production behaviour | Correction |
| --- | --- |
| Course-local back link skipped to Mes parcours | Lesson, management and publication contexts now link to the canonical course overview. The overview itself still links to Mes parcours. |
| Forge Apply closed the proposal without an obvious result | Apply disables repeat submission, shows an applying state, and reports that the local draft changed and still needs Save. Course editing shows this near its heading; lesson editing retains its header status. |
| Regeneration errors appeared outside the open proposal | The dialog now shows loading and error states while keeping the previous proposal and retry controls available. A valid replacement is committed only after the server action succeeds. |
| Publication mixed identity, checks and action | Existing course status, real counts, readiness blockers and recommendations, corrective links, and publish/unpublish actions are arranged in the UJ08 order. The course domain precedes the title on this view. |

## Incomplete output diagnosis and D.1.1 correction

`runForge` already rejects provider results whose `finishReason` is not `stop` and malformed structured output. It previously sliced a valid patch and returned the shortened content as a successful proposal. D.1.1 replaced that cut with the controlled `invalid_result` error. D.1.2 aligns the limits with field roles: course description at 1,000 characters and lesson content at 3,800 characters, including proposals from free edit requests. Boundary-length proposals remain unchanged. Forge displays a safe incomplete-generation message, and `forgeResultAfterResponse` retains the previous usable result after a failed regeneration. Regression tests cover both limits, replacement after success and preservation after failure. Model, provider, AI SDK and generation budgets are unchanged.

D.1.3 aligns the course description prompt with this contract for Improve, Summarize and free edit requests. It asks for a 600–900-character description of purpose, target audience and learning value, suitable for UJ04, UJ05 and UJ08, while excluding the detailed plan, lesson content, resource lists, trainer notes and implementation advice. The 1,000-character service rejection remains the safety net. UJ04 clamps the displayed description to two lines, while UJ05 and UJ08 wrap the bounded text within their content columns.

## Reference differences and deferred work

UJ08 shows a score, visibility settings and collaborators that the current production model does not expose here. This implementation uses only `getPublicationReadiness`, existing publication actions and current course data. Publication links retain the current route; no new query state or publication rule was added. Home, My Paths, Structure, Learner styling and structural AI analysis remain outside this corrective pass.
