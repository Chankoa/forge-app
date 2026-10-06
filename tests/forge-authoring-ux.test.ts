import assert from "node:assert/strict";
import test from "node:test";
import { forgeContextLabels, forgeProposalStates, lessonTransformActions } from "../lib/forge/authoring-ux";

test("lesson Forge separates deterministic transformations from generation", () => {
  assert.deepEqual(lessonTransformActions.map((action) => action.label), ["Structurer", "Reformuler", "Simplifier", "Résumer", "Proposer des objectifs"]);
  assert.equal(lessonTransformActions.some((action) => action.label.includes("Générer")), false);
});

test("Forge context labels show the course, module, and safe associated-source count", () => {
  assert.deepEqual(forgeContextLabels({ mode: "edit", courseSlug: "course", lessonSlug: "lesson", courseTitle: "Cours" }, 0, 2), ["Parcours", "Module", "2 sources associées"]);
  assert.deepEqual(forgeContextLabels({ mode: "edit", courseSlug: "course", courseTitle: "Cours" }, 0, 2), ["Parcours"]);
});

test("generated, applied, and saved states remain distinct", () => {
  assert.notEqual(forgeProposalStates.generated, forgeProposalStates.applied);
  assert.notEqual(forgeProposalStates.applied, forgeProposalStates.saved);
  assert.equal(forgeProposalStates.applied, "Appliquée au brouillon local");
});