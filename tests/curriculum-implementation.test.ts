import assert from "node:assert/strict";
import test from "node:test";
import { curriculumImplementationAction, pedagogicalConsequences } from "../lib/forge/intelligence/curriculum-implementation";
import type { CurriculumResult } from "../lib/forge/intelligence/contracts";

type Finding = CurriculumResult["findings"][number];
const finding: Finding = { type: "objective_gap", severity: "attention", moduleIds: [], lessonIds: ["lesson-1"], reason: "L’objectif annoncé reste peu couvert.", suggestion: "Clarifier l’objectif puis compléter la leçon." };

test("a supported finding exposes a specific manual edit action", () => {
  const action = curriculumImplementationAction(finding, new Map([["lesson-1", { slug: "ma-lecon" }]]), "mon-parcours");
  assert.deepEqual(action, { label: "Modifier l’objectif", href: "/app/courses/mon-parcours/lessons/ma-lecon?mode=edit&focus=objectives" });
  assert.notEqual(finding.reason, pedagogicalConsequences[finding.type]);
  assert.notEqual(finding.suggestion, pedagogicalConsequences[finding.type]);
});

test("unsupported structural edits remain recommendations", () => {
  assert.equal(curriculumImplementationAction({ ...finding, type: "consolidation_opportunity" }, new Map([["lesson-1", { slug: "ma-lecon" }]]), "mon-parcours"), null);
  assert.equal(curriculumImplementationAction(finding, new Map(), "mon-parcours"), null);
});
