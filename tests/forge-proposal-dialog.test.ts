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

test("incomplete regeneration preserves the previous result; complete regeneration replaces it", () => {
  const incomplete = { ok: false as const, error: "invalid_result" as const };
  assert.equal(forgeResultAfterResponse(proposal, incomplete), proposal);
  const replacement: ForgeResult = { ...proposal, text: "Proposition régénérée" };
  assert.equal(forgeResultAfterResponse(proposal, { ok: true, result: replacement }), replacement);
});
