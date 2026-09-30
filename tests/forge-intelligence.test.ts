import assert from "node:assert/strict";
import test from "node:test";
import { capabilityDefinitions, capabilityModel, resolveCapability } from "../lib/forge/intelligence/capabilities";
import { selectPlausibleCandidates, visiblePublishedCandidates } from "../lib/forge/intelligence/candidates";
import { curriculumContextSchema, curriculumResultSchema, subjectDiscoveryResultSchema, type CurriculumContext, type SubjectCandidate } from "../lib/forge/intelligence/contracts";
import { runIntelligence, type IntelligenceProvider } from "../lib/forge/intelligence/service";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const intent = { intent: "Apprendre le design system pour débutants", audience: "Designers" };
const course: SubjectCandidate = { id: id(1), slug: "design-system", title: "Fondamentaux du design system", description: "Créer des composants cohérents", domain: "Design", level: "Débutant" };
const related: SubjectCandidate = { id: id(2), slug: "composants", title: "Composants de produit", description: "Design system", domain: "Design", level: null };
const discovery = { summary: "Un parcours proche existe.", matches: [{ courseId: id(1), relation: "duplicate_or_very_close" as const, reason: "Le sujet et le public sont proches.", confidenceLevel: "high" as const }] };
const context: CurriculumContext = { course: { id: id(3), title: "Design system", description: "Construire des composants", domain: "Design", objectives: "Maîtriser les composants" }, modules: [{ id: id(4), title: "Bases", position: 0, lessons: [{ id: id(5), title: "Introduction", position: 0, objective: "Comprendre les bases", summary: "Principes" }] }] };
const findings = { summary: "La structure peut être améliorée.", findings: [
  { type: "redundancy" as const, severity: "attention" as const, moduleIds: [id(4)], lessonIds: [id(5)], reason: "Concept répété", suggestion: "Regrouper les explications" },
  { type: "sequence_issue" as const, severity: "info" as const, moduleIds: [id(4)], lessonIds: [], reason: "Ordre à revoir", suggestion: "Examiner la progression" },
  { type: "imbalance" as const, severity: "info" as const, moduleIds: [id(4)], lessonIds: [], reason: "Module dense", suggestion: "Rééquilibrer" },
  { type: "objective_gap" as const, severity: "attention" as const, moduleIds: [], lessonIds: [], reason: "Objectif peu couvert", suggestion: "Vérifier la couverture" },
] };
function deps(output: unknown, finishReason = "stop") { const calls: string[] = []; const provider: IntelligenceProvider = { availability: "configured", async generate(capability, messages) { calls.push(capability, messages.system, messages.prompt); return { output, finishReason }; } }; return { calls, provider, consumeRateLimit() { calls.push("rate"); } }; }

test("capability resolver selects separate prompt, schema and context policies", () => {
  assert.equal(resolveCapability("unknown"), null);
  assert.notEqual(capabilityDefinitions.subject_discovery.schema, capabilityDefinitions.curriculum_analysis.schema);
  assert.notEqual(capabilityDefinitions.subject_discovery.system, capabilityDefinitions.curriculum_analysis.system);
  assert.notEqual(capabilityDefinitions.subject_discovery.contextPolicy, capabilityDefinitions.curriculum_analysis.contextPolicy);
  assert.equal(capabilityModel("subject_discovery", {}, "existing-model"), "existing-model");
  assert.equal(capabilityModel("subject_discovery", { FORGE_SUBJECT_DISCOVERY_MODEL: "specialist" }, "existing-model"), "specialist");
  assert.equal(capabilityModel("curriculum_analysis", { FORGE_SUBJECT_DISCOVERY_MODEL: "specialist" }, "existing-model"), "existing-model");
});

test("public metadata retrieval excludes private and draft rows before ranking", () => {
  const rows = [
    { ...course, status: "published", visibility: "public" },
    { ...related, status: "draft", visibility: "private" },
    { ...related, id: id(6), status: "published", visibility: "private" },
  ];
  assert.deepEqual(selectPlausibleCandidates(intent.intent, visiblePublishedCandidates(rows)).map((item) => item.id), [course.id]);
  assert.deepEqual(selectPlausibleCandidates("Astronomie avancée", [course]), []);
});

test("subject discovery validates a close match and multiple relationships", async () => {
  const d = deps({ summary: "Deux liens", matches: [...discovery.matches, { courseId: id(2), relation: "complementary", reason: "Approche complémentaire", confidenceLevel: "medium" }] });
  const result = await runIntelligence("subject_discovery", intent, [course, related], d);
  assert.ok(result.ok && result.result.matches.length === 2);
  assert.equal(d.calls[0], "rate");
  assert.ok(d.calls[3].includes(course.title));
});

test("no subject candidates and empty matches are valid; create flow stays independent", async () => {
  const d = deps({ summary: "Aucun rapprochement.", matches: [] });
  const result = await runIntelligence("subject_discovery", intent, [], d);
  assert.ok(result.ok && result.result.matches.length === 0);
  assert.equal(subjectDiscoveryResultSchema.safeParse({ summary: "Aucun", matches: [] }).success, true);
});

test("subject discovery rejects malformed, truncated, invented and duplicate results", async () => {
  for (const [output, finish] of [[{ summary: "Aucun", matches: [{ ...discovery.matches[0], courseId: id(9) }] }, "stop"], [{ summary: "Aucun", matches: [discovery.matches[0], discovery.matches[0]] }, "stop"], [{ summary: "Aucun", matches: [{ ...discovery.matches[0], confidenceLevel: 0.95 }] }, "stop"], [discovery, "length"]] as const) {
    const result = await runIntelligence("subject_discovery", intent, [course], deps(output, finish));
    assert.deepEqual(result, { ok: false, error: "invalid_result" });
  }
});

test("curriculum analysis represents findings and preserves real IDs without lesson bodies", async () => {
  const d = deps(findings);
  const result = await runIntelligence("curriculum_analysis", null, context, d);
  assert.ok(result.ok && result.result.findings[0].lessonIds[0] === id(5));
  assert.ok(d.calls[3].includes("Introduction"));
  assert.ok(!d.calls[3].includes("lesson content"));
  assert.equal(curriculumContextSchema.safeParse(context).success, true);
});

test("curriculum healthy structure, malformed result and invented references", async () => {
  assert.ok((await runIntelligence("curriculum_analysis", null, context, deps({ summary: "Structure cohérente.", findings: [] }))).ok);
  assert.deepEqual(await runIntelligence("curriculum_analysis", null, context, deps({ summary: "Erreur", findings: [{ ...findings.findings[0], lessonIds: [id(8)] }] })), { ok: false, error: "invalid_result" });
  assert.equal(curriculumResultSchema.safeParse({ summary: "Erreur", findings: [{ ...findings.findings[0], severity: "critical" }] }).success, false);
  assert.deepEqual(await runIntelligence("curriculum_analysis", null, context, deps(findings, "length")), { ok: false, error: "invalid_result" });
});

test("provider failure is a safe error and prior UI result can remain displayed", async () => {
  const provider: IntelligenceProvider = { availability: "configured", async generate() { throw new Error("sensitive provider detail"); } };
  const prior = findings;
  const response = await runIntelligence("curriculum_analysis", null, context, { provider, consumeRateLimit() {} });
  assert.deepEqual(response, { ok: false, error: "provider_error" });
  assert.equal(prior.findings.length, 4);
});
