import { resolveCourseCapability } from "../intelligence/capabilities";
import { applyRequestSchema, changePlanSchema, courseAnalysisSchema, courseContextSchema, planRequestSchema, type ApplyReport, type CourseCapability, type CourseOperation, type CoursePlanContext, type CourseWorkflowData, type WorkflowResult } from "./contracts";
import { analysisRejection, currentValue, resolveTarget, stabilizeRevision, validPositions, validSelection, validateAnalysis, validatePlan, validatePlanForApply } from "./validation";

export type CourseProvider = { generate(capability: "analyze_course" | "propose_course_changes", prompt: string): Promise<unknown> };
export type CoursePlanReader = { load(courseId: string): Promise<CoursePlanContext | null> };
export function failure<T>(capability: CourseCapability, status: WorkflowResult<T>["status"], summary: string): WorkflowResult<T> {
  return { capability, status, summary, data: null, warnings: [], applicationMode: capability === "apply_course_changes" ? "persisted" : "review" };
}

// Diagnostic only: issue paths and codes, never model values.
function schemaIssues(schema: { safeParse(value: unknown): { success: boolean; error?: { issues: { path: PropertyKey[]; code: string }[] } } }, value: unknown) {
  const result = schema.safeParse(value);
  if (result.success) return ["schema_ok_semantic_check_failed"];
  return (result.error?.issues ?? []).slice(0, 8).map((issue) => issue.path.map(String).join(".") + ":" + issue.code);
}

// Read-only port: a model invocation cannot reach a mutation function.
export async function orchestrateCourse(raw: unknown, deps: CoursePlanReader & { provider: CourseProvider; maxInputChars: number; consume(): void; telemetry?(data: { capability: string; duration: number; validation: string; operationCount: number }): void }): Promise<WorkflowResult<CourseWorkflowData>> {
  const parsed = planRequestSchema.safeParse(raw);
  if (!parsed.success || !resolveCourseCapability(parsed.data.capability)) return failure("analyze_course", "validation_error", "La demande est invalide.");
  const request = parsed.data;
  const started = Date.now();
  let count = 0;
  let validation = "provider_error";
  try {
    const context = await deps.load(request.courseId);
    if (!context) return failure(request.capability, "permission_denied", "Vous ne pouvez pas analyser ce parcours.");
    if (!courseContextSchema.safeParse(context).success) return failure(request.capability, "validation_error", "Le contexte du parcours est incomplet.");
    if (request.previous && !validatePlan(request.previous, context)) return failure(request.capability, "validation_error", "Le parcours a changé. Relancez l’analyse avant de réviser le plan.");
    if (request.capability === "propose_course_changes" && (!request.previous || !request.instruction)) return failure(request.capability, "validation_error", "Un plan et une consigne sont nécessaires.");
    const prompt = JSON.stringify({ context, previous: request.previous, instruction: request.instruction });
    if (prompt.length > deps.maxInputChars) return failure(request.capability, "validation_error", "Ce parcours dépasse la taille d’analyse disponible.");
    deps.consume();
    const rawAnalysis = await deps.provider.generate("analyze_course", prompt);
    const analysis = validateAnalysis(rawAnalysis, context);
    if (!analysis) console.info("[forge] orchestrator " + JSON.stringify({ capability: "analyze_course", stage: "analysis_validation", category: "invalid_result", issues: schemaIssues(courseAnalysisSchema, rawAnalysis), reason: analysisRejection(rawAnalysis, context) }));
    if (!analysis) { validation = "invalid_result"; return failure(request.capability, "invalid_result", "Forge n’a pas pu analyser ce parcours."); }
    const planPrompt = JSON.stringify({ context, analysis, previous: request.previous, instruction: request.instruction });
    if (planPrompt.length > deps.maxInputChars) return failure(request.capability, "validation_error", "Le plan dépasse la taille disponible.");
    deps.consume();
    const rawPlan = await deps.provider.generate("propose_course_changes", planPrompt);
    const generated = validatePlan(rawPlan, context, analysis.observations.map((observation) => observation.id));
    if (!generated) console.info("[forge] orchestrator " + JSON.stringify({ capability: "propose_course_changes", stage: "plan_validation", category: "invalid_result", issues: schemaIssues(changePlanSchema, rawPlan) }));
    if (!generated) { validation = "invalid_result"; return failure(request.capability, "invalid_result", "La proposition retournée n’est pas exploitable."); }
    const revision = stabilizeRevision(generated, request.previous);
    if (!validatePlan(revision.plan, context, analysis.observations.map((observation) => observation.id))) return failure(request.capability, "invalid_result", "La proposition retournée n’est pas exploitable.");
    count = revision.plan.operations.length; validation = "success";
    return { capability: request.capability, status: "success", summary: analysis.summary, data: { analysis, ...revision }, warnings: revision.plan.warnings, applicationMode: "review" };
  } catch (error) {
    console.info("[forge] orchestrator " + JSON.stringify({ capability: request.capability, stage: "provider", category: "provider_error", errorName: error instanceof Error ? error.name : null }));
    return failure(request.capability, "provider_error", request.capability === "analyze_course" ? "Forge n’a pas pu analyser ce parcours." : "Forge n’a pas pu réviser le plan."); }
  finally { deps.telemetry?.({ capability: request.capability, duration: Date.now() - started, validation, operationCount: count }); }
}

// Sequential and explicit. Never claims a transaction or rolls back newer user data.
export async function applyCoursePlan(raw: unknown, deps: CoursePlanReader & { write(courseId: string, operation: CourseOperation): Promise<"success" | "stale" | "failed"> }): Promise<WorkflowResult<ApplyReport>> {
  const parsed = applyRequestSchema.safeParse(raw);
  if (!parsed.success) return failure("apply_course_changes", "validation_error", "La sélection est invalide.");
  const { courseId, selectedIds } = parsed.data;
  const results: ApplyReport["results"] = [];
  try {
    const context = await deps.load(courseId);
    if (!context) return failure("apply_course_changes", "permission_denied", "Vous ne pouvez pas modifier ce parcours.");
    const plan = validatePlanForApply(parsed.data.plan, context);
    if (!plan || !validSelection(plan, selectedIds) || !validPositions(context)) return failure("apply_course_changes", "validation_error", "La proposition retournée n’est pas exploitable.");
    const selected = new Set(selectedIds);
    const resultById = new Map<string, ApplyReport["results"][number]["status"]>();
    for (const operation of plan.operations) {
      if (!selected.has(operation.id)) {
        resultById.set(operation.id, "skipped");
        continue;
      }
      if (operation.dependencies.some((id) => resultById.get(id) !== "success")) {
        resultById.set(operation.id, "skipped");
        continue;
      }
      try {
        // Recheck access, target membership, parent relation, and the before-value before each conditional write.
        const fresh = await deps.load(courseId);
        if (!fresh) {
          resultById.set(operation.id, "failed");
          continue;
        }
        if (!resolveTarget(fresh, operation.target) || currentValue(fresh, operation) !== operation.before) {
          resultById.set(operation.id, "stale");
          continue;
        }
        resultById.set(operation.id, await deps.write(courseId, operation));
      } catch {
        resultById.set(operation.id, "failed");
      }
    }
    for (const operation of plan.operations) results.push({ id: operation.id, status: resultById.get(operation.id) ?? "skipped" });
    const after = await deps.load(courseId);
    let verified = Boolean(after && validPositions(after));
    for (const result of results) if (result.status === "success") {
      const operation = plan.operations.find((item) => item.id === result.id)!;
      if (!after || currentValue(after, operation) !== operation.after) { result.status = "failed"; verified = false; }
    }
    if (!verified) {
      for (const result of results) if (result.status === "success") result.status = "failed";
    }
    const selectedResults = results.filter((result) => selected.has(result.id));
    const complete = verified && selectedResults.every((result) => result.status === "success");
    const hasStale = selectedResults.some((result) => result.status === "stale");
    return {
      capability: "apply_course_changes",
      status: complete ? "success" : "validation_error",
      summary: complete ? "Modifications enregistrées et vérifiées." : hasStale ? "Le parcours a changé depuis cette analyse. Relancez ou ajustez le plan." : "Application partielle ou non vérifiée. Consultez chaque opération avant de relancer une analyse.",
      data: { results, verified },
      warnings: complete ? [] : ["Les modifications déjà enregistrées sont conservées. Consultez les états de chaque opération avant toute nouvelle application."],
      applicationMode: "persisted",
    };
  } catch {
    return { ...failure<ApplyReport>("apply_course_changes", "validation_error", "La vérification finale est indisponible. Rechargez le parcours avant toute nouvelle application."), data: { results: results.map((result) => result.status === "success" ? { ...result, status: "failed" } : result), verified: false } };
  }
}
