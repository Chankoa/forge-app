import assert from "node:assert/strict";
import test from "node:test";
import { lessonContentProviderOutputSchema, lessonObjectivesProviderOutputSchema, validateForgePatch } from "../lib/forge/contracts";

const contentPatch = (content: string | null, extras: Record<string, unknown> = {}) => ({
  title: null, subtitle: null, description: null, content, objectives: null, ...extras,
});

for (const intent of ["structure", "rephrase", "simplify", "generate_content"] as const) {
  test(`${intent} accepts only a complete content replacement`, () => {
    assert.equal(validateForgePatch(intent, "lesson", contentPatch("Contenu apprenant")).success, true);
    assert.equal(validateForgePatch(intent, "lesson", contentPatch("Contenu", { title: "Titre modifié" })).success, false);
    assert.equal(validateForgePatch(intent, "lesson", contentPatch("Contenu", { objectives: ["Nouvel objectif"] })).success, false);
    assert.equal(validateForgePatch(intent, "lesson", contentPatch(null)).success, false);
  });
}

test("objectives proposals cannot mutate lesson content", () => {
  assert.equal(validateForgePatch("objectives", "lesson", { ...contentPatch(null), objectives: ["Comprendre"] }).success, true);
  assert.equal(validateForgePatch("objectives", "lesson", contentPatch("Contenu", { objectives: ["Comprendre"] })).success, false);
});

test("commentary-only content is rejected instead of becoming learner content", () => {
  assert.equal(validateForgePatch("generate_content", "lesson", contentPatch("Je propose de conserver le contenu actuel.")).success, false);
});

test("live action schemas keep rationale separate from the patch", () => {
  assert.equal(lessonContentProviderOutputSchema.safeParse({ summary: "Version structurée", patch: { content: "## Section\n\nTexte" } }).success, true);
  assert.equal(lessonContentProviderOutputSchema.safeParse({ summary: "Version structurée", patch: { content: "Texte", title: "Interdit" } }).success, false);
  assert.equal(lessonObjectivesProviderOutputSchema.safeParse({ summary: "Objectifs", patch: { objectives: ["Expliquer"] } }).success, true);
});
