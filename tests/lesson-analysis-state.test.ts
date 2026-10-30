import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { lessonAnalysisMessages, lessonAnalysisState, lessonResultIsStale } from "../lib/forge/lesson-analysis-state";
import type { LessonDraft } from "../lib/courses/lesson-draft";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LessonEmptyContent } from "../components/authoring/LessonEmptyContent";

const saved: LessonDraft = {
  title: "Leçon", description: "Résumé", content: "Contenu sauvegardé.", objectives: "Comprendre",
  type: "reading", durationMinutes: "10", publishingStatus: "draft",
};

test("analysis is available only for a saved draft, including information and publication fields", () => {
  assert.equal(lessonAnalysisState({ draft: saved, savedDraft: saved, saving: false }).blockedReason, null);
  for (const field of Object.keys(saved) as Array<keyof LessonDraft>) {
    const state = lessonAnalysisState({ draft: { ...saved, [field]: `${saved[field]} modifié` }, savedDraft: saved, saving: false });
    assert.equal(state.dirty, true, field);
    assert.equal(state.blockedReason, lessonAnalysisMessages.unsaved, field);
  }
});

test("saving blocks even a clean draft; a failed save does not acknowledge the local edits", () => {
  assert.equal(lessonAnalysisState({ draft: saved, savedDraft: saved, saving: true }).blockedReason, lessonAnalysisMessages.saving);
  const draft = { ...saved, content: "Modification locale." };
  assert.equal(lessonAnalysisState({ draft, savedDraft: saved, saving: true }).blockedReason, lessonAnalysisMessages.saving);
  assert.equal(lessonAnalysisState({ draft, savedDraft: saved, saving: false }).blockedReason, lessonAnalysisMessages.unsaved);
});

test("save acknowledges the submitted snapshot, never newer edits made during the request", () => {
  const submitted = { ...saved, content: "Première modification." };
  const newer = { ...submitted, content: "Seconde modification." };
  assert.equal(lessonAnalysisState({ draft: newer, savedDraft: submitted, saving: false }).blockedReason, lessonAnalysisMessages.unsaved);
  assert.equal(lessonAnalysisState({ draft: submitted, savedDraft: submitted, saving: false }).blockedReason, null);
});

test("editing during analysis or after a result marks it stale, even after saving", () => {
  const baseline = lessonAnalysisState({ draft: saved, savedDraft: saved, saving: false }).fingerprint;
  for (const field of ["content", "objectives", "title", "description"] as const) {
    const edited = { ...saved, [field]: "Valeur plus récente." };
    assert.equal(lessonResultIsStale(baseline, lessonAnalysisState({ draft: edited, savedDraft: saved, saving: false })), true);
    assert.equal(lessonResultIsStale(baseline, lessonAnalysisState({ draft: edited, savedDraft: edited, saving: false })), true);
  }
  assert.equal(lessonResultIsStale(baseline, null), true);
  assert.equal(lessonResultIsStale(null, null), false);
  assert.equal(lessonResultIsStale(baseline, lessonAnalysisState({ draft: { ...saved }, savedDraft: saved, saving: false })), false);
});

test("all lesson Forge entry points guard live state without invoking save", () => {
  const intelligence = readFileSync("components/forge/ContentIntelligence.tsx", "utf8");
  const rail = readFileSync("components/forge/ForgeRail.tsx", "utf8");
  const context = readFileSync("components/forge/ForgeProposalContext.tsx", "utf8");
  const editor = readFileSync("components/authoring/LessonEditor.tsx", "utf8");
  assert.match(intelligence, /if \(!current \|\| current\.blockedReason\)[\s\S]*?return;[\s\S]*?analyzeLessonContentAction\(request\)/);
  assert.match(rail, /if \(lessonScope && \(!latest \|\| latest\.blockedReason\)\)[\s\S]*?return;[\s\S]*?generateForgeAction/);
  assert.match(rail, /forgeLessonContentEvent, generate/);
  for (const source of [intelligence, rail]) {
    assert.match(source, /generationBlocked=\{Boolean\(blockedReason\)\}/);
    assert.match(source, /lessonResultIsStale\([^,]+, latest\)/);
    assert.doesNotMatch(source, /saveLessonAction|lessonDraftFormData/);
  }
  assert.match(context, /lessonAnalysisState\(bridge\.getAnalysisSnapshot\(\)\)/);
  assert.match(editor, /getAnalysisSnapshot: \(\) => \(\{ draft: draftRef\.current, savedDraft: savedDraftRef\.current, saving: savingRef\.current \}\)/);
  assert.match(editor, /registerLessonDraft, draft, savedDraft, pending/);
  assert.match(editor, /includePublishingStatus: canPublish/);
  assert.match(editor, /generationBlocked=\{dirty \|\| pending\}/);
});

test("empty-lesson generation requires explicit save, without blocking manual writing", () => {
  const html = renderToStaticMarkup(createElement(LessonEmptyContent, { generationBlocked: true, onStartWriting() {} }));
  assert.match(html, /disabled=""[^>]*>Générer avec Forge/);
  assert.match(html, /Sauvegardez la leçon/);
  assert.doesNotMatch(html, /disabled=""[^>]*>Commencer à rédiger/);
});
