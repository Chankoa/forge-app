import assert from "node:assert/strict";
import test from "node:test";
import { capabilityDefinitions } from "../lib/forge/intelligence/capabilities";
import { curriculumGenerationSchema, curriculumResultSchema, type CurriculumContext, type CurriculumReview } from "../lib/forge/intelligence/contracts";
import { runIntelligence, validateCurriculumOutput, type IntelligenceProvider } from "../lib/forge/intelligence/service";
import { curriculumStateAfterResponse, type CurriculumViewState } from "../lib/forge/intelligence/view-state";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
function course(moduleSizes: number[], kind: "balanced" | "redundant" | "sparse" = "balanced"): CurriculumContext {
  return {
    course: { id: id(1), title: "Parcours test", description: "Un parcours réel simulé", domain: "Design", objectives: kind === "sparse" ? null : "Maîtriser la progression" },
    modules: moduleSizes.map((size, moduleIndex) => ({
      id: id(10 + moduleIndex), title: kind === "redundant" ? "Fondements répétés" : `Module ${moduleIndex + 1}`, position: moduleIndex,
      lessons: Array.from({ length: size }, (_, lessonIndex) => ({
        id: id(100 + moduleIndex * 20 + lessonIndex), title: kind === "redundant" ? "Même notion" : `Leçon ${moduleIndex + 1}.${lessonIndex + 1}`,
        position: lessonIndex, objective: kind === "sparse" ? null : "Comprendre", summary: kind === "sparse" ? null : "Résumé court",
      })),
    })),
  };
}
const finding = (context: CurriculumContext, type = "redundancy") => ({
  type, severity: "attention", moduleIds: [context.modules[0].id], lessonIds: [context.modules[0].lessons[0].id],
  reason: "Deux sujets se recoupent.", suggestion: "Examiner un regroupement.",
});
const output = (findings: unknown[]) => ({ summary: "Analyse ciblée de la structure.", findings });
function provider(result: unknown, finishReason = "stop"): IntelligenceProvider {
  return { availability: "configured", async generate() { return { output: result, finishReason }; } };
}
async function run(context: CurriculumContext, result: unknown, events: Array<Record<string, string | number>> = [], finishReason = "stop") {
  return runIntelligence("curriculum_analysis", null, context, {
    provider: provider(result, finishReason), consumeRateLimit() {},
    telemetry(data) { events.push(data); },
  });
}

test("curriculum prompt and result contract bound a focused structured review", () => {
  const prompt = capabilityDefinitions.curriculum_analysis.system;
  for (const phrase of ["au plus quatre constats", "Ne répète pas", "au moins un ID", "sans prose supplémentaire", "aucune modification automatique"]) {
    assert.ok(prompt.includes(phrase), phrase);
  }
  const context = course([2, 2]);
  assert.equal(curriculumGenerationSchema.safeParse(output([{ ...finding(context), type: "unsupported" }])).success, true);
  assert.equal(curriculumResultSchema.safeParse(output(Array.from({ length: 6 }, () => finding(context)))).success, false);
});

test("small, balanced, unbalanced, redundant, sparse and healthy shapes stay supported", async () => {
  const shapes = [course([2, 2]), course([3, 3, 3, 3, 3, 3]), course([10, 1]), course([2, 2], "redundant"), course([1, 2], "sparse")];
  for (const context of shapes) {
    const before = structuredClone(context);
    const response = await run(context, output([finding(context)]));
    assert.equal(response.ok, true);
    assert.deepEqual(context, before, "analysis must not mutate course context");
    if (response.ok) assert.equal(response.result.findings[0].lessonIds[0], context.modules[0].lessons[0].id);
  }
  const healthy = await run(course([2, 2]), { summary: "Aucun problème significatif étayé.", findings: [] });
  assert.ok(healthy.ok && healthy.result.findings.length === 0);
});

test("duplicate references and near-duplicate overlap findings are deterministically removed", () => {
  const context = course([2, 2]);
  const first = finding(context);
  const response = validateCurriculumOutput(output([
    { ...first, moduleIds: [first.moduleIds[0], first.moduleIds[0]], lessonIds: [first.lessonIds[0], first.lessonIds[0]] },
    { ...first, type: "consolidation_opportunity", reason: "Même chevauchement reformulé." },
  ]), context);
  assert.ok(response.result);
  assert.equal(response.result.findings.length, 1);
  assert.deepEqual(response.result.findings[0].moduleIds, [first.moduleIds[0]]);
  assert.deepEqual(response.result.findings[0].lessonIds, [first.lessonIds[0]]);
  assert.equal(response.dedupeCount, 1);
});

test("one malformed or unrelated finding is discarded while a useful finding survives", async () => {
  const context = course([2, 2]);
  const good = finding(context);
  const events: Array<Record<string, string | number>> = [];
  const response = await run(context, output([
    { ...good, type: "unsupported" },
    { ...good, moduleIds: [id(999)] },
    { ...good, moduleIds: [context.modules[1].id] },
    good,
  ]), events);
  assert.ok(response.ok);
  assert.equal(response.result.findings.length, 1);
  assert.equal(response.result.review.omittedFindings, 3);
  assert.equal(events[0].result, "partial");
  assert.equal(events[0].validationFailure, "invalid_reference");
  assert.equal(events[0].rawFindings, 4);
  assert.equal(events[0].validFindings, 1);
});

test("unknown lesson, missing references, malformed envelope and entirely invalid output never succeed", async () => {
  const context = course([2, 2]);
  const good = finding(context);
  for (const raw of [
    output([{ ...good, lessonIds: [id(999)] }]),
    output([{ ...good, moduleIds: [], lessonIds: [] }]),
    output([{ ...good, reason: "" }]),
    { summary: "Texte seul" },
  ]) {
    const response = await run(context, raw);
    assert.deepEqual(response, { ok: false, error: "invalid_result" });
  }
});

test("output limit and provider errors expose safe categories without course content", async () => {
  const context = course([2, 2]);
  const events: Array<Record<string, string | number>> = [];
  assert.deepEqual(await run(context, output([finding(context)]), events, "length"), { ok: false, error: "invalid_result" });
  assert.equal(events[0].validationFailure, "output_limit");
  const broken: IntelligenceProvider = { availability: "configured", async generate() { throw new Error("private course text"); } };
  const response = await runIntelligence("curriculum_analysis", null, context, { provider: broken, consumeRateLimit() {}, telemetry(data) { events.push(data); } });
  assert.deepEqual(response, { ok: false, error: "provider_error" });
  assert.equal(events[1].validationFailure, "provider_error");
  assert.ok(!JSON.stringify(events).includes("private course text"));
});

test("valid result survives incomplete and unavailable regeneration, then is replaced by success", () => {
  const context = course([2, 2]);
  const previous = validateCurriculumOutput(output([finding(context)]), context).result as CurriculumReview;
  const initial: CurriculumViewState = { result: previous, status: "ready" };
  const incomplete = curriculumStateAfterResponse(initial, { ok: false, error: "invalid_result" });
  assert.equal(incomplete.status, "incomplete");
  assert.equal(incomplete.result, previous);
  const unavailable = curriculumStateAfterResponse(incomplete, { ok: false, error: "provider_error" });
  assert.equal(unavailable.status, "unavailable");
  assert.equal(unavailable.result, previous);
  const next = { ...previous, summary: "Nouvelle analyse." };
  const ready = curriculumStateAfterResponse(unavailable, { ok: true, result: next });
  assert.equal(ready.status, "ready");
  assert.equal(ready.result, next);
});
