import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CoursePlanReview } from "../components/forge/CoursePlanReview";
import { courseCapabilityDefinitions, resolveCourseCapability } from "../lib/forge/intelligence/capabilities";
import { forgeRequestSchema } from "../lib/forge/contracts";
import { operationSchema, validateProposedValue, type CourseAnalysis, type CourseOperation, type CoursePlanContext, type ForgeChangePlan } from "../lib/forge/orchestrator/contracts";
import { currentValue, stabilizeRevision, validateAnalysis, validatePlan, validSelection } from "../lib/forge/orchestrator/validation";
import { applyCoursePlan, orchestrateCourse } from "../lib/forge/orchestrator/service";
import { resolveCourseCapabilities, type CourseMembershipRole } from "../lib/capabilities/course-capabilities";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const context: CoursePlanContext = {
  course: { id: id(1), title: "Design system", subtitle: "Apprendre", description: "Construire des composants", domain: "Design", level: null, durationMinutes: 30, sourceCount: 0 },
  modules: [{ id: id(2), title: "Bases", position: 0, lessons: [{ id: id(3), moduleId: id(2), title: "Introduction", position: 0, objectives: [], durationMinutes: 30, contentLength: 0, hasMedia: false }] }],
};
const operation: CourseOperation = { id: "rename", type: "rename_module", target: { kind: "module", id: id(2), moduleId: null }, before: "Bases", after: "Fondations du design", reason: "Préciser le périmètre", selected: true, editable: true, dependencies: [] };
const second: CourseOperation = { ...operation, id: "objective", type: "update_lesson_objective", target: { kind: "lesson", id: id(3), moduleId: id(2) }, before: "", after: "Construire un composant" };
const plan: ForgeChangePlan = { planId: id(9), summary: "Préciser deux éléments", analysisReferences: ["observation"], operations: [operation, second], warnings: [] };
const analysis: CourseAnalysis = { summary: "Un objectif manque", observations: [{ id: "observation", category: "objectives", severity: "attention", target: second.target, title: "Objectif manquant", explanation: "Un résultat attendu précis aide à orienter la leçon.", evidence: [{ target: second.target, field: "objectives", value: "" }], possibleActions: ["Préciser l’objectif"] }] };
const request = { courseId: id(1), plan, selectedIds: [operation.id, second.id] };
function memory() {
  const state = structuredClone(context);
  const writes: string[] = [];
  let reads = 0;
  return { state, writes, get reads() { return reads; }, async load() { reads++; return structuredClone(state); }, async write(_courseId: string, op: CourseOperation) {
    writes.push(op.id);
    if (currentValue(state, op) !== op.before) return "stale" as const;
    if (op.type === "rename_module") state.modules[0].title = op.after;
    if (op.type === "update_lesson_objective") state.modules[0].lessons[0].objectives = op.after.split("\n");
    return "success" as const;
  } };
}

test("registry bounds capabilities, schemas, approval and provider resolution", () => {
  assert.equal(resolveCourseCapability("delete_everything"), null);
  assert.equal(resolveCourseCapability("toString"), null);
  assert.equal(courseCapabilityDefinitions.analyze_course.mutation, "none");
  assert.equal(courseCapabilityDefinitions.propose_course_changes.mutation, "proposal");
  assert.equal(courseCapabilityDefinitions.apply_course_changes.humanApproval, true);
  assert.equal(courseCapabilityDefinitions.apply_course_changes.resolveModel(), null);
  assert.equal(courseCapabilityDefinitions.analyze_course.resolveModel({}, "existing"), "existing");
  for (const intent of ["generate_content", "structure", "rephrase", "simplify", "improve", "summarize", "objectives"]) {
    assert.equal(forgeRequestSchema.safeParse({ mode: "edit", intent, courseSlug: "course", lessonSlug: "lesson" }).success, true);
  }
});
test("analysis verifies target/parent IDs and replaces evidence values with the course's own", () => {
  assert.ok(validateAnalysis(analysis, context));
  const corrected = validateAnalysis({ ...analysis, observations: [{ ...analysis.observations[0], evidence: [{ ...analysis.observations[0].evidence[0], value: "inventé" }] }] }, context);
  assert.equal(corrected?.observations[0].evidence[0].value, "");
  const good = analysis.observations[0].evidence[0];
  const bad = { target: { ...second.target, moduleId: id(99) }, field: "title" as const, value: "Introduction" };
  for (const evidence of [[bad], [{ ...good, field: "sourceCount" as const, value: "2" }], [{ ...good, target: { ...second.target, id: id(98) } }]]) {
    assert.equal(validateAnalysis({ ...analysis, observations: [{ ...analysis.observations[0], evidence }] }, context), null);
  }
  const mixed = validateAnalysis({ ...analysis, observations: [{ ...analysis.observations[0], evidence: [bad, good] }] }, context);
  assert.deepEqual(mixed?.observations[0].evidence, [good]);
  assert.equal(validateAnalysis({ ...analysis, observations: [{ ...analysis.observations[0], target: { ...second.target, id: id(98) } }] }, context), null);
  assert.equal(validateAnalysis({ ...analysis, observations: [...analysis.observations, ...analysis.observations] }, context), null);
});
test("plan rejects arbitrary fields, unknown ops, invalid parent/target, blank values and stale before", () => {
  assert.ok(validatePlan(plan, context, ["observation"]));
  for (const patch of [{ type: "remove_lesson" }, { after: "" }, { changes: { teacher_id: id(8) } }, { before: "Ancien" }, { target: { ...operation.target, id: id(88) } }, { target: { kind: "course", id: id(1), moduleId: null } }]) {
    assert.equal(validatePlan({ ...plan, operations: [{ ...operation, ...patch }] }, context), null);
  }
  assert.equal(validatePlan({ ...plan, operations: [{ ...second, target: { ...second.target, moduleId: id(88) } }] }, context), null);
  assert.equal(operationSchema.safeParse({ ...operation, after: { sql: "bad" } }).success, false);
  assert.equal(validateProposedValue({ ...operation, after: "" }), false);
  assert.equal(validatePlan(plan, context, []), null);
});
test("conflicts, duplicate IDs, cycles and unsupported dependencies fail closed", () => {
  for (const operations of [[operation, { ...operation, id: "other" }], [operation, { ...second, id: operation.id }], [{ ...operation, dependencies: ["objective"] }, second]]) {
    assert.equal(validatePlan({ ...plan, operations }, context), null);
  }
  const dependent = { ...plan, operations: [operation, { ...second, dependencies: [operation.id] }] };
  assert.ok(validatePlan(dependent, context));
  assert.equal(validSelection(dependent, [second.id]), false);
  assert.equal(validSelection(dependent, [operation.id, second.id]), true);
  assert.equal(validSelection(plan, [operation.id, operation.id]), false);
  assert.equal(validSelection(plan, ["missing"]), false);
});
test("bounded analysis then proposal has no write port, rejects invalid outputs", async () => {
  const calls: string[] = [];
  const deps = { load: async () => context, maxInputChars: 30000, consume() {}, provider: { async generate(capability: string) { calls.push(capability); return capability === "analyze_course" ? analysis : plan; } } };
  const result = await orchestrateCourse({ courseId: id(1), capability: "analyze_course" }, deps);
  assert.equal(result.status, "success");
  assert.equal(result.applicationMode, "review");
  assert.deepEqual(calls, ["analyze_course", "propose_course_changes"]);
  const invalid = await orchestrateCourse({ courseId: id(1), capability: "analyze_course" }, { ...deps, provider: { async generate() { return { summary: "incomplete" }; } } });
  assert.equal(invalid.status, "invalid_result");
  assert.equal(invalid.data, null);
});
test("provider errors and invalid requests are normalized without leaking internals", async () => {
  const deps = { load: async () => context, maxInputChars: 30000, consume() {}, provider: { async generate() { throw new Error("API_SECRET db.path"); } } };
  const result = await orchestrateCourse({ courseId: id(1), capability: "analyze_course" }, deps);
  assert.equal(result.status, "provider_error");
  assert.doesNotMatch(JSON.stringify(result), /API_SECRET|db.path/);
  assert.equal((await orchestrateCourse({ courseId: id(1), capability: "invented" }, deps)).status, "validation_error");
  assert.equal((await orchestrateCourse({ courseId: id(1), capability: "analyze_course" }, { ...deps, maxInputChars: 1 })).status, "validation_error");
});
test("apply selected user-edited values only and reload canonical outline", async () => {
  const db = memory();
  const edited = { ...plan, operations: [{ ...operation, after: "Titre choisi humainement" }, second] };
  const response = await applyCoursePlan({ ...request, plan: edited, selectedIds: [operation.id] }, db);
  assert.equal(response.status, "success");
  assert.deepEqual(response.data?.results.map((item) => item.status), ["success", "skipped"]);
  assert.deepEqual(db.writes, [operation.id]);
  assert.equal(db.state.modules[0].title, "Titre choisi humainement");
  assert.deepEqual(db.state.modules[0].lessons[0].objectives, []);
  assert.equal(db.reads, 3);
  assert.equal(response.data?.verified, true);
});
for (const [label, isOwner, role, status, allowed] of [
  ["owner without membership", true, null, null, true], ["active editor", false, "editor", "active", true], ["viewer", false, "viewer", "active", false], ["learner", false, null, null, false], ["revoked editor", false, "editor", "revoked", false], ["unrelated", false, null, null, false],
] as const) test(`apply access: ${label}`, async () => {
  const db = memory();
  const capabilities = resolveCourseCapabilities({ isOwner, isEnrolled: label === "learner", membershipRole: role as CourseMembershipRole | null, membershipStatus: status });
  const response = await applyCoursePlan(request, { ...db, load: async () => capabilities.canEdit ? structuredClone(db.state) : null });
  assert.equal(response.status, allowed ? "success" : "permission_denied");
  assert.equal(db.writes.length, allowed ? 2 : 0);
});
test("stale plan and changed parent never write; compare-and-set rejects concurrent change", async () => {
  const db = memory(); db.state.modules[0].title = "Newer user edit";
  const stale = await applyCoursePlan(request, db);
  assert.equal(stale.status, "validation_error");
  assert.equal(stale.summary, "Le parcours a changé depuis cette analyse. Relancez ou ajustez le plan.");
  assert.deepEqual(stale.data?.results.map((item) => item.status), ["stale", "success"]);
  assert.deepEqual(db.writes, [second.id]);
  const moved = memory(); moved.state.modules[0].lessons[0].moduleId = id(7);
  const movedResult = await applyCoursePlan(request, moved);
  assert.deepEqual(movedResult.data?.results.map((item) => item.status), ["success", "stale"]);
  assert.deepEqual(moved.writes, [operation.id]);
  const racing = memory();
  const result = await applyCoursePlan(request, { ...racing, async write(courseId, op) { racing.state.modules[0].title = "Concurrent"; return racing.write(courseId, op); } });
  assert.equal(result.data?.results[0].status, "stale");
  assert.equal(result.data?.results[1].status, "success");
  assert.equal(racing.state.modules[0].title, "Concurrent");
});
test("partial apply remains explicit and prevents replay of completed operations", async () => {
  const db = memory();
  const result = await applyCoursePlan(request, { ...db, write: (courseId, op) => op.id === second.id ? Promise.resolve("failed" as const) : db.write(courseId, op) });
  assert.equal(result.status, "validation_error");
  assert.deepEqual(result.data?.results.map((item) => item.status), ["success", "failed"]);
  assert.equal(db.state.modules[0].title, operation.after);
  assert.equal((await applyCoursePlan(request, db)).status, "validation_error");
  assert.deepEqual(db.writes, [operation.id, second.id]);
});
test("post-apply mismatch and duplicate positions cannot report success", async () => {
  const db = memory();
  const result = await applyCoursePlan({ ...request, selectedIds: [operation.id] }, { ...db, async write() { return "success" as const; } });
  assert.equal(result.data?.results[0].status, "failed");
  db.state.modules.push({ ...db.state.modules[0], id: id(4), lessons: [] });
  assert.equal((await applyCoursePlan(request, db)).status, "validation_error");
  assert.deepEqual(db.writes, []);
});
test("revision keeps operation IDs and marks changed values without persisting", async () => {
  const revised = stabilizeRevision({ ...plan, operations: [{ ...operation, id: "new-ai-id", after: "Autre proposition" }, second] }, plan);
  assert.equal(revised.plan.operations[0].id, operation.id);
  assert.deepEqual(revised.changedIds, [operation.id]);
  const calls: string[] = [];
  const response = await orchestrateCourse({ courseId: id(1), capability: "propose_course_changes", previous: plan, instruction: "Ne touche pas aux objectifs" }, {
    load: async () => context, consume() {}, maxInputChars: 30000, provider: { async generate(capability, prompt) { calls.push(prompt); return capability === "analyze_course" ? analysis : { ...plan, operations: [operation] }; } },
  });
  assert.equal(response.status, "success");
  assert.ok(calls.every((prompt) => prompt.includes("Ne touche pas aux objectifs")));
});
test("review renders labeled selection, before/after, explicit persistence and per-operation status", () => {
  let writes = 0;
  const html = renderToStaticMarkup(createElement(CoursePlanReview, { data: { plan, analysis, changedIds: [operation.id] }, pending: false, consumed: false, report: null, targetLabel: () => "Module · Bases", onUpdate() {}, onSelectAll() {}, onRevise() {}, onApply() { writes++; } }));
  for (const label of ["Tout sélectionner", "Avant", "Après", "Proposition révisée", "Appliquer et enregistrer la sélection", "enregistre immédiatement", "Demander un ajustement"]) assert.ok(html.includes(label));
  assert.match(html, /type="checkbox"/); assert.match(html, /<label for=/);
  assert.equal(writes, 0);
  const done = renderToStaticMarkup(createElement(CoursePlanReview, { data: { plan, analysis, changedIds: [] }, pending: false, consumed: true, report: { verified: true, results: [{ id: operation.id, status: "success" }, { id: second.id, status: "failed" }] }, targetLabel: () => "Leçon", onUpdate() {}, onSelectAll() {}, onRevise() {}, onApply() {} }));
  assert.match(done, /Enregistrée et vérifiée/); assert.match(done, /Échec ou enregistrement non vérifié/); assert.match(done, /disabled/);
});
test("server action and repository retain user auth, RLS and exact write predicates", () => {
  const action = readFileSync("app/app/forge/course-workflow-actions.ts", "utf8");
  const repository = readFileSync("lib/forge/orchestrator/repository.ts", "utf8");
  assert.match(action, /auth.getUser\(\)/); assert.match(repository, /resolveCourseCapabilities/);
  assert.match(repository, /eq\("course_id", courseId\)/); assert.match(repository, /eq\("module_id", operation.target.moduleId/);
  assert.match(repository, /mutation.eq\(field, before\)/); assert.match(repository, /mutation.is\(field, null\)/);
  assert.doesNotMatch(repository, /service_role|from\("profiles"\)|course_discussion_messages/);
});
