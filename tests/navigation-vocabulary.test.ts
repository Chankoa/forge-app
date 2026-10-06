import assert from "node:assert/strict";
import test from "node:test";
import { courseEditPath, courseOverviewPath } from "../lib/courses/context-navigation";
import { courseRelationshipMarker } from "../lib/courses/presentation";
import { forgeErrorMessages, forgeProposalStates } from "../lib/forge/authoring-ux";

test("owner editing has a canonical route while the overview remains distinct", () => {
  assert.equal(courseEditPath("cours"), "/app/courses/cours?mode=edit");
  assert.equal(courseOverviewPath("cours"), "/app/courses/cours");
  assert.notEqual(courseEditPath("cours"), courseOverviewPath("cours"));
});

test("Forge uses one display vocabulary for proposal and persistence states", () => {
  assert.deepEqual(forgeProposalStates, {
    generated: "Proposition générée", review: "À examiner", adjusted: "Ajustée",
    applied: "Appliquée au brouillon local", saved: "Sauvegardée", confirmed: "Création confirmée",
  });
});

test("Forge production error wording does not expose provider implementation terms", () => {
  for (const message of Object.values(forgeErrorMessages)) assert.doesNotMatch(message, /provider|endpoint|configuration/i);
});

test("course identity uses one compact marker for each active relationship", () => {
  assert.equal(courseRelationshipMarker(false, true), "Je crée");
  assert.equal(courseRelationshipMarker(false, false, "editor", "active"), "J’édite");
  assert.equal(courseRelationshipMarker(false, false, "viewer", "active"), "Lecteur");
  assert.equal(courseRelationshipMarker(true, false), "J’apprends");
  assert.equal(courseRelationshipMarker(true, false, "editor", "active"), "J’apprends · J’édite");
});