import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { capabilityDefinitions, capabilityModel, resolveCapability } from "../lib/forge/intelligence/capabilities";
import { contentRequestSchema, contentReviewSchema, contentTransformSchema, type ContentTask } from "../lib/forge/intelligence/contracts";
import { runContentIntelligence, type ContentDeps } from "../lib/forge/intelligence/content";
import { completeContentText, contentTaskPolicy } from "../lib/forge/intelligence/content-policy";
import { applyTargetedOperation } from "../lib/forge/intelligence/content-operations";
import { forgeResultAfterResponse } from "../lib/forge/result-state";
import type { ForgeReader } from "../lib/forge/context";

const sourceId = "11111111-1111-4111-8111-111111111111";
const input = { courseSlug: "cours", lessonSlug: "lecon", task: "improve" as ContentTask, sourceIds: [] as string[] };
const transform = { rationale: "La progression est plus claire.", title: null, content: "Contenu amélioré.", addition: null };
function fixture(content = "Contenu initial", level: string | null = "beginner") {
  const calls: string[] = [];
  const reader: ForgeReader = {
    async course() { return { id: "course-id", teacher_id: "owner", title: "Parcours", description: "Résumé", status: "draft", domain: "Design", level }; },
    async enrolled() { return false; },
    async lesson() { return { id: "lesson-id", course_id: "course-id", module_id: "module-id", title: "Leçon", description: "Résumé", content, objectives: ["Comprendre les bases"] }; },
    async modules() { return [{ id: "module-id", title: "Fondamentaux" }]; },
    async lessonTitles() { return []; },
    async sources() { return [{ id: sourceId, course_id: "course-id", title: "Source réelle", type: "text", source_kind: "text", extraction_status: "ready", extracted_content: "Extrait authentique", storage_bucket: null, storage_path: null, file_size: null, mime_type: "text/plain" }]; },
    async downloadText() { return ""; },
  };
  const deps: ContentDeps = { userId: "owner", reader, maxInputChars: 30000, consumeRateLimit() { calls.push("rate"); },
    provider: { availability: "configured", async generate(task, _targeted, messages) { calls.push(task, messages.prompt, messages.system); return { output: transform, finishReason: "stop" }; } } };
  return { deps, calls, reader };
}

test("content capability resolves with separate prompt, schema, context and model override", () => {
  const capability = resolveCapability("content_intelligence");
  assert.equal(capability?.contextPolicy, "owned_lesson_with_selected_sources");
  assert.equal(capability?.schema, capabilityDefinitions.content_intelligence.schema);
  assert.match(capabilityDefinitions.content_intelligence.system, /plus petit changement/);
  assert.equal(capabilityModel("content_intelligence", { FORGE_CONTENT_INTELLIGENCE_MODEL: "special" }, "default"), "special");
  assert.equal(capabilityModel("curriculum_analysis", {}, "default"), "default");
});

test("request enforces a real lesson, supported target level and bounded sources", () => {
  assert.equal(contentRequestSchema.safeParse({ ...input, task: "adapt_level", targetLevel: "beginner" }).success, true);
  assert.equal(contentRequestSchema.safeParse({ ...input, task: "adapt_level" }).success, false);
  assert.equal(contentRequestSchema.safeParse({ ...input, task: "adapt_level", targetLevel: "expert" }).success, false);
  assert.equal(contentRequestSchema.safeParse({ ...input, targetLevel: "beginner" }).success, false);
  assert.equal(contentRequestSchema.safeParse({ ...input, sourceIds: [sourceId, sourceId] }).success, false);
  assert.equal(contentRequestSchema.safeParse({ ...input, extra: "x" }).success, false);
});

test("improve reuses a lesson-only explicit proposal and selected source context", async () => {
  const { deps, calls } = fixture();
  const response = await runContentIntelligence({ ...input, sourceIds: [sourceId] }, deps);
  assert.ok(response.ok && response.kind === "proposal");
  assert.equal(response.result.proposal.patch.content, "Contenu amélioré.");
  assert.deepEqual(response.result.proposal.target, { courseId: "course-id", lessonId: "lesson-id" });
  assert.deepEqual(response.result.sourcesUsed, [{ id: sourceId, title: "Source réelle" }]);
  assert.equal(response.result.proposal.application, "explicit_only");
  assert.match(calls.join(" "), /Comprendre les bases/);
  assert.match(calls.join(" "), /Fondamentaux/);
  assert.match(calls.join(" "), /Design/);
  assert.match(calls.join(" "), /Extrait authentique/);
  assert.ok(!calls.join(" ").includes("entire course body"));
});

for (const task of ["clarify", "adapt_level"] as const) test(`${task} returns a scoped content patch`, async () => {
  const { deps } = fixture();
  const response = await runContentIntelligence({ ...input, task, ...(task === "adapt_level" ? { targetLevel: "advanced" } : {}) }, deps);
  assert.ok(response.ok && response.kind === "proposal");
  assert.equal(response.result.proposal.patch.description, null);
  assert.equal(response.result.proposal.patch.objectives, null);
  assert.equal(response.result.proposal.patch.content, transform.content);
});

test("adapt level is unavailable when product has no supported level", async () => {
  const { deps, calls } = fixture("Contenu", null);
  assert.deepEqual(await runContentIntelligence({ ...input, task: "adapt_level", targetLevel: "beginner" }, deps), { ok: false, error: "invalid_request" });
  assert.equal(calls.length, 0);
});

for (const task of ["add_example", "suggest_activity"] as const) test(`${task} appends only a bounded targeted passage`, async () => {
  const { deps } = fixture("Leçon d'origine");
  deps.provider.generate = async () => ({ output: { rationale: "Ajout utile.", replacement: task === "add_example" ? "Exemple lié à l'objectif." : "Activité liée à l'objectif." }, finishReason: "stop" });
  const response = await runContentIntelligence({ ...input, task }, deps);
  assert.ok(response.ok && response.kind === "targeted");
  const applied = applyTargetedOperation("Leçon d'origine", response.result.operation);
  assert.ok(applied.ok);
  assert.match(applied.content, /^Leçon d'origine\n\n/);
});

test("near-limit addition is invalid, never silently truncated", async () => {
  const { deps } = fixture("x".repeat(19999));
  deps.provider.generate = async () => ({ output: { rationale: "Ajout utile.", replacement: "Exemple de cinquante caractères au moins dans la suite." }, finishReason: "stop" });
  assert.deepEqual(await runContentIntelligence({ ...input, task: "add_example" }, deps), { ok: false, error: "invalid_result" });
});

test("task-specific limits and conservative completion checks reject cutoff endings", async () => {
  assert.deepEqual(Object.fromEntries(Object.entries(contentTaskPolicy).map(([task, policy]) => [task, policy.maxChars])), {
    improve: 3800, clarify: 3800, adapt_level: 3800, add_example: 2000, suggest_activity: 2500, coherence_review: 1800,
  });
  assert.equal(completeContentText("Texte coupé au milieu", "suggest_activity"), false);
  assert.equal(completeContentText("x".repeat(2499) + ".", "suggest_activity"), false);
  assert.equal(completeContentText("Une activité courte et terminée.", "suggest_activity"), true);
  for (const unfinished of ["Une phrase,", "Une phrase :", "Une phrase et", "Une activité\n-", "Une activité\n2)", "Une activité\n- Étape :", "Une activité\n```code"]) {
    assert.equal(completeContentText(unfinished, "suggest_activity"), false, unfinished);
  }
  const { deps } = fixture();
  deps.provider.generate = async () => ({ output: { rationale: "Ajout utile.", title: null, content: null, addition: "x".repeat(2500) }, finishReason: "stop" });
  assert.deepEqual(await runContentIntelligence({ ...input, task: "suggest_activity" }, deps), { ok: false, error: "invalid_result" });
});

for (const task of ["improve", "clarify", "adapt_level"] as const) test(`${task} accepts complete content near 3800 and rejects overlong content`, async () => {
  const { deps } = fixture("Texte initial.");
  const request = { ...input, task, ...(task === "adapt_level" ? { targetLevel: "advanced" } : {}) };
  for (const length of [3799, 3800]) {
    deps.provider.generate = async () => ({ output: { ...transform, content: "x".repeat(length - 1) + "." }, finishReason: "stop" });
    const response = await runContentIntelligence(request, deps);
    assert.ok(response.ok && response.kind === "proposal", `${task} ${length}`);
  }
  deps.provider.generate = async () => ({ output: { ...transform, content: "x".repeat(3800) + "." }, finishReason: "stop" });
  assert.deepEqual(await runContentIntelligence(request, deps), { ok: false, error: "invalid_result" });
});

for (const [task, cap] of [["add_example", 2000], ["suggest_activity", 2500]] as const) test(`${task} enforces its own addition cap and the final lesson cap`, async () => {
  const { deps } = fixture("Leçon.");
  deps.provider.generate = async () => ({ output: { rationale: "Ajout utile.", replacement: "x".repeat(cap - 2) + "." }, finishReason: "stop" });
  const valid = await runContentIntelligence({ ...input, task }, deps);
  assert.ok(valid.ok && valid.kind === "targeted");
  deps.provider.generate = async () => ({ output: { rationale: "Ajout utile.", replacement: "x".repeat(cap) + "." }, finishReason: "stop" });
  assert.deepEqual(await runContentIntelligence({ ...input, task }, deps), { ok: false, error: "invalid_result" });
});

test("long lessons require a selection for transformations and preserve selected source attribution", async () => {
  const content = `${"x".repeat(3801)} Passage à clarifier.`;
  const { deps } = fixture(content);
  assert.deepEqual(await runContentIntelligence({ ...input, task: "clarify" }, deps), { ok: false, error: "target_required" });
  const targetText = "Passage à clarifier.";
  const targetStart = content.indexOf(targetText);
  deps.provider.generate = async () => ({ output: { rationale: "Passage clarifié.", replacement: "Passage rendu plus clair." }, finishReason: "stop" });
  const response = await runContentIntelligence({ ...input, task: "clarify", targetText, targetStart, targetEnd: targetStart + targetText.length, sourceIds: [sourceId] }, deps);
  assert.ok(response.ok && response.kind === "targeted");
  assert.deepEqual(response.result.sourcesUsed, [{ id: sourceId, title: "Source réelle" }]);
});

test("selected examples insert immediately after the exact selection", async () => {
  const content = `${"x".repeat(3801)} Passage source.`;
  const { deps } = fixture(content);
  const targetText = "Passage source.";
  const targetStart = content.indexOf(targetText);
  deps.provider.generate = async () => ({ output: { rationale: "Exemple ajouté.", replacement: "Exemple ciblé." }, finishReason: "stop" });
  const response = await runContentIntelligence({ ...input, task: "add_example", targetText, targetStart, targetEnd: targetStart + targetText.length }, deps);
  assert.ok(response.ok && response.kind === "targeted");
  assert.equal(response.result.operation.operation, "insert_after");
  const applied = applyTargetedOperation(content, response.result.operation);
  assert.ok(applied.ok && applied.content.endsWith("Passage source.\n\nExemple ciblé."));
});

test("targeted operations apply exact selected ranges and reject stale or oversized results", () => {
  const content = "Même passage. Même passage.";
  const secondStart = content.lastIndexOf("Même passage.");
  const operation = { operation: "replace_section" as const, targetText: "Même passage.", targetStart: secondStart, targetEnd: secondStart + "Même passage.".length, replacement: "Passage remplacé.", rationale: "Remplacement ciblé." };
  assert.deepEqual(applyTargetedOperation(content, operation), { ok: true, content: "Même passage. Passage remplacé." });
  assert.deepEqual(applyTargetedOperation("Texte modifié", operation), { ok: false, reason: "stale" });
  assert.deepEqual(applyTargetedOperation("x".repeat(19999), { operation: "append", targetText: null, replacement: "Ajout.", rationale: "Ajout ciblé." }), { ok: false, reason: "too_long" });
});

test("coherence review rejects total text above 1800 without trimming findings", async () => {
  const { deps } = fixture();
  const finding = { type: "objective_not_covered", importance: "attention", reason: "R".repeat(300), suggestion: "S".repeat(300) };
  deps.provider.generate = async () => ({ output: { summary: "Résumé.", findings: [finding, { ...finding, type: "weak_progression" }, { ...finding, type: "missing_example" }, { ...finding, type: "level_mismatch" }] }, finishReason: "stop" });
  assert.deepEqual(await runContentIntelligence({ ...input, task: "coherence_review" }, deps), { ok: false, error: "invalid_result" });
});

test("oversized and malformed transformations are invalid", async () => {
  const { deps } = fixture();
  deps.provider.generate = async () => ({ output: { ...transform, content: "x".repeat(3801) }, finishReason: "stop" });
  assert.deepEqual(await runContentIntelligence(input, deps), { ok: false, error: "invalid_result" });
  deps.provider.generate = async () => ({ output: { ...transform, unsupported: "x" }, finishReason: "stop" });
  assert.deepEqual(await runContentIntelligence(input, deps), { ok: false, error: "invalid_result" });
  assert.equal(contentTransformSchema.safeParse({ ...transform, unsupported: "x" }).success, false);
  deps.provider.generate = async () => ({ output: { ...transform, rationale: "Cette activité reste alignée mais sans" }, finishReason: "stop" });
  assert.deepEqual(await runContentIntelligence(input, deps), { ok: false, error: "invalid_result" });
});

test("coherence review supports findings, dedupe and healthy empty state", async () => {
  const { deps } = fixture();
  const finding = { type: "objective_not_covered", importance: "attention", reason: "Objectif absent", suggestion: "Recentrer la leçon" };
  deps.provider.generate = async () => ({ output: { summary: "Écart ciblé", findings: [finding, finding] }, finishReason: "stop" });
  const response = await runContentIntelligence({ ...input, task: "coherence_review" }, deps);
  assert.ok(response.ok && response.kind === "review");
  assert.equal(response.result.findings.length, 1);
  deps.provider.generate = async () => ({ output: { summary: "Leçon cohérente", findings: [] }, finishReason: "stop" });
  const healthy = await runContentIntelligence({ ...input, task: "coherence_review" }, deps);
  assert.ok(healthy.ok && healthy.kind === "review" && healthy.result.findings.length === 0);
  assert.equal(contentReviewSchema.safeParse({ summary: "x", findings: Array(5).fill(finding) }).success, false);
});

test("invalid review, incomplete generation and provider errors never become success", async () => {
  const { deps } = fixture();
  deps.provider.generate = async () => ({ output: { summary: "x", findings: [{ bogus: true }] }, finishReason: "stop" });
  assert.deepEqual(await runContentIntelligence({ ...input, task: "coherence_review" }, deps), { ok: false, error: "invalid_result" });
  deps.provider.generate = async () => ({ output: transform, finishReason: "length" });
  assert.deepEqual(await runContentIntelligence(input, deps), { ok: false, error: "invalid_result" });
  deps.provider.generate = async () => { throw Object.assign(new Error("internal secret"), { code: "provider_error" }); };
  assert.deepEqual(await runContentIntelligence(input, deps), { ok: false, error: "provider_error" });
});

test("failed regeneration preserves previous proposal through shared state rule", async () => {
  const { deps } = fixture();
  const previous = await runContentIntelligence(input, deps);
  assert.ok(previous.ok && previous.kind === "proposal");
  deps.provider.generate = async () => ({ output: transform, finishReason: "length" });
  const failed = await runContentIntelligence(input, deps);
  if (!failed.ok && failed.error !== "target_required") {
    const retained = forgeResultAfterResponse(previous.result, { ok: false, error: failed.error as Extract<typeof failed.error, "invalid_result" | "unauthenticated" | "forbidden" | "context_unavailable" | "not_configured" | "provider_auth" | "provider_not_found" | "provider_network" | "provider_error" | "timeout" | "rate_limited" | "invalid_request"> });
    assert.equal(retained, previous.result);
  } else assert.fail("expected an ordinary failed generation");
});

test("content intelligence remains read-only and cannot save or mutate course data", () => {
  for (const file of ["content.ts", "provider.ts", "capabilities.ts"]) {
    const code = readFileSync(new URL(`../lib/forge/intelligence/${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(code, /\.(insert|update|upsert|delete|remove)\(/);
    assert.doesNotMatch(code, /saveLessonAction|service_role/);
  }
});
