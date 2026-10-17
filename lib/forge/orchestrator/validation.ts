import { changePlanSchema, courseAnalysisSchema, validateProposedValue, type CoursePlanContext, type CourseTarget, type CourseOperation, type ForgeChangePlan } from "./contracts";

export function resolveTarget(context: CoursePlanContext, target: CourseTarget) {
  if (target.kind === "course") return target.id === context.course.id && target.moduleId === null ? context.course : null;
  if (target.kind === "module") return target.moduleId === null ? context.modules.find((module) => module.id === target.id) ?? null : null;
  return context.modules.find((module) => module.id === target.moduleId)?.lessons.find((lesson) => lesson.id === target.id && lesson.moduleId === target.moduleId) ?? null;
}
export function evidenceValue(context: CoursePlanContext, target: CourseTarget, field: string): string | null {
  const object = resolveTarget(context, target);
  if (!object) return null;
  if (field === "lessonCount") return String(target.kind === "course" ? context.modules.reduce((sum, module) => sum + module.lessons.length, 0) : "lessons" in object ? object.lessons.length : 0);
  if (!(field in object)) return null;
  const value = (object as unknown as Record<string, unknown>)[field];
  return Array.isArray(value) ? value.join("\n") : value == null ? "" : String(value);
}
export function currentValue(context: CoursePlanContext, operation: CourseOperation): string | null | undefined {
  const object = resolveTarget(context, operation.target);
  if (!object) return undefined;
  if (operation.type === "update_course_summary") return "description" in object ? object.description : undefined;
  if (operation.type === "update_lesson_objective") return "objectives" in object ? object.objectives?.join("\n") ?? null : undefined;
  return object.title;
}
// Diagnostic only: first rejection reason, never model values.
export function analysisRejection(raw: unknown, context: CoursePlanContext): string {
  const parsed = courseAnalysisSchema.safeParse(raw);
  if (!parsed.success) return "schema";
  const ids = new Set<string>();
  for (const observation of parsed.data.observations) {
    if (ids.has(observation.id)) return "duplicate_observation_id";
    ids.add(observation.id);
    if (!resolveTarget(context, observation.target)) return "observation_target_unresolved";
    for (const evidence of observation.evidence) {
      if (!resolveTarget(context, evidence.target)) return "evidence_target_unresolved";
      if (evidenceValue(context, evidence.target, evidence.field) === null) return "evidence_field_unknown:" + evidence.field;
      if (evidenceValue(context, evidence.target, evidence.field) !== evidence.value) return "evidence_value_mismatch:" + evidence.field;
    }
  }
  return "none";
}
export function validateAnalysis(raw: unknown, context: CoursePlanContext) {
  const parsed = courseAnalysisSchema.safeParse(raw);
  if (!parsed.success) return null;
  const ids = new Set<string>();
  const observations: typeof parsed.data.observations = [];
  for (const observation of parsed.data.observations) {
    if (ids.has(observation.id) || !resolveTarget(context, observation.target)) return null;
    ids.add(observation.id);
    // Evidence is shown from the course's own values: unresolvable evidence is dropped and a paraphrased value is replaced, so an unverified claim never reaches the UI.
    const evidence = observation.evidence.flatMap((item) => {
      const actual = evidenceValue(context, item.target, item.field);
      return actual === null ? [] : [{ ...item, value: actual.slice(0, 4000) }];
    });
    if (evidence.length > 0) observations.push({ ...observation, evidence });
  }
  if (parsed.data.observations.length > 0 && observations.length === 0) return null;
  return { ...parsed.data, observations };
}
export function operationKey(operation: CourseOperation) { return `${operation.type}:${operation.target.id}`; }
function parsePlan(raw: unknown, context: CoursePlanContext, observationIds?: string[], checkBefore = true): ForgeChangePlan | null {
  const parsed = changePlanSchema.safeParse(raw);
  if (!parsed.success) return null;
  const plan = parsed.data;
  if (observationIds && plan.analysisReferences.some((id) => !observationIds.includes(id))) return null;
  const seen = new Set<string>();
  const keys = new Set<string>();
  for (const operation of plan.operations) {
    if (operation.type === "update_lesson_objective") operation.after = operation.after.split("\n").map((line) => line.trim()).join("\n");
    const expectedKind = operation.type.includes("lesson") ? "lesson" : operation.type.includes("module") ? "module" : "course";
    const targetStructureValid = operation.target.kind === expectedKind
      && (operation.target.kind !== "course" || operation.target.id === context.course.id)
      && (operation.target.kind !== "module" || operation.target.moduleId === null)
      && (operation.target.kind !== "lesson" || operation.target.moduleId !== null);
    if (!targetStructureValid || !validateProposedValue(operation)) return null;
    if (seen.has(operation.id) || keys.has(operationKey(operation)) || operation.before === operation.after) return null;
    if (checkBefore && (!resolveTarget(context, operation.target) || operation.before !== currentValue(context, operation))) return null;
    // Only an earlier operation may be a dependency: bounded, acyclic, no implicit targets.
    if (new Set(operation.dependencies).size !== operation.dependencies.length || operation.dependencies.some((id) => !seen.has(id))) return null;
    seen.add(operation.id); keys.add(operationKey(operation));
  }
  return plan;
}
export function validatePlan(raw: unknown, context: CoursePlanContext, observationIds?: string[]) {
  return parsePlan(raw, context, observationIds);
}
export function validatePlanForApply(raw: unknown, context: CoursePlanContext) {
  return parsePlan(raw, context, undefined, false);
}
export function validSelection(plan: ForgeChangePlan, selectedIds: string[]) {
  const selected = new Set(selectedIds);
  return selected.size > 0 && selected.size === selectedIds.length && selectedIds.every((id) => plan.operations.some((operation) => operation.id === id)) && plan.operations.filter((operation) => selected.has(operation.id)).every((operation) => operation.dependencies.every((id) => selected.has(id)));
}
export function validPositions(context: CoursePlanContext) {
  const distinct = (items: Array<{ position: number }>) => new Set(items.map((item) => item.position)).size === items.length;
  return distinct(context.modules) && context.modules.every((module) => distinct(module.lessons));
}
export function stabilizeRevision(plan: ForgeChangePlan, previous?: ForgeChangePlan) {
  if (!previous) return { plan, changedIds: [] };
  const idMap = new Map(plan.operations.map((operation) => [operation.id, previous.operations.find((old) => operationKey(old) === operationKey(operation))?.id ?? operation.id]));
  const operations = plan.operations.map((operation) => ({ ...operation, id: idMap.get(operation.id)!, dependencies: operation.dependencies.map((id) => idMap.get(id) ?? id) }));
  return { plan: { ...plan, planId: previous.planId, operations }, changedIds: operations.filter((operation) => {
    const old = previous.operations.find((item) => item.id === operation.id);
    return !old || old.after !== operation.after || old.selected !== operation.selected || old.reason !== operation.reason;
  }).map((operation) => operation.id) };
}
