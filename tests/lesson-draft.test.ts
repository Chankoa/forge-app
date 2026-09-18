import assert from "node:assert/strict";
import test from "node:test";
import { createLessonDraft, lessonDraftFormData } from "../lib/courses/lesson-draft";

const lesson = { id: "lesson", slug: "lesson", title: "Titre A", description: "Résumé A", content: "Contenu A", objectives: ["Objectif A"], durationMinutes: 15, contentType: "reading", publishingStatus: "draft", status: "not-started" as const };

test("lesson draft serializes every persisted field across editor tabs", () => {
  const draft = createLessonDraft(lesson);
  const changed = { ...draft, title: "Titre B", description: "Résumé B", content: "Contenu B", durationMinutes: "30" };
  const data = lessonDraftFormData(changed);
  assert.equal(data.get("title"), "Titre B");
  assert.equal(data.get("description"), "Résumé B");
  assert.equal(data.get("content"), "Contenu B");
  assert.equal(data.get("durationMinutes"), "30");
  assert.equal(data.get("objectives"), "Objectif A");
  assert.equal(data.get("type"), "reading");
  assert.equal(data.get("publishingStatus"), "draft");
});