import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ForgeProposalDialog } from "../components/forge/ForgeProposalDialog";
import type { ForgeResult } from "../lib/forge/contracts";
import { forgeResultAfterResponse } from "../lib/forge/result-state";

const proposal: ForgeResult = {
  mode: "edit", kind: "proposal", intent: "improve", text: "Proposition précédente utilisable",
  sourcesUsed: [], metadata: { warnings: [], finishReason: "stop" },
  proposal: { target: { courseId: "course-1", lessonId: "lesson-1" }, patch: { title: null, subtitle: null, description: null, content: "Contenu complet", objectives: null }, application: "explicit_only" },
};

function render(busy: boolean, applying: boolean, error: string | null) {
  return renderToStaticMarkup(createElement(ForgeProposalDialog, {
    result: proposal, busy, applying, error,
    onClose() {}, onApply() {}, onReject() {}, onRegenerate() {}, onAdjust() {},
  }));
}

test("Forge proposal exposes an applying state and prevents another submission", () => {
  const html = render(true, true, null);
  assert.match(html, /Application…/);
  assert.match(html, /disabled=""[^>]*>Application…/);
});

test("failed regeneration keeps the previous proposal visible and explains retry", () => {
  const html = render(false, false, "La proposition n’a pas pu être générée complètement. Vous pouvez réessayer.");
  assert.match(html, /role="alert"/);
  assert.match(html, /La proposition précédente reste disponible/);
  assert.match(html, /Proposition précédente utilisable/);
  assert.match(html, /Régénérer/);
});

test("lesson content proposal uses the shared safe renderer for review", () => {
  const html = renderToStaticMarkup(createElement(ForgeProposalDialog, {
    result: { ...proposal, proposal: { ...proposal.proposal, patch: { ...proposal.proposal.patch, content: "## Une section\n\n> [!NOTE]\n> À retenir\n\n<script>unsafe</script>" } } },
    busy: false, applying: false, error: null, onClose() {}, onApply() {}, onReject() {}, onRegenerate() {}, onAdjust() {},
  }));
  assert.match(html, /Aperçu du contenu proposé/);
  assert.match(html, /<h2>Une section<\/h2>/);
  assert.match(html, /class="lesson-callout"/);
  assert.doesNotMatch(html, /<script>/);
});

test("incomplete regeneration preserves the previous result; complete regeneration replaces it", () => {
  const incomplete = { ok: false as const, error: "invalid_result" as const };
  assert.equal(forgeResultAfterResponse(proposal, incomplete), proposal);
  const replacement: ForgeResult = { ...proposal, text: "Proposition régénérée" };
  assert.equal(forgeResultAfterResponse(proposal, { ok: true, result: replacement }), replacement);
});

test("stale proposals remain readable but cannot apply; regeneration requires a saved lesson", () => {
  const renderState = (generationBlocked: boolean) => renderToStaticMarkup(createElement(ForgeProposalDialog, {
    result: proposal, busy: false, applying: false, error: null, stale: true, generationBlocked,
    onClose() {}, onApply() {}, onReject() {}, onRegenerate() {}, onAdjust() {},
  }));
  const dirty = renderState(true);
  assert.match(dirty, /Proposition obsolète/);
  assert.match(dirty, /Proposition précédente utilisable/);
  for (const label of ["Appliquer au brouillon", "Régénérer", "Demander un ajustement"]) {
    assert.match(dirty, new RegExp(`disabled=""[^>]*>${label}`));
  }
  const clean = renderState(false);
  assert.match(clean, /disabled=""[^>]*>Appliquer au brouillon/);
  assert.doesNotMatch(clean, /disabled=""[^>]*>Régénérer/);
  assert.doesNotMatch(clean, /disabled=""[^>]*>Rejeter/);
});
