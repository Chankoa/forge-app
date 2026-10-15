import assert from "node:assert/strict";
import test from "node:test";
import { deriveForgeSuggestions } from "../lib/forge/contextual-suggestions";

test("empty lesson suggestion is tied to the lesson and remains an explicit draft proposal", () => {
  const [suggestion] = deriveForgeSuggestions({
    mode: "edit",
    lessonTitle: "Les fractions",
    hasLessonContent: false,
  });
  assert.equal(suggestion.id, "complete-lesson");
  assert.equal(suggestion.target, "Leçon « Les fractions »");
  assert.equal(suggestion.action, "generate_content");
  assert.equal(suggestion.application, "local_draft");
  assert.match(suggestion.intendedChange, /appliquer explicitement/);
});

test("lesson objective and short-content suggestions report observed evidence", () => {
  const suggestions = deriveForgeSuggestions({
    mode: "edit",
    lessonTitle: "Les fractions",
    hasLessonContent: true,
    hasLessonObjectives: false,
    lessonWordCount: 42,
  });
  assert.deepEqual(suggestions.map(({ id }) => id), ["clarify-objectives", "enrich-short-lesson"]);
  assert.equal(suggestions[1].evidence, "42 mots dans le contenu actuel.");
  assert.equal(suggestions[1].application, "conversation");
});

test("duration advice uses the exact supplied share and is discussion-only", () => {
  const [suggestion] = deriveForgeSuggestions({
    mode: "edit",
    moduleTitle: "Pratique",
    moduleDurationShare: 0.4,
  });
  assert.equal(suggestion.evidence, "Module « Pratique » : 40 % de la durée estimée.");
  assert.equal(suggestion.action, "ask");
  assert.equal(suggestion.application, "conversation");
  assert.match(suggestion.intendedChange, /aucune durée ni structure ne sera modifiée/);
});

test("no grounded advice is generated when the context contains no supporting facts", () => {
  assert.deepEqual(deriveForgeSuggestions({ mode: "learn" }), []);
  assert.deepEqual(deriveForgeSuggestions({ mode: "edit", hasLessonContent: true }), []);
});
