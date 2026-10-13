import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { lessonDraftFormData, type LessonDraft } from "../lib/courses/lesson-draft";
import { applyLessonProposalToDraft } from "../lib/forge/lesson-proposal-application";
import type { ForgeIntent } from "../lib/forge/contracts";

const savedDraft: LessonDraft = {
  title: "Leçon",
  description: "Résumé",
  content: "Contenu initial.",
  objectives: "Comprendre",
  type: "reading",
  durationMinutes: "10",
  publishingStatus: "draft",
};

function patch(content: string | null, objectives: string[] | null = null, extra: Record<string, unknown> = {}) {
  return { title: null, subtitle: null, description: null, content, objectives, ...extra };
}

test("content-only Forge proposals update only lesson content and mark the draft dirty", () => {
  const intents: ForgeIntent[] = ["generate_content", "structure", "rephrase", "simplify", "improve", "summarize"];
  for (const intent of intents) {
    const result = applyLessonProposalToDraft(savedDraft, intent, patch("Contenu transformé."));
    assert.equal(result.ok, true, intent);
    if (!result.ok) continue;
    assert.equal(result.field, "content", intent);
    assert.equal(result.draft.content, "Contenu transformé.", intent);
    assert.deepEqual({ ...result.draft, content: savedDraft.content }, savedDraft, intent);
    assert.notEqual(JSON.stringify(result.draft), JSON.stringify(savedDraft), intent);
  }
});

test("objectives proposals update objectives only", () => {
  const result = applyLessonProposalToDraft(savedDraft, "objectives", patch(null, ["Analyser les données"]));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.field, "objectives");
  assert.equal(result.draft.objectives, "Analyser les données");
  assert.deepEqual({ ...result.draft, objectives: savedDraft.objectives }, savedDraft);
});

test("sequential Forge transformations build on the latest unsaved draft and save that content", () => {
  const reformulated = applyLessonProposalToDraft(savedDraft, "rephrase", patch("Contenu reformulé."));
  assert.equal(reformulated.ok, true);
  if (!reformulated.ok) return;
  const simplified = applyLessonProposalToDraft(reformulated.draft, "simplify", patch("Contenu simplifié à partir du texte reformulé."));
  assert.equal(simplified.ok, true);
  if (!simplified.ok) return;
  const submitted = lessonDraftFormData(simplified.draft);
  assert.equal(submitted.get("content"), "Contenu simplifié à partir du texte reformulé.");
  assert.equal(simplified.draft.title, savedDraft.title);
  assert.notEqual(JSON.stringify(simplified.draft), JSON.stringify(savedDraft));
});

test("invalid and unsupported Forge patches fail closed", () => {
  assert.deepEqual(applyLessonProposalToDraft(savedDraft, "rephrase", patch("Contenu", null, { title: "Titre interdit" })), {
    ok: false,
    reason: "invalid_patch",
  });
  assert.deepEqual(applyLessonProposalToDraft(savedDraft, "objectives", patch("Contenu", ["Objectif"])), {
    ok: false,
    reason: "invalid_patch",
  });
  assert.deepEqual(applyLessonProposalToDraft(savedDraft, "ask", patch("Contenu")), {
    ok: false,
    reason: "unsupported_patch",
  });
});

test("lesson proposal application is synchronous, local, and reports save to Forge panels", () => {
  const lessonEditor = readFileSync("components/authoring/LessonEditor.tsx", "utf8");
  const context = readFileSync("components/forge/ForgeProposalContext.tsx", "utf8");
  const forgeRail = readFileSync("components/forge/ForgeRail.tsx", "utf8");
  const intelligence = readFileSync("components/forge/ContentIntelligence.tsx", "utf8");
  assert.match(context, /applyLessonProposal\(lessonId: string, proposal: ForgeProposalResult\)/);
  assert.match(lessonEditor, /applyProposal: \(intent, patch\)/);
  assert.doesNotMatch(lessonEditor, /if \(!proposal \|\| proposal\.kind === "targeted"/);
  assert.match(lessonEditor, /new CustomEvent\(forgeLessonSavedEvent/);
  assert.match(forgeRail, /applyLessonProposal\(context\.lessonId, proposal\)/);
  assert.match(intelligence, /applyLessonProposal\(lessonId, proposal\)/);
  assert.match(forgeRail, /setConfirmation\(""\)/);
  assert.match(intelligence, /setConfirmation\(""\)/);
  assert.doesNotMatch(`${lessonEditor}\n${forgeRail}\n${intelligence}`, /set(?:Message|Error)\(error\.message\)/);
});
